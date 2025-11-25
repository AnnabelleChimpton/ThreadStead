
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function migrateVotes() {
    console.log('Starting vote migration...');

    // 1. Get all votes
    const allVotes = await db.siteVote.findMany();
    console.log(`Found ${allVotes.length} total votes.`);

    // 2. Group by user and site
    const userSiteVotes = new Map<string, typeof allVotes>();

    for (const vote of allVotes) {
        const key = `${vote.userId}-${vote.siteId}`;
        if (!userSiteVotes.has(key)) {
            userSiteVotes.set(key, []);
        }
        userSiteVotes.get(key)!.push(vote);
    }

    console.log(`Found ${userSiteVotes.size} unique user-site pairs.`);

    let keptCount = 0;
    let convertedCount = 0;
    let deletedCount = 0;

    // 3. Process each pair
    for (const [key, votes] of userSiteVotes) {
        const [userId, siteId] = key.split('-');

        // Check for existing 'like' vote
        const likeVote = votes.find(v => v.voteType === 'like');

        // Check for positive legacy votes
        const positiveTypes = ['upvote', 'quality', 'interesting', 'helpful', 'creative', 'approve'];
        const hasPositive = votes.some(v => positiveTypes.includes(v.voteType));

        if (likeVote) {
            // Already has like, keep it, delete others
            keptCount++;
            const others = votes.filter(v => v.id !== likeVote.id);
            if (others.length > 0) {
                await db.siteVote.deleteMany({
                    where: { id: { in: others.map(v => v.id) } }
                });
                deletedCount += others.length;
            }
        } else if (hasPositive) {
            // No like, but has positive votes. Convert one to like, delete others.
            // We'll use the first positive vote as the base for the new 'like' vote to preserve timestamp if possible,
            // but simpler to just delete all and create a new one or update one.
            // Let's update the first positive one to 'like' and delete the rest.

            const winner = votes.find(v => positiveTypes.includes(v.voteType))!;
            const others = votes.filter(v => v.id !== winner.id);

            await db.siteVote.update({
                where: { id: winner.id },
                data: { voteType: 'like' }
            });
            convertedCount++;

            if (others.length > 0) {
                await db.siteVote.deleteMany({
                    where: { id: { in: others.map(v => v.id) } }
                });
                deletedCount += others.length;
            }
        } else {
            // Only negative votes (broken, spam, etc.) or unknown. Delete all.
            await db.siteVote.deleteMany({
                where: { id: { in: votes.map(v => v.id) } }
            });
            deletedCount += votes.length;
        }
    }

    console.log(`Migration summary:`);
    console.log(`- Kept 'like' votes: ${keptCount}`);
    console.log(`- Converted to 'like': ${convertedCount}`);
    console.log(`- Deleted votes: ${deletedCount}`);

    // 4. Recalculate totalVotes for all sites
    console.log('Recalculating site vote counts...');

    const sites = await db.indexedSite.findMany({ select: { id: true } });

    for (const site of sites) {
        const count = await db.siteVote.count({
            where: {
                siteId: site.id,
                voteType: 'like'
            }
        });

        await db.indexedSite.update({
            where: { id: site.id },
            data: { totalVotes: count }
        });
    }

    console.log('Vote counts updated.');
    console.log('Migration complete.');
}

migrateVotes()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
