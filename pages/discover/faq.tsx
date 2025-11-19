/**
 * Search Engine FAQ Page
 * Explains our community-driven search philosophy and technical approach
 */

import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import Link from 'next/link';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface FAQProps {
  siteConfig: SiteConfig;
}

export default function SearchFAQ({ siteConfig }: FAQProps) {
  return (
    <Layout siteConfig={siteConfig}>
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/discover" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Discover
          </Link>

          <h1 className="text-3xl font-bold text-[#2E4B3F] mb-4 flex items-center gap-2">
            <PixelIcon name="search" size={32} /> Building Our Inclusive Search Engine: FAQ
          </h1>

          <p className="text-lg text-gray-700">
            We&apos;re creating a community-driven search engine that celebrates indie content while
            inclusively discovering it wherever creators share their work. Here&apos;s how we&apos;re doing it and why it matters.
          </p>
        </div>

        <div className="space-y-8">
          {/* Why Build Our Own */}
          <section className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6">
            <h2 className="text-xl font-bold text-[#2E4B3F] mb-4 flex items-center gap-2">
              <PixelIcon name="bookmark" size={24} /> Why Are We Building Our Own Search Index?
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="mb-4">
                <strong>The web is becoming increasingly centralized.</strong> Major search engines decide what gets seen,
                indie sites get buried, and algorithmic bias favors commercial content over personal expression.
              </p>
              <p className="mb-4">
                We believe in a different approach:
              </p>
              <ul className="space-y-2 mb-4">
                <li>
                  <strong>Community Curation:</strong> Real humans discovering and validating sites, not just algorithms
                </li>
                <li>
                  <strong>Indie Web First:</strong> Prioritizing personal sites, blogs, and creative projects over corporate content
                </li>
                <li>
                  <strong>Transparent Ranking:</strong> You can see exactly why results appear where they do
                </li>
                <li>
                  <strong>No Surveillance:</strong> We don&apos;t track your searches or build advertising profiles
                </li>
                <li>
                  <strong>Decentralized Discovery:</strong> Every site that links to another helps build the network
                </li>
              </ul>
              <p className="text-green-700 font-medium">
                Together, we&apos;re building the search engine we wish existed—one that celebrates the weird,
                wonderful, and human side of the web.
              </p>
            </div>
          </section>

          {/* How We Build the Index */}
          <section className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6">
            <h2 className="text-xl font-bold text-[#2E4B3F] mb-4 flex items-center gap-2">
              <PixelIcon name="sliders" size={24} /> How We Build Our Index
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2 text-purple-700 flex items-center gap-2">
                  1. Community Submissions <PixelIcon name="mail" size={20} />
                </h3>
                <p className="text-gray-700 mb-2">
                  Anyone can submit sites they love. Each submission goes through community validation
                  where members vote on quality, relevance, and alignment with indie web values.
                </p>
                <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
                  <strong>How to participate:</strong> Click &quot;Submit a site&quot; on any search page,
                  or visit <Link href="/community-index/submit" className="text-purple-600 hover:underline">Submit Page</Link>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 text-blue-700 flex items-center gap-2">
                  2. Auto-Discovery Tracking <PixelIcon name="link" size={20} />
                </h3>
                <p className="text-gray-700 mb-2">
                  When you click on external search results, we automatically submit them for community review.
                  This creates a feedback loop where searching helps improve future searches!
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                  <strong>Privacy note:</strong> We only track the sites clicked, never your personal data or search history.
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 text-green-700 flex items-center gap-2">
                  3. Automated Web Crawler <PixelIcon name="debug" size={20} />
                </h3>
                <p className="text-gray-700 mb-2">
                  Our ethical web crawler automatically discovers and indexes indie sites while respecting
                  website owners&apos; preferences. Here&apos;s how it works:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-3 ml-2">
                  <li><strong>Respects robots.txt:</strong> We always honor robots.txt files and crawl directives</li>
                  <li><strong>Polite crawling:</strong> Rate-limited to avoid overwhelming servers (max 5 concurrent, 15-second timeouts)</li>
                  <li><strong>Link discovery:</strong> Follows links from validated sites to find new indie web content</li>
                  <li><strong>Quality filtering:</strong> Uses inclusive scoring (40+ points) that celebrates simple HTML sites</li>
                  <li><strong>Auto-validation:</strong> High-quality sites (75+ points) are automatically approved</li>
                  <li><strong>Transparent process:</strong> Sites scoring 40-74 go to community review queue</li>
                </ul>
                <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                  <p className="mb-2">
                    <strong className="flex items-center gap-1 inline-flex"><PixelIcon name="search" size={14} /> Currently Active:</strong> Our crawler runs every 15-30 minutes, processing ~40 sites per run.
                    It has discovered 1,500+ potential indie sites and growing!
                  </p>
                  <p className="text-sm mb-2">
                    <strong>Auto-validation results:</strong> Sites scoring 75+ points are immediately added to the main index
                    and appear in search results. Sites scoring 40-74 points go to the community review queue.
                  </p>
                  <p className="text-xs text-green-800">
                    <strong>User-Agent:</strong> ThreadsteadBot/1.0 (+https://threadstead.com/crawler)<br/>
                    <strong>Crawl frequency:</strong> Each site maximum once per 48 hours<br/>
                    <strong>To opt-out:</strong> Add &quot;User-agent: ThreadsteadBot&quot; to your robots.txt with Disallow rules
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 text-indigo-700 flex items-center gap-2">
                  4. Corporate Profile Discovery <PixelIcon name="link" size={20} />
                </h3>
                <p className="text-gray-700 mb-2">
                  We use corporate social profiles as <strong>discovery sources</strong> to find indie websites,
                  without cluttering our search results with corporate content:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-3 ml-2">
                  <li><strong>Link extraction:</strong> We scan bios and descriptions on platforms like YouTube, Twitter, GitHub, and Mastodon</li>
                  <li><strong>Indie site discovery:</strong> Extract personal website links that creators share in their profiles</li>
                  <li><strong>Clean search results:</strong> Corporate profiles never appear in search—only the indie sites they lead us to</li>
                  <li><strong>Platform bonuses:</strong> Sites hosted on indie-friendly platforms (Neocities, Tilde, GitHub Pages) get score boosts</li>
                  <li><strong>Discovery tracking:</strong> We maintain a record of how indie sites were discovered for transparency</li>
                </ul>
                <div className="bg-indigo-50 border border-indigo-200 rounded p-3 text-sm">
                  <p className="mb-2">
                    <strong className="flex items-center gap-1 inline-flex"><PixelIcon name="bookmark" size={14} /> Platform Bonuses:</strong> We celebrate community-driven platforms!
                  </p>
                  <ul className="text-xs space-y-1 ml-4">
                    <li>• <strong>Neocities sites:</strong> +15% score bonus (the heart of indie web!)</li>
                    <li>• <strong>Tilde communities:</strong> +10% bonus (celebrating pubnix culture)</li>
                    <li>• <strong>Bear Blog, omg.lol:</strong> +10% bonus (indie blogging platforms)</li>
                    <li>• <strong>GitHub Pages:</strong> +5% bonus (great for projects and portfolios)</li>
                    <li>• <strong>Independent domains:</strong> +20% bonus (the gold standard!)</li>
                  </ul>
                  <p className="text-xs text-indigo-800 mt-2">
                    <strong>Example:</strong> A creator&apos;s YouTube channel won&apos;t appear in search, but their personal
                    Neocities site linked in the bio will be discovered, indexed, and get bonus points for being on Neocities!
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 text-orange-700 flex items-center gap-2">
                  5. Community Validation <PixelIcon name="check" size={20} />
                </h3>
                <p className="text-gray-700 mb-2">
                  Every site goes through community review where members can:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-2">
                  <li>Vote on site quality and relevance</li>
                  <li>Add tags and categories</li>
                  <li>Flag inappropriate content</li>
                  <li>Suggest related sites</li>
                </ul>
                <div className="bg-orange-50 border border-orange-200 rounded p-3 text-sm">
                  <strong>Join the review team:</strong> Visit <Link href="/community-index/validate" className="text-orange-600 hover:underline">Validation Center</Link>
                </div>
              </div>
            </div>
          </section>

          {/* How We Rank Results */}
          <section className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6">
            <h2 className="text-xl font-bold text-[#2E4B3F] mb-4 flex items-center gap-2">
              <PixelIcon name="chart" size={24} /> How We Rank Search Results
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="mb-4">
                Our ranking algorithm is <strong>completely transparent</strong>. No black boxes, no secret sauce—just
                clear, understandable scoring that puts community consensus first.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="font-mono text-sm font-bold mb-3">Unified Scoring Algorithm:</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><PixelIcon name="bookmark" size={14} /> Indie Index Sites:</span>
                    <span className="font-bold">Base Score: 50</span>
                  </div>
                  <div className="ml-4 text-gray-600">
                    + Community votes (×2)<br/>
                    + Validation bonus (+20)<br/>
                    + Text relevance (×0.5)
                  </div>

                  <div className="flex justify-between mt-3">
                    <span className="flex items-center gap-1"><PixelIcon name="home" size={14} /> Local ThreadStead Content:</span>
                    <span className="font-bold">Base Score: 40</span>
                  </div>
                  <div className="ml-4 text-gray-600">
                    + ThreadRings (+15)<br/>
                    + Users (+10)<br/>
                    + Posts (+5)
                  </div>

                  <div className="flex justify-between mt-3">
                    <span className="flex items-center gap-1"><PixelIcon name="map" size={14} /> External Web Results:</span>
                    <span className="font-bold">Base Score: 30</span>
                  </div>
                  <div className="ml-4 text-gray-600">
                    + Indie web signals (+15)<br/>
                    + Privacy features (+10)<br/>
                    + Small web engines (+8)<br/>
                    - Position penalty (-1 per rank)
                  </div>
                </div>
              </div>

              <p className="mb-4">
                This scoring system ensures:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>Community-validated sites appear first</li>
                <li>Local community content gets priority</li>
                <li>Indie and privacy-focused sites rank higher</li>
                <li>Commercial spam naturally sinks to the bottom</li>
              </ul>

              <p className="text-green-700 font-medium">
                Every search result shows its score, so you know exactly why it ranks where it does.
              </p>
            </div>
          </section>

          {/* Corporate Profile Handling */}
          <section className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg shadow-[2px_2px_0_#6366F1] p-6">
            <h2 className="text-xl font-bold text-[#2E4B3F] mb-4 flex items-center gap-2">
              <PixelIcon name="link" size={24} /> How We Handle Corporate Profiles (Inclusively!)
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="mb-4">
                <strong>We believe creators shouldn&apos;t be penalized for having a presence on corporate platforms.</strong>
                Instead, we use these platforms as stepping stones to discover amazing indie content:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white border border-indigo-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-indigo-700 flex items-center gap-2">
                    <PixelIcon name="gps" size={20} /> What We Do
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1"><PixelIcon name="check" size={14} /></span>
                      <span>Scan social media bios for personal website links</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1"><PixelIcon name="check" size={14} /></span>
                      <span>Extract portfolio links from GitHub, YouTube, etc.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1"><PixelIcon name="check" size={14} /></span>
                      <span>Follow &quot;link in bio&quot; references to indie sites</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1"><PixelIcon name="check" size={14} /></span>
                      <span>Give bonus points to sites on indie platforms</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1"><PixelIcon name="check" size={14} /></span>
                      <span>Track discovery paths for transparency</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-red-700 flex items-center gap-2">
                    <PixelIcon name="close" size={20} /> What We Don&apos;t Do
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1"><PixelIcon name="close" size={14} /></span>
                      <span>Include corporate profiles in search results</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1"><PixelIcon name="close" size={14} /></span>
                      <span>Penalize creators for using social media</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1"><PixelIcon name="close" size={14} /></span>
                      <span>Index social media posts or content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1"><PixelIcon name="close" size={14} /></span>
                      <span>Favor or discriminate based on follower count</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1"><PixelIcon name="close" size={14} /></span>
                      <span>Store or track personal social media data</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-300 rounded-lg p-4 mb-4">
                <h3 className="font-semibold mb-2 text-purple-800">Real Example: How Discovery Works</h3>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>
                    <strong>1.</strong> Our crawler finds a YouTube channel about web development
                  </p>
                  <p>
                    <strong>2.</strong> Instead of indexing the channel, we extract the personal website link from their bio
                  </p>
                  <p>
                    <strong>3.</strong> We discover their personal site is hosted on Neocities
                  </p>
                  <p>
                    <strong>4.</strong> The site gets a +15% score bonus for being on Neocities (indie platform!)
                  </p>
                  <p>
                    <strong>5.</strong> Their personal site appears in search results, not their YouTube channel
                  </p>
                  <p className="text-purple-700 font-medium flex items-center gap-1">
                    <strong>Result:</strong> Clean search results that lead to genuine indie content! <PixelIcon name="gift" size={16} />
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                  <PixelIcon name="bookmark" size={14} /> Why This Approach Works:
                </p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Creators benefit from having their indie sites discovered</li>
                  <li>• Search results stay focused on independent content</li>
                  <li>• We don&apos;t force creators to abandon existing audiences</li>
                  <li>• Indie platforms get the recognition they deserve</li>
                  <li>• Corporate noise is filtered out automatically</li>
                </ul>
              </div>
            </div>
          </section>

          {/* External Search Integration */}
          <section className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6">
            <h2 className="text-xl font-bold text-[#2E4B3F] mb-4 flex items-center gap-2">
              <PixelIcon name="map" size={24} /> How We Work With External Search APIs
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="mb-4">
                While we build our index, we also aggregate results from privacy-respecting search engines:
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white border border-gray-200 rounded p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><PixelIcon name="shield" size={20} /> Brave Search</h3>
                  <p className="text-sm text-gray-700">
                    Privacy-focused results without tracking. We use their free tier to supplement
                    our indie index with broader web coverage.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><PixelIcon name="drop" size={20} /> SearchMySite</h3>
                  <p className="text-sm text-gray-700">
                    Dedicated indie web search engine. Perfect alignment with our values—they
                    index only personal and independent sites.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm">
                  <strong>Auto-indexing:</strong> When you click external results, they&apos;re automatically
                  submitted to our indie index for review. Over time, the best sites migrate from
                  external results into our curated index!
                </p>
              </div>
            </div>
          </section>

          {/* Get Involved */}
          <section className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg shadow-[2px_2px_0_#8B5CF6] p-6">
            <h2 className="text-xl font-bold text-[#2E4B3F] mb-4 flex items-center gap-2">
              <PixelIcon name="zap" size={24} /> How You Can Help Build This
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><PixelIcon name="search" size={20} /> Search & Discover</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Every search helps! Click interesting results to auto-index them for review.
                </p>
                <Link href="/discover" className="text-blue-600 hover:underline text-sm">
                  Start Searching →
                </Link>
              </div>

              <div className="bg-white rounded p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><PixelIcon name="mail" size={20} /> Submit Sites</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Know an amazing indie site? Submit it to our indie index!
                </p>
                <Link href="/community-index/submit" className="text-blue-600 hover:underline text-sm">
                  Submit a Site →
                </Link>
              </div>

              <div className="bg-white rounded p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><PixelIcon name="check" size={20} /> Validate & Review</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Help review submitted sites and maintain quality standards.
                </p>
                <Link href="/community-index/validate" className="text-blue-600 hover:underline text-sm">
                  Join Review Team →
                </Link>
              </div>

              <div className="bg-white rounded p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><PixelIcon name="chart" size={20} /> Track Progress</h3>
                <p className="text-sm text-gray-700 mb-2">
                  See how our indie index is growing over time.
                </p>
                <Link href="/community-index/analytics" className="text-blue-600 hover:underline text-sm">
                  View Analytics →
                </Link>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded">
              <p className="text-center text-gray-700 font-medium">
                Together, we&apos;re not just building a search engine—we&apos;re preserving the
                human, creative, independent spirit of the web for future generations.
              </p>
              <p className="text-center text-purple-700 font-bold mt-2 flex items-center justify-center gap-1">
                Every site you submit, validate, or discover makes the indie web stronger! <PixelIcon name="human-handsup" size={20} />
              </p>
            </div>
          </section>

          {/* Philosophy */}
          <section className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6">
            <h2 className="text-xl font-bold text-[#2E4B3F] mb-4 flex items-center gap-2">
              <PixelIcon name="chat" size={24} /> Our Philosophy
            </h2>
            <div className="space-y-4 text-gray-700">
              <blockquote className="border-l-4 border-purple-500 pl-4 italic">
                &quot;The best search engine isn&apos;t the one with the most data or the smartest algorithms—it&apos;s
                the one built by and for the community it serves.&quot;
              </blockquote>

              <p>
                We believe that search should be:
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <PixelIcon name="users" size={24} />
                  <div>
                    <strong>Community-Driven</strong><br/>
                    <span className="text-sm">Real people, not algorithms, decide what&apos;s valuable</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <PixelIcon name="search" size={24} />
                  <div>
                    <strong>Transparent</strong><br/>
                    <span className="text-sm">You can see exactly how and why results are ranked</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <PixelIcon name="drop" size={24} />
                  <div>
                    <strong>Indie-Focused</strong><br/>
                    <span className="text-sm">Personal sites and creative projects come first</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <PixelIcon name="lock" size={24} />
                  <div>
                    <strong>Privacy-Respecting</strong><br/>
                    <span className="text-sm">No tracking, no profiles, no surveillance capitalism</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <PixelIcon name="map" size={24} />
                  <div>
                    <strong>Decentralized</strong><br/>
                    <span className="text-sm">Multiple sources, no single point of control</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <PixelIcon name="zap" size={24} />
                  <div>
                    <strong>Serendipitous</strong><br/>
                    <span className="text-sm">Discover the unexpected and delightful</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <PixelIcon name="link" size={24} />
                  <div>
                    <strong>Inclusive Discovery</strong><br/>
                    <span className="text-sm">Use all available pathways to find indie content</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <PixelIcon name="trophy" size={24} />
                  <div>
                    <strong>Platform Celebrating</strong><br/>
                    <span className="text-sm">Extra recognition for indie-friendly hosts</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-sm text-indigo-800">
                  <strong className="flex items-center gap-1 inline-flex"><PixelIcon name="users" size={14} /> Creator-Friendly Approach:</strong> We understand that many indie creators
                  maintain a presence on corporate platforms to reach audiences. Rather than ignoring
                  this reality, we use it as an opportunity—extracting links to their personal sites
                  while keeping search results focused purely on independent content.
                </p>
              </div>
            </div>
          </section>

          {/* Technical Details */}
          <section className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6">
            <h2 className="text-xl font-bold text-[#2E4B3F] mb-4 flex items-center gap-2">
              <PixelIcon name="sliders" size={24} /> Technical Implementation
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="mb-4">
                For the technically curious, here&apos;s how our system works:
              </p>

              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm mb-4 overflow-x-auto">
                <div className="text-gray-400"># Core Components</div>
                <div>
                  ├── <span className="text-blue-400">Community Index DB</span> (PostgreSQL)<br/>
                  │   ├── Sites table with metadata<br/>
                  │   ├── Votes & validation tracking<br/>
                  │   └── Discovery paths & relationships<br/>
                  ├── <span className="text-blue-400">External Search Aggregator</span><br/>
                  │   ├── Brave Search API integration<br/>
                  │   ├── SearchMySite API integration<br/>
                  │   └── Result deduplication & merging<br/>
                  ├── <span className="text-blue-400">Auto-Indexing Pipeline</span><br/>
                  │   ├── Click tracking (privacy-safe)<br/>
                  │   ├── Automatic submission queue<br/>
                  │   └── Duplicate detection<br/>
                  └── <span className="text-blue-400">Ranking Engine</span><br/>
                      ├── Transparent scoring algorithm<br/>
                      ├── Multi-source result blending<br/>
                      └── Real-time score calculation
                </div>
              </div>

              <details className="mb-4">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  View Example API Response
                </summary>
                <div className="bg-gray-900 text-gray-300 p-4 rounded font-mono text-xs mt-2 overflow-x-auto">
                  <pre>{`{
  "results": [
    {
      "title": "Personal Blog About Gardening",
      "url": "https://example-indie-site.com",
      "source": "community",
      "unifiedScore": 87,
      "breakdown": {
        "baseScore": 50,
        "communityVotes": 12,
        "validationBonus": 20,
        "textRelevance": 5
      },
      "meta": {
        "discoveredBy": "@user123",
        "validatedDate": "2024-01-15",
        "tags": ["gardening", "sustainability"]
      }
    }
  ],
  "scoring": "transparent",
  "privacy": "no-tracking"
}`}</pre>
                </div>
              </details>
            </div>
          </section>

          {/* Call to Action */}
          <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-[2px_2px_0_#1F2937] p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              Ready to Help Build the Future of Search?
            </h2>
            <p className="text-lg mb-6">
              Join us in creating a search engine that celebrates creativity,
              independence, and the human side of the web.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/discover"
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Start Searching
              </Link>
              <Link
                href="/community-index/submit"
                className="bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-600 transition-colors"
              >
                Submit a Site
              </Link>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig
    }
  };
};