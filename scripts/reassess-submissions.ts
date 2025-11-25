
import { PrismaClient } from '@prisma/client';
import { QualityAssessor } from '../lib/crawler/quality-assessor';
import { ContentExtractor } from '../lib/crawler/content-extractor';

const db = new PrismaClient();
const assessor = new QualityAssessor();
const extractor = new ContentExtractor();

async function reassessSubmissions() {
    console.log('Starting reassessment of rejected and pending user submissions...');

    // 1. Find all rejected OR pending user submissions
    // Match the validation page query: 'user_bookmark', 'manual_submit', 'manual'
    const sitesToReassess = await db.indexedSite.findMany({
        where: {
            discoveryMethod: {
                in: ['user_bookmark', 'manual_submit', 'manual'] // Match validation page query
            },
            OR: [
                { indexingPurpose: 'rejected' },
                { communityValidated: false }
            ]
        }
    });

    console.log(`Found ${sitesToReassess.length} user submissions to reassess (rejected or pending).`);

    let rescuedCount = 0;
    let failedCount = 0;
    let stillRejectedCount = 0;

    for (const site of sitesToReassess) {
        console.log(`\nReassessing: ${site.url}`);

        try {
            // 2. Fetch content
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(site.url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'ThreadStead-QualityCheck/1.0'
                }
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.log(`- Failed to fetch: ${response.status} ${response.statusText}`);
                failedCount++;
                continue;
            }

            const html = await response.text();

            // 3. Extract content
            const content = await extractor.extractFromHtml(html, site.url);

            // 4. Assess quality (WITH user submission flag = true)
            const assessment = assessor.assessQuality(content, site.url, true);

            console.log(`- New Score: ${assessment.totalScore} (Threshold: 45)`);
            console.log(`- Breakdown: IndieWeb=${assessment.breakdown.indieWeb}, Personal=${assessment.breakdown.personalSite}, Content=${assessment.breakdown.contentQuality}, Tech=${assessment.breakdown.techStack}, UserBonus=${assessment.breakdown.userSubmitted}`);

            if (assessment.shouldAutoSubmit) {
                // 5. Rescue/Validate the site!
                console.log(`- PASSED! Updating database...`);

                await db.indexedSite.update({
                    where: { id: site.id },
                    data: {
                        indexingPurpose: 'full_index', // Map to valid string
                        communityValidated: true,      // It passed the check!
                        communityScore: assessment.totalScore,
                        siteType: assessment.category,
                        crawlStatus: 'success',
                        lastCrawled: new Date(),
                        // Update metadata
                        title: content.title || site.title,
                        description: content.description || site.description,
                        detectedLanguage: content.language,
                        extractedKeywords: content.keywords
                    }
                });
                rescuedCount++;
            } else {
                console.log(`- Still rejected/pending. Reasons: ${assessment.reasons.join(', ')}`);
                stillRejectedCount++;
            }

        } catch (error) {
            console.log(`- Error processing site: ${error instanceof Error ? error.message : String(error)}`);
            failedCount++;
        }
    }

    console.log('\n-----------------------------------');
    console.log('Reassessment Complete');
    console.log(`Total Processed: ${sitesToReassess.length}`);
    console.log(`Rescued/Validated: ${rescuedCount}`);
    console.log(`Still Rejected/Pending: ${stillRejectedCount}`);
    console.log(`Errors/Unreachable: ${failedCount}`);
}

reassessSubmissions()
    .catch(e => console.error(e))
    .finally(async () => await db.$disconnect());
