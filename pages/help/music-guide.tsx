import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';

interface MusicGuideProps {
  siteConfig: SiteConfig;
}

export default function MusicGuide({ siteConfig }: MusicGuideProps) {
  return (
    <>
      <Head>
        <title>HomePageAgain — Music Creator&apos;s Guide</title>
        <meta name="description" content="Complete guide for music creators on HomePageAgain - learn about MIDI support, technical specifications, composition tips, and how to create the perfect background music for your profile." />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/help/music-guide`} />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content="HomePageAgain — Music Creator&apos;s Guide" />
        <meta property="og:description" content="Complete guide for creating and uploading MIDI music on HomePageAgain" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/help/music-guide`} />
      </Head>

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <Link href="/help" className="text-sm text-thread-sunset hover:underline mb-3 inline-block">
              ← Back to Help
            </Link>
            <div className="bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 border-2 border-black rounded-lg shadow-[4px_4px_0_#000] p-6 sm:p-8 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-thread-pine mb-4">
                Music Creator&apos;s Guide
              </h1>
              <p className="text-lg text-gray-700 mb-3">
                Everything you need to know about creating, uploading, and optimizing MIDI music for your profile.
              </p>
              <p className="text-base text-thread-sage">
                Whether you&apos;re a seasoned composer or just getting started, this guide will help you create the perfect background music!
              </p>
            </div>
          </div>

          {/* Quick Start */}
          <div className="bg-green-50 border-2 border-green-600 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-green-900 mb-4">
              Quick Start
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-800">
              <li>Create or export a MIDI file (.mid or .midi)</li>
              <li>Go to <Link href="/settings" className="text-thread-sunset hover:underline font-medium">Settings → Music</Link></li>
              <li>Upload your MIDI file (max 1MB)</li>
              <li>Add a title and optional description</li>
              <li>Set as your profile music and configure autoplay/loop settings</li>
            </ol>
          </div>

          {/* Table of Contents */}
          <div className="bg-thread-cream border border-thread-sage rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-thread-pine mb-3">
              Jump to Section
            </h2>
            <ul className="space-y-2">
              <li><a href="#why-midi" className="text-thread-sunset hover:underline">Why MIDI?</a></li>
              <li><a href="#technical-specs" className="text-thread-sunset hover:underline">Technical Specifications</a></li>
              <li><a href="#creating-midi" className="text-thread-sunset hover:underline">Creating MIDI Files</a></li>
              <li><a href="#composition-tips" className="text-thread-sunset hover:underline">Composition Best Practices</a></li>
              <li><a href="#uploading" className="text-thread-sunset hover:underline">Uploading & Managing</a></li>
              <li><a href="#troubleshooting" className="text-thread-sunset hover:underline">Troubleshooting</a></li>
              <li><a href="#resources" className="text-thread-sunset hover:underline">Resources & Tools</a></li>
            </ul>
          </div>

          {/* Main Content Sections */}
          <div className="space-y-8">

            {/* Why MIDI */}
            <section id="why-midi" className="bg-thread-cream border border-thread-sage rounded-lg p-6">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Why MIDI?
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  MIDI (Musical Instrument Digital Interface) files are perfect for profile background music because:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Tiny file sizes</strong> - MIDI files are typically 1-50KB, compared to 3-5MB for MP3s</li>
                  <li><strong>Instant loading</strong> - No buffering or delays, music starts immediately</li>
                  <li><strong>Classic web nostalgia</strong> - Remember GeoCities and MySpace? MIDI brings back that creative, playful internet vibe</li>
                  <li><strong>Browser-native playback</strong> - Uses Web Audio API for smooth, reliable playback on all modern browsers</li>
                  <li><strong>No copyright concerns</strong> - Your original MIDI compositions are completely yours</li>
                </ul>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                  <p className="font-semibold text-blue-900 mb-2">🎵 What is MIDI?</p>
                  <p className="text-blue-800">
                    MIDI isn&apos;t audio - it&apos;s digital sheet music! Instead of recording sound waves, MIDI files contain instructions: &quot;play middle C for half a second on a piano sound.&quot; Your browser then generates the actual audio in real-time using our custom synthesizer.
                  </p>
                </div>
              </div>
            </section>

            {/* Technical Specifications */}
            <section id="technical-specs" className="bg-thread-cream border border-thread-sage rounded-lg p-6">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Technical Specifications
              </h2>

              <div className="space-y-6">
                {/* File Requirements */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">File Requirements</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li><strong>Format:</strong> .mid or .midi files</li>
                    <li><strong>Max file size:</strong> 1MB</li>
                    <li><strong>Complexity limit:</strong> Approximately 2000 notes (you&apos;ll see a warning if exceeded)</li>
                    <li><strong>MIDI channels:</strong> All 16 standard MIDI channels supported</li>
                    <li><strong>Polyphony:</strong> Up to 200 simultaneous voices</li>
                  </ul>
                </div>

                {/* Custom Synthesis Engine */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">How Our Synthesis Works</h3>
                  <p className="text-gray-700 mb-3">
                    HomePageAgain uses a <strong>custom Web Audio synthesis engine</strong> instead of traditional sound fonts. This means:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
                    <li>No external sound font files (.sf2/.sf3) are needed or used</li>
                    <li>All instrument sounds are generated programmatically in real-time</li>
                    <li>Lightweight and fast - no large sound font downloads</li>
                    <li>Consistent playback across all browsers and devices</li>
                  </ul>
                </div>

                {/* Supported Note Ranges */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Supported Instrument Ranges</h3>
                  <p className="text-gray-700 mb-3">
                    Our synthesis engine has optimized ranges for different instrument families:
                  </p>

                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300 text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 border-b text-left font-semibold">Instrument Family</th>
                          <th className="px-4 py-2 border-b text-left font-semibold">Note Range</th>
                          <th className="px-4 py-2 border-b text-left font-semibold">MIDI Notes</th>
                          <th className="px-4 py-2 border-b text-left font-semibold">Best For</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-2 border-b font-medium">Piano</td>
                          <td className="px-4 py-2 border-b">C3 to C6</td>
                          <td className="px-4 py-2 border-b">48-84</td>
                          <td className="px-4 py-2 border-b">Melody, chords, accompaniment</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-2 border-b font-medium">Strings</td>
                          <td className="px-4 py-2 border-b">G3 to E7</td>
                          <td className="px-4 py-2 border-b">55-88</td>
                          <td className="px-4 py-2 border-b">High melodies, orchestral parts</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 border-b font-medium">Brass</td>
                          <td className="px-4 py-2 border-b">Bb2 to Bb6</td>
                          <td className="px-4 py-2 border-b">46-82</td>
                          <td className="px-4 py-2 border-b">Fanfares, bold melodies</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-2 border-b font-medium">Other Instruments</td>
                          <td className="px-4 py-2 border-b">Full MIDI range</td>
                          <td className="px-4 py-2 border-b">0-127</td>
                          <td className="px-4 py-2 border-b">Oscillator-based synthesis</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                    <p className="font-semibold text-yellow-900 mb-2">💡 Composition Tip</p>
                    <p className="text-yellow-800">
                      While all MIDI notes will play, staying within these optimized ranges ensures the best sound quality. Notes outside these ranges use simpler oscillator synthesis.
                    </p>
                  </div>
                </div>

                {/* General MIDI Support */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">General MIDI (GM) Support</h3>
                  <p className="text-gray-700 mb-2">
                    We support the standard General MIDI instrument map, which includes:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-gray-700">
                    <li>Piano family (Acoustic Piano, Electric Piano, Harpsichord, etc.)</li>
                    <li>Chromatic Percussion (Vibraphone, Marimba, Xylophone, etc.)</li>
                    <li>Organ family (Pipe Organ, Rock Organ, Church Organ, etc.)</li>
                    <li>Guitar family (Acoustic, Electric, Bass, etc.)</li>
                    <li>Bass instruments</li>
                    <li>String ensembles (Violin, Viola, Cello, Orchestra, etc.)</li>
                    <li>Brass family (Trumpet, Trombone, French Horn, etc.)</li>
                    <li>Reed instruments (Saxophone, Oboe, Clarinet, etc.)</li>
                    <li>Synth instruments and sound effects</li>
                  </ul>
                  <p className="text-gray-700 mt-3">
                    All 128 standard GM instruments are recognized and will be synthesized appropriately by our audio engine.
                  </p>
                </div>

                {/* Browser Compatibility */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Browser Compatibility</h3>
                  <p className="text-gray-700">
                    Our MIDI player works on all modern browsers that support Web Audio API:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-gray-700 mt-2">
                    <li>Chrome/Edge (version 14+)</li>
                    <li>Firefox (version 25+)</li>
                    <li>Safari (version 6+)</li>
                    <li>Mobile browsers (iOS Safari, Chrome Mobile)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Creating MIDI Files */}
            <section id="creating-midi" className="bg-thread-cream border border-thread-sage rounded-lg p-6">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Creating MIDI Files
              </h2>

              <div className="space-y-6">
                {/* Software Options */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Recommended Software</h3>

                  <div className="space-y-4">
                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="font-semibold text-gray-900">Free Options</h4>
                      <ul className="space-y-2 mt-2 text-gray-700">
                        <li>
                          <strong>MuseScore</strong> (Windows, Mac, Linux) - Full-featured music notation software with MIDI export. Perfect for beginners and professionals.
                        </li>
                        <li>
                          <strong>GarageBand</strong> (Mac, iOS) - Apple&apos;s free DAW with easy MIDI creation and export capabilities.
                        </li>
                        <li>
                          <strong>LMMS</strong> (Windows, Mac, Linux) - Free digital audio workstation with comprehensive MIDI support.
                        </li>
                        <li>
                          <strong>Cakewalk by BandLab</strong> (Windows) - Professional-grade DAW, completely free.
                        </li>
                        <li>
                          <strong>TuxGuitar</strong> (Windows, Mac, Linux) - Guitar tablature editor with MIDI export, great for guitar-based compositions.
                        </li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-semibold text-gray-900">Paid Options</h4>
                      <ul className="space-y-2 mt-2 text-gray-700">
                        <li>
                          <strong>FL Studio</strong> - Popular DAW with excellent MIDI workflow.
                        </li>
                        <li>
                          <strong>Ableton Live</strong> - Professional music production with advanced MIDI features.
                        </li>
                        <li>
                          <strong>Logic Pro</strong> (Mac) - Apple&apos;s professional DAW with comprehensive MIDI tools.
                        </li>
                        <li>
                          <strong>Sibelius/Finale</strong> - Professional music notation software with MIDI export.
                        </li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-purple-500 pl-4">
                      <h4 className="font-semibold text-gray-900">Online Tools</h4>
                      <ul className="space-y-2 mt-2 text-gray-700">
                        <li>
                          <strong>Flat.io</strong> - Web-based music notation with MIDI export.
                        </li>
                        <li>
                          <strong>Soundtrap</strong> - Online music studio with MIDI capabilities.
                        </li>
                        <li>
                          <strong>BeepBox</strong> - Simple online tool for creating chiptune-style MIDI music.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Export Settings */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Export Settings Guide</h3>
                  <p className="text-gray-700 mb-3">
                    When exporting your MIDI file, use these settings for best results:
                  </p>

                  <div className="bg-gray-50 border border-gray-300 rounded p-4">
                    <ul className="space-y-2 text-gray-700">
                      <li><strong>Format:</strong> MIDI Type 0 or Type 1 (both supported)</li>
                      <li><strong>Resolution:</strong> 480 PPQ (Pulses Per Quarter note) recommended</li>
                      <li><strong>Tempo:</strong> 80-140 BPM works well for background music</li>
                      <li><strong>Instruments:</strong> Use General MIDI (GM) instrument mapping for consistent results</li>
                      <li><strong>Channels:</strong> Any of the 16 MIDI channels (Channel 10 is drums by GM standard)</li>
                    </ul>
                  </div>
                </div>

                {/* Converting Existing Music */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Converting Existing Music to MIDI</h3>

                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-3">
                    <p className="font-semibold text-yellow-900 mb-2">⚠️ Important Note About Conversion</p>
                    <p className="text-yellow-800">
                      Converting audio (MP3, WAV) to MIDI is challenging and results are often not usable. Audio-to-MIDI tools struggle with polyphonic music (multiple instruments/notes). For best results, create MIDI from scratch or find existing MIDI files.
                    </p>
                  </div>

                  <p className="text-gray-700 mb-2">If you want to convert audio to MIDI, these tools can help (with limitations):</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-gray-700">
                    <li>AnthemScore - AI-powered audio to MIDI conversion</li>
                    <li>Logic Pro&apos;s &quot;Flex Pitch to MIDI&quot; (for monophonic melodies)</li>
                    <li>Ableton Live&apos;s &quot;Convert Melody to MIDI&quot;</li>
                    <li>Bear File Converter (online, basic conversion)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Composition Best Practices */}
            <section id="composition-tips" className="bg-thread-cream border border-thread-sage rounded-lg p-6">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Composition Best Practices
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">For Profile Background Music</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li>
                      <strong>Keep it short and loopable</strong> - 30-60 seconds works best. Make sure the end flows naturally back to the beginning.
                    </li>
                    <li>
                      <strong>Subtle is better</strong> - Background music should enhance your profile, not overwhelm it. Avoid aggressive or overly complex arrangements.
                    </li>
                    <li>
                      <strong>Consider your visitors</strong> - Many people browse with sound off or will appreciate music that doesn&apos;t demand attention.
                    </li>
                    <li>
                      <strong>Match your vibe</strong> - Choose music that reflects your profile&apos;s personality and content theme.
                    </li>
                    <li>
                      <strong>Test the loop</strong> - Listen to your music looping 3-4 times to ensure it doesn&apos;t get annoying or repetitive.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Optimizing File Complexity</h3>
                  <p className="text-gray-700 mb-3">
                    To keep your MIDI file under the ~2000 note complexity limit:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li><strong>Simplify percussion</strong> - Drums can add hundreds of notes quickly. Use simpler drum patterns.</li>
                    <li><strong>Reduce voice count</strong> - Use 2-4 instruments instead of 8-10.</li>
                    <li><strong>Shorter duration</strong> - A 30-second loop is much lighter than a 2-minute piece.</li>
                    <li><strong>Quantize notes</strong> - Remove unnecessary micro-timing variations.</li>
                    <li><strong>Thin out rapid passages</strong> - Fast runs and arpeggios add up quickly.</li>
                  </ul>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                    <p className="font-semibold text-blue-900 mb-2">💡 Complexity Warning</p>
                    <p className="text-blue-800">
                      When you upload a MIDI file, we&apos;ll analyze it and warn you if it exceeds ~2000 notes. High complexity can cause performance issues on slower devices.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Musical Style Suggestions</h3>
                  <p className="text-gray-700 mb-3">
                    These styles work particularly well for profile background music:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
                    <li><strong>Lo-fi beats</strong> - Chill, relaxed, easy to loop</li>
                    <li><strong>Ambient/atmospheric</strong> - Gentle, unobtrusive soundscapes</li>
                    <li><strong>Chiptune/8-bit</strong> - Nostalgic, web-native vibe</li>
                    <li><strong>Simple piano</strong> - Classic, elegant, universally appealing</li>
                    <li><strong>Jazz snippets</strong> - Sophisticated but not overwhelming</li>
                    <li><strong>Celtic/folk melodies</strong> - Gentle, storytelling quality</li>
                    <li><strong>Minimalist/classical</strong> - Timeless and refined</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Instrument Selection Tips</h3>
                  <p className="text-gray-700 mb-3">
                    Our synthesis engine excels with these instrument choices:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li><strong>Piano-based tracks</strong> - Use MIDI notes 48-84 (C3-C6) for best quality with our procedurally generated piano samples.</li>
                    <li><strong>String sections</strong> - Great for ambient pads and melodies, optimized for notes 55-88 (G3-E7).</li>
                    <li><strong>Brass accents</strong> - Perfect for fanfares or bold statements, best in range 46-82 (Bb2-Bb6).</li>
                    <li><strong>Mixed ensembles</strong> - Combining piano, strings, and light percussion creates rich texture without overwhelming complexity.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Uploading & Managing */}
            <section id="uploading" className="bg-thread-cream border border-thread-sage rounded-lg p-6">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Uploading & Managing Your Music
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step-by-Step Upload Process</h3>
                  <ol className="list-decimal list-inside space-y-3 text-gray-700">
                    <li>
                      <strong>Navigate to Settings</strong> - Go to <Link href="/settings" className="text-thread-sunset hover:underline">Settings → Music tab</Link>
                    </li>
                    <li>
                      <strong>Upload your file</strong> - Drag and drop your .mid/.midi file or click to browse. Max file size: 1MB.
                    </li>
                    <li>
                      <strong>Add metadata</strong>
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>Title (required, max 100 characters) - Give your track a name</li>
                        <li>Description (optional, max 300 characters) - Add composer info, style, mood, or any context</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Review complexity</strong> - Check for any warnings about file complexity (notes, file size)
                    </li>
                    <li>
                      <strong>Upload and test</strong> - After upload, you&apos;ll see your file in the list. Test playback before setting it live.
                    </li>
                    <li>
                      <strong>Set as profile music</strong> - Click &quot;Set as Profile&quot; to make it your active background music
                    </li>
                    <li>
                      <strong>Configure playback</strong>
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>Autoplay when visitors arrive (optional)</li>
                        <li>Loop continuously (recommended for short tracks)</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Managing Your MIDI Library</h3>
                  <p className="text-gray-700 mb-3">
                    You can upload multiple MIDI files and switch between them:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li><strong>View all tracks</strong> - See all your uploaded MIDI files with title, size, and upload date</li>
                    <li><strong>Switch active track</strong> - Click &quot;Set as Profile&quot; on any track to make it your active music</li>
                    <li><strong>Download files</strong> - Download any of your uploaded MIDI files to your device</li>
                    <li><strong>Delete tracks</strong> - Remove MIDI files you no longer want (this is permanent)</li>
                    <li><strong>Update descriptions</strong> - Edit track metadata to keep your library organized</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Attribution & Licensing</h3>
                  <p className="text-gray-700 mb-3">
                    If you&apos;re using MIDI files created by others, it&apos;s important to give proper credit:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li>Use the Description field to credit the original composer</li>
                    <li>If the MIDI is under Creative Commons or other licenses, mention this in the description</li>
                    <li>For your original compositions, you can add &quot;Original composition by [your name]&quot;</li>
                    <li>Link to the source if you found the MIDI file online</li>
                  </ul>

                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                    <p className="font-semibold text-yellow-900 mb-2">📜 Copyright Notice</p>
                    <p className="text-yellow-800">
                      MIDI files can still be subject to copyright if they represent copyrighted musical compositions. Make sure you have the right to use any MIDI files you upload, especially arrangements of popular songs.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Troubleshooting */}
            <section id="troubleshooting" className="bg-thread-cream border border-thread-sage rounded-lg p-6">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Troubleshooting
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Common Issues & Solutions</h3>

                  <div className="space-y-4">
                    <div className="border-l-4 border-red-500 pl-4">
                      <h4 className="font-semibold text-gray-900">Music doesn&apos;t play</h4>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                        <li>Check that autoplay is enabled in your music settings</li>
                        <li>Verify the track is set as your profile music (green &quot;Active&quot; indicator)</li>
                        <li>Try a different browser (Chrome, Firefox, Safari all supported)</li>
                        <li>Make sure your browser allows audio playback (some browsers block autoplay)</li>
                        <li>Check your device volume and browser tab isn&apos;t muted</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-orange-500 pl-4">
                      <h4 className="font-semibold text-gray-900">Complexity warning appears</h4>
                      <p className="text-gray-700 mt-2">
                        Your MIDI file has more than ~2000 notes, which may cause performance issues. To fix:
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                        <li>Simplify percussion/drum tracks (they often have hundreds of notes)</li>
                        <li>Remove unnecessary instrument tracks</li>
                        <li>Shorten the duration of your piece</li>
                        <li>Quantize notes to remove micro-timing</li>
                        <li>Use a simpler arrangement with fewer simultaneous voices</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-semibold text-gray-900">File upload fails</h4>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                        <li>Check file size is under 1MB</li>
                        <li>Verify file format is .mid or .midi (not .mp3, .wav, or other audio formats)</li>
                        <li>Make sure the file isn&apos;t corrupted - try opening it in your MIDI software first</li>
                        <li>Check your internet connection</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-purple-500 pl-4">
                      <h4 className="font-semibold text-gray-900">Music sounds different than expected</h4>
                      <p className="text-gray-700 mt-2">
                        Remember, we use custom Web Audio synthesis, not traditional sound fonts:
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                        <li>Instruments will sound different than in your DAW or notation software</li>
                        <li>Some advanced MIDI features (pitch bend, modulation) may sound different</li>
                        <li>Drum sounds use General MIDI mapping but our custom synthesis</li>
                        <li>Notes within our optimized ranges (piano: 48-84, strings: 55-88, brass: 46-82) will sound best</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="font-semibold text-gray-900">Loop doesn&apos;t sound smooth</h4>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                        <li>Make sure your MIDI file ends on the same note/chord it begins with</li>
                        <li>Check for trailing notes that extend past the end</li>
                        <li>Use a fade-out or natural ending point that flows back to the beginning</li>
                        <li>Test your loop multiple times in your DAW before uploading</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Still Having Issues?</h3>
                  <p className="text-gray-700 mb-3">
                    If you&apos;re experiencing problems not covered here:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li>Check the <Link href="/help/faq" className="text-thread-sunset hover:underline">FAQ page</Link> for general platform questions</li>
                    <li><Link href="/help/contact" className="text-thread-sunset hover:underline">Contact support</Link> with details about your issue</li>
                    <li>Include your browser type, device, and a description of what&apos;s not working</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Resources */}
            <section id="resources" className="bg-thread-cream border border-thread-sage rounded-lg p-6">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Resources & Tools
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Free MIDI File Collections</h3>
                  <p className="text-gray-700 mb-3">
                    Looking for inspiration or starting points? These sites offer free MIDI files:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li>
                      <strong>FreeMIDI.org</strong> - Large collection of classical music MIDI files
                    </li>
                    <li>
                      <strong>BitMIDI</strong> - Free MIDI file database with thousands of tracks
                    </li>
                    <li>
                      <strong>VGMusic.com</strong> - Video game MIDI files (check copyright!)
                    </li>
                    <li>
                      <strong>Classical Archives</strong> - Classical music MIDI collection
                    </li>
                    <li>
                      <strong>MuseScore.com</strong> - Community-created sheet music that can be exported as MIDI
                    </li>
                  </ul>

                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                    <p className="font-semibold text-yellow-900 mb-2">⚠️ Licensing Reminder</p>
                    <p className="text-yellow-800">
                      Free doesn&apos;t always mean copyright-free. Check the license for each MIDI file and give proper attribution when required.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Sound Font Reference (For External Use)</h3>
                  <p className="text-gray-700 mb-3">
                    While HomePageAgain doesn&apos;t use traditional sound fonts, if you want to preview how your MIDI will sound with different sound fonts on your own computer, these are popular free options:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li>
                      <strong>FluidR3_GM.sf2</strong> (141 MB) - High-quality General MIDI sound font, widely used standard
                    </li>
                    <li>
                      <strong>GeneralUser GS</strong> (29 MB) - Excellent quality, smaller file size than FluidR3
                    </li>
                    <li>
                      <strong>MuseScore_General.sf3</strong> - Compressed sound font used by MuseScore
                    </li>
                    <li>
                      <strong>Timbres of Heaven</strong> - Large, expressive GM sound font with many variations
                    </li>
                  </ul>

                  <p className="text-gray-700 mt-3">
                    <strong>Note:</strong> These sound fonts are for testing your MIDI files in external software like MuseScore, VLC, or MIDI players. HomePageAgain uses its own custom synthesis, so your music will sound different on the platform.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Learning Resources</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>
                      <strong>MIDI Association</strong> - Official MIDI specifications and learning materials
                    </li>
                    <li>
                      <strong>YouTube tutorials</strong> - Search for &quot;MIDI composition tutorial&quot; or &quot;[your DAW] MIDI basics&quot;
                    </li>
                    <li>
                      <strong>Music theory basics</strong> - Understanding scales, chords, and rhythm helps create better MIDI
                    </li>
                    <li>
                      <strong>r/WeAreTheMusicMakers</strong> (Reddit) - Supportive community for music creators of all levels
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">MIDI File Analysis Tools</h3>
                  <p className="text-gray-700 mb-3">
                    These tools help you analyze and optimize MIDI files:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li>
                      <strong>MIDI Trail</strong> (Windows) - Visualize and analyze MIDI file structure
                    </li>
                    <li>
                      <strong>MidiEditor</strong> (Cross-platform) - Free MIDI file editor with analysis features
                    </li>
                    <li>
                      <strong>Sekaiju</strong> (Windows) - MIDI sequencer with detailed event list view
                    </li>
                  </ul>
                </div>
              </div>
            </section>

          </div>

          {/* Call to Action */}
          <div className="mt-12 bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100 border-2 border-black rounded-lg shadow-[3px_3px_0_#000] p-6 sm:p-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-thread-pine mb-4">
              Ready to Add Music to Your Profile?
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Head to your settings and upload your first MIDI track!
            </p>
            <Link
              href="/settings"
              className="inline-block px-6 py-3 bg-white hover:bg-gray-50 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] font-medium transition-all transform hover:-translate-y-0.5"
            >
              Go to Music Settings →
            </Link>
          </div>

          {/* Still have questions? */}
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">
              Still have questions?
            </h3>
            <p className="text-blue-800 mb-4">
              Check out our <Link href="/help/faq" className="text-thread-sunset hover:underline font-medium">FAQ</Link> or <Link href="/help/contact" className="text-thread-sunset hover:underline font-medium">contact us</Link> for help!
            </p>
          </div>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    }
  };
};
