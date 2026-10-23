import { GetServerSideProps } from 'next';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import PageHeader from '@/components/ui/layout/PageHeader';
import Callout from '@/components/ui/feedback/Callout';
import ButtonLink from '@/components/ui/ButtonLink';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import PageMeta from '@/components/ui/layout/PageMeta';

interface MusicGuideProps {
  siteConfig: SiteConfig;
}

export default function MusicGuide({ siteConfig }: MusicGuideProps) {
  return (
    <>
      <PageMeta title="Making music for your page" description="Adding MIDI music to your page: how it sounds, where to find songs, making your own, and turning music off as a visitor." path="/help/music-guide" />

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <PageHeader title="Making music for your page" back={{ href: '/help', label: 'Back to Help' }}>
            <p>This is everything I know about getting MIDI music onto your page, from finding or making a file to uploading it. You don&apos;t need to be a composer, plenty of people just find a MIDI they love.</p>
          </PageHeader>

          {/* Quick Start */}
          <div className="thread-module mb-8">
            <h2 className="thread-headline text-2xl font-bold mb-4">
              Quick start
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-nb-ink">
              <li>Make or find a MIDI file (.mid or .midi, up to 1 MB)</li>
              <li>Go to <Link href="/settings">Settings → Music</Link> and press Add a song</li>
              <li>Pick it under &quot;On your profile&quot;. It saves straight away.</li>
              <li>Tick &quot;Start it when someone visits&quot; or &quot;Play it on repeat&quot; if you want them</li>
            </ol>
          </div>

          {/* Table of Contents */}
          <div className="thread-module mb-8">
            <h2 className="text-xl font-bold text-thread-pine mb-3">
              Jump to a section
            </h2>
            <ul className="space-y-2">
              <li><a href="#why-midi" className="text-thread-sunset hover:underline">Why MIDI?</a></li>
              <li><a href="#how-it-sounds" className="text-thread-sunset hover:underline">How your song sounds here</a></li>
              <li><a href="#creating-midi" className="text-thread-sunset hover:underline">Making a MIDI file</a></li>
              <li><a href="#composition-tips" className="text-thread-sunset hover:underline">Tips for page music</a></li>
              <li><a href="#settings" className="text-thread-sunset hover:underline">Your songs in Settings</a></li>
              <li><a href="#visitors" className="text-thread-sunset hover:underline">Turning music off as a visitor</a></li>
              <li><a href="#troubleshooting" className="text-thread-sunset hover:underline">When something&apos;s wrong</a></li>
              <li><a href="#resources" className="text-thread-sunset hover:underline">Places to find MIDIs</a></li>
            </ul>
          </div>

          <div className="space-y-8">

            {/* Why MIDI */}
            <section id="why-midi" className="thread-module">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Why MIDI?
              </h2>
              <div className="space-y-4 text-nb-ink">
                <p>
                  MIDI files are tiny, usually somewhere between 1 and 50KB, where an MP3 of the same song would be a few
                  megabytes. And they just sound like the old web! If you were around for GeoCities or MySpace, you know
                  the sound. If you write your own MIDI, it&apos;s yours.
                </p>

                <div className="border-l-4 border-nb-lav pl-4 py-1 mt-4">
                  <p className="font-semibold text-nb-ink mb-2">What is MIDI?</p>
                  <p className="text-nb-ink">
                    MIDI isn&apos;t audio, it&apos;s more like sheet music. Instead of a recording, the file says things like
                    &quot;play middle C for half a second on a piano.&quot; Whatever plays the file supplies the actual
                    sounds, which is why the same MIDI can sound so different from one computer to the next.
                  </p>
                </div>
              </div>
            </section>

            {/* How it sounds */}
            <section id="how-it-sounds" className="thread-module">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                How your song sounds here
              </h2>
              <div className="space-y-4 text-nb-ink">
                <p>
                  The player uses <strong>GeneralUser GS</strong>, a free set of instrument samples by S. Christian Collins.
                  It was made to match the Roland Sound Canvas, which is the sound most of us heard when a 90s Windows
                  computer played a MIDI. So your song should sound pretty close to how it did back then.
                </p>
                <p>
                  When you add a song, I cut that sample set down to just the instruments your song uses, so visitors
                  download a few hundred KB to a couple of MB once, not the whole 32 MB set. Everything plays in the
                  browser, nothing needs installing.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>All 128 General MIDI instruments, and GS drum kits on channel 10</li>
                  <li>All 16 channels, MIDI type 0 or type 1</li>
                  <li>Volume, pan, expression, the sustain pedal and pitch bend, with reverb and chorus</li>
                  <li>Files up to 1 MB, and up to 10 new songs a month</li>
                </ul>
                <p>
                  It works in current Chrome, Edge, Firefox and Safari (16 or newer, iPhone included). On a browser that
                  can&apos;t run it, the player says so instead of playing.
                </p>
              </div>
            </section>

            {/* Creating MIDI Files */}
            <section id="creating-midi" className="thread-module">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Making a MIDI file
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-nb-ink mb-3">Software</h3>

                  <div className="space-y-4">
                    <div className="border-l-4 border-nb-rose pl-4">
                      <h4 className="font-semibold text-nb-ink">Free</h4>
                      <ul className="space-y-2 mt-2 text-nb-ink">
                        <li><strong>MuseScore</strong> (Windows, Mac, Linux): sheet music software that exports MIDI. A good place to start.</li>
                        <li><strong>GarageBand</strong> (Mac, iOS): Apple&apos;s free studio, with MIDI export.</li>
                        <li><strong>LMMS</strong> (Windows, Mac, Linux): a free music studio with good MIDI support.</li>
                        <li><strong>Cakewalk by BandLab</strong> (Windows): a full studio, free.</li>
                        <li><strong>TuxGuitar</strong> (Windows, Mac, Linux): a guitar tab editor that exports MIDI.</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-nb-rose pl-4">
                      <h4 className="font-semibold text-nb-ink">Paid</h4>
                      <ul className="space-y-2 mt-2 text-nb-ink">
                        <li><strong>FL Studio</strong>, <strong>Ableton Live</strong> and <strong>Logic Pro</strong> (Mac) all export MIDI.</li>
                        <li><strong>Sibelius</strong> and <strong>Finale</strong> are sheet music programs that export MIDI.</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-nb-rose pl-4">
                      <h4 className="font-semibold text-nb-ink">In the browser</h4>
                      <ul className="space-y-2 mt-2 text-nb-ink">
                        <li><strong>Flat.io</strong>: sheet music in the browser, with MIDI export.</li>
                        <li><strong>Soundtrap</strong>: an online studio that handles MIDI.</li>
                        <li><strong>BeepBox</strong>: a simple chiptune maker.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-nb-ink mb-3">When you export</h3>
                  <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
                    <ul className="space-y-2 text-nb-ink">
                      <li>Type 0 or type 1 both work.</li>
                      <li>Use General MIDI instrument numbers, and put drums on channel 10.</li>
                      <li>If your program lets you pick a sound set to preview with, choose GeneralUser GS. Then what you hear is what visitors hear.</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-nb-ink mb-3">Turning an MP3 into MIDI</h3>
                  <p className="text-nb-ink">
                    Honestly, it rarely works well. Tools like AnthemScore, Logic Pro&apos;s Flex Pitch or Ableton&apos;s
                    &quot;Convert Melody to MIDI&quot; can manage a single melody, but a full song with lots going on
                    usually comes out as a mess. Finding an existing MIDI, or making one, tends to go better.
                  </p>
                </div>
              </div>
            </section>

            {/* Composition Best Practices */}
            <section id="composition-tips" className="thread-module">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Tips for page music
              </h2>
              <ul className="space-y-3 text-nb-ink">
                <li><strong>Short and loopable is nice.</strong> If you turn on repeat, make the end lead back into the start, and listen to it go round a few times.</li>
                <li><strong>Keep it gentle.</strong> People are reading your page while it plays, so it shouldn&apos;t shout over them.</li>
                <li><strong>Lots of instruments means a bigger download.</strong> A solo piano song needs about 1 MB of sounds, a full band more like 2 or 3.</li>
                <li><strong>Pick something that feels like your page.</strong> That&apos;s the fun part.</li>
              </ul>
            </section>

            {/* Settings */}
            <section id="settings" className="thread-module">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Your songs in Settings
              </h2>
              <div className="space-y-4 text-nb-ink">
                <p>
                  Everything lives in <Link href="/settings" className="text-thread-sunset hover:underline">Settings → Music</Link>,
                  and every change saves as you make it.
                </p>
                <ul className="space-y-2">
                  <li><strong>On your profile:</strong> pick one of your songs, or &quot;No music&quot;.</li>
                  <li><strong>Start it when someone visits:</strong> browsers don&apos;t let any page make sound until the visitor clicks or taps something, so the player says &quot;Click anywhere on the page for music&quot; and starts on that first click. Visitors who&apos;ve turned autoplay off just see the Play button.</li>
                  <li><strong>Play it on repeat:</strong> loops the song until someone pauses it.</li>
                  <li><strong>Preview:</strong> plays the song right there in its row.</li>
                  <li><strong>Edit:</strong> rename a song, and add a credit line. Visitors see the credit when they open the player&apos;s controls.</li>
                  <li><strong>Download</strong> saves your file back to your computer, and <strong>Delete</strong> removes it for good. Deleting the song on your profile leaves your page quiet.</li>
                </ul>
                <p>
                  On your page, the player sits in the bottom-left corner. If your page is your own HTML, you can put{' '}
                  <code>&lt;ProfileMusic /&gt;</code> wherever you want it instead.
                </p>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold text-nb-ink mb-3">Credit and copyright</h3>
                <p className="text-nb-ink mb-3">
                  If you didn&apos;t make the MIDI yourself, it&apos;s kind to say who did. The credit line is the place for
                  that: the composer, and whoever sequenced the MIDI if that was someone else.
                </p>
                <p className="text-nb-ink">
                  A MIDI of a song can still be covered by that song&apos;s copyright, even if the file was free to download.
                  Please only add music you&apos;re allowed to share, especially arrangements of popular songs.
                </p>
              </div>
            </section>

            {/* Visitors */}
            <section id="visitors" className="thread-module">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Turning music off as a visitor
              </h2>
              <div className="space-y-4 text-nb-ink">
                <p>Not in the mood for music? That&apos;s fine, and it&apos;s easy to say so.</p>
                <ul className="space-y-2">
                  <li><strong>Close</strong> (the × on the player) stops the song and folds the player into a small Music button for the rest of your visit.</li>
                  <li><strong>Mute</strong> and the volume slider are remembered in your browser, so they stick from page to page.</li>
                  <li>
                    <strong>&quot;Play music automatically when I visit a profile&quot;</strong> is in the player&apos;s
                    controls (the arrow button), and in <Link href="/settings" className="text-thread-sunset hover:underline">Settings → Music</Link>{' '}
                    under &quot;Other people&apos;s music&quot;. Untick it and no profile starts music on its own for you. If
                    you&apos;re signed in, it follows you to other browsers.
                  </li>
                </ul>
              </div>
            </section>

            {/* Troubleshooting */}
            <section id="troubleshooting" className="thread-module">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                When something&apos;s wrong
              </h2>

              <div className="space-y-4">
                <div className="border-l-4 border-nb-rose pl-4">
                  <h3 className="font-semibold text-nb-ink">The music doesn&apos;t start by itself</h3>
                  <p className="text-nb-ink mt-2">
                    That&apos;s the browser, and it&apos;s on purpose: it waits for a click or tap. Also check that &quot;Start
                    it when someone visits&quot; is ticked, and that you haven&apos;t turned autoplay off for yourself. Pressing
                    Play always works.
                  </p>
                </div>

                <div className="border-l-4 border-nb-rose pl-4">
                  <h3 className="font-semibold text-nb-ink">&quot;This browser can&apos;t play the music&quot;</h3>
                  <p className="text-nb-ink mt-2">
                    The browser is too old for the player. Updating it, or trying another one, should fix it.
                  </p>
                </div>

                <div className="border-l-4 border-nb-rose pl-4">
                  <h3 className="font-semibold text-nb-ink">&quot;The song&apos;s sounds didn&apos;t load&quot;</h3>
                  <p className="text-nb-ink mt-2">
                    The instrument sounds couldn&apos;t be downloaded, usually because the connection dropped. Reload the page.
                  </p>
                </div>

                <div className="border-l-4 border-nb-rose pl-4">
                  <h3 className="font-semibold text-nb-ink">A song won&apos;t upload</h3>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-nb-ink">
                    <li>It has to be a .mid or .midi file, 1 MB or less. MP3 and WAV files can&apos;t be used.</li>
                    <li>&quot;Broken&quot; or &quot;no notes to play&quot; means the file couldn&apos;t be read as a song. Try opening it in your music program and exporting it again.</li>
                    <li>You can add 10 songs a month. There&apos;s room for more next month.</li>
                  </ul>
                </div>

                <div className="border-l-4 border-nb-rose pl-4">
                  <h3 className="font-semibold text-nb-ink">It sounds different from my music program</h3>
                  <p className="text-nb-ink mt-2">
                    Your program is probably using its own sound set. Load GeneralUser GS into it (MuseScore and VLC can both
                    do this) and you&apos;ll hear what your page plays.
                  </p>
                </div>

                <div className="border-l-4 border-nb-rose pl-4">
                  <h3 className="font-semibold text-nb-ink">The loop has a gap or a bump</h3>
                  <p className="text-nb-ink mt-2">
                    The song loops at its very end, so silence or a long held note at the end becomes part of the loop.
                    Trimming the end in your music program usually fixes it.
                  </p>
                </div>
              </div>
            </section>

            {/* Resources */}
            <section id="resources" className="thread-module">
              <h2 className="text-2xl font-bold text-thread-pine mb-4">
                Places to find MIDIs
              </h2>

              <div className="space-y-6">
                <ul className="space-y-2 text-nb-ink">
                  <li><strong>BitMIDI</strong>: a big free collection</li>
                  <li><strong>VGMusic.com</strong>: video game MIDIs (mind the copyright)</li>
                  <li><strong>FreeMIDI.org</strong> and <strong>Classical Archives</strong>: lots of classical music</li>
                  <li><strong>MuseScore.com</strong>: community sheet music you can export as MIDI</li>
                </ul>

                <p className="text-nb-ink">
                  Free to download doesn&apos;t always mean free to share. Check each file&apos;s license, and give credit
                  when it asks for it.
                </p>

                <div>
                  <h3 className="text-xl font-semibold text-nb-ink mb-3">Learning more</h3>
                  <ul className="space-y-2 text-nb-ink">
                    <li><strong>The MIDI Association</strong> has the official specs and some good explainers.</li>
                    <li><strong>r/WeAreTheMusicMakers</strong> on Reddit is friendly to beginners.</li>
                    <li><strong>MidiEditor</strong> (free, every platform) lets you look inside a MIDI file and fix it.</li>
                  </ul>
                </div>
              </div>
            </section>

          </div>

          {/* Call to Action */}
          <Callout variant="framed" title="Add music to your page" className="mt-12">
            <p>Add a .mid file in Settings, under Music.</p>
            <p><ButtonLink href="/settings">Go to Settings</ButtonLink></p>
          </Callout>

          {/* Still have questions? */}
          <Callout title="Still have questions?" className="mt-8">
            <p>The <Link href="/help/faq">FAQ</Link> might have it, or <Link href="/help/contact">write to me</Link>.</p>
          </Callout>
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
