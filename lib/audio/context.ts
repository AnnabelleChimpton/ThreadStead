/**
 * One AudioContext for the whole tab (MIDI plan Phase 2). Every player and
 * the signup music share it: each MidiPlayer used to make its own and never
 * close it, so ten profiles left ten open, each holding the device's audio
 * output.
 *
 * Browsers only let audio start inside a click, tap or key press, so
 * unlockAudio() runs synchronously in the gesture's own call stack (iPhones
 * insist). After that, awaiting resume() is safe; before it, resume() can
 * hang forever, which is what used to lock the Play button.
 */

type NavigatorWithAudio = Navigator & {
  audioSession?: { type: string };
  userActivation?: { hasBeenActive: boolean };
};

let context: AudioContext | null = null;

function create(): AudioContext {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctor();
}

/** The tab's context, made on first use (suspended until a gesture). */
export function getAudioContext(): AudioContext {
  if (!context || context.state === 'closed') context = create();
  return context;
}

/** Whether the visitor has clicked, tapped or pressed a key on this page yet. */
export function hasUserActivation(): boolean {
  const activation = (navigator as NavigatorWithAudio).userActivation;
  // Missing in older browsers: trying is harmless, so say yes
  return !activation || activation.hasBeenActive;
}

/**
 * Whether sound can start without waiting for a click: the visitor has
 * used the page, or the browser lets this site play anyway (Chrome does for
 * sites people often play media on; the context is then born running).
 */
export function audioCanStartNow(): boolean {
  return hasUserActivation() || getAudioContext().state === 'running';
}

/**
 * Call at the top of a click, tap or key handler, before any await. Starts
 * the context, asks iPhones to play through the silent switch, and plays one
 * silent sample (the iOS trick that wakes the output).
 */
export function unlockAudio(): AudioContext {
  const ctx = getAudioContext();
  const { audioSession } = navigator as NavigatorWithAudio;
  if (audioSession && audioSession.type !== 'playback') {
    try { audioSession.type = 'playback'; } catch { /* not supported */ }
  }
  if (ctx.state !== 'running') {
    ctx.resume().catch(() => {});
    try {
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      source.connect(ctx.destination);
      source.start(0);
    } catch { /* nothing to wake */ }
  }
  return ctx;
}

/**
 * Whether the context runs, waiting at most `ms`. Outside a gesture resume()
 * never settles, so this never waits on it alone.
 */
export function audioIsRunning(ms = 500): Promise<boolean> {
  const ctx = getAudioContext();
  if (ctx.state === 'running') return Promise.resolve(true);
  return Promise.race([
    ctx.resume().then(() => ctx.state === 'running', () => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(ctx.state === 'running'), ms)),
  ]);
}

/**
 * Unlock on the visitor's next click, tap or key press anywhere, once. For
 * autoplay: the song can then start from that gesture.
 */
export function unlockOnNextGesture(then: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const opts = { capture: true } as AddEventListenerOptions;
  const handler = () => {
    remove();
    unlockAudio();
    then();
  };
  const remove = () => {
    window.removeEventListener('pointerdown', handler, opts);
    window.removeEventListener('keydown', handler, opts);
  };
  window.addEventListener('pointerdown', handler, opts);
  window.addEventListener('keydown', handler, opts);
  return remove;
}

/** For tests */
export function __resetAudioContextForTests() {
  context = null;
}
