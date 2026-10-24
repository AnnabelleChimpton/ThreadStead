/**
 * The lessons at /build/html, in Annabelle's words: a short shelf to start
 * with, each one a thing for your page, and a few to go further. A step's
 * code runs live under it on the lesson page (unless it needs your own data
 * or CSS: live: false), and its checks are what the editor's Learn panel
 * looks for in your page ("Check my work").
 *
 * Every step's code compiles with nothing to warn about
 * (tests/template-engine/__tests__/lessons.etest.ts).
 */

/** What "Check my work" looks for, read from the compile the editor's preview already runs */
export type LessonCheck =
  /** A component is on the page, optionally with these settings */
  | { uses: string; props?: Record<string, string>; hint: string }
  /** An HTML tag is on the page */
  | { tag: string; hint: string }
  /** A component sits straight inside another */
  | { inside: string; parent: string; hint: string }
  /** A <Var name="…"> is on the page */
  | { varDeclared: string; hint: string }
  /** The first tag of this kind no longer says what the example said */
  | { textChanged: { tag: string; from: string }; hint: string }
  /** Nothing listed under the code */
  | { noProblems: true; hint: string }
  /** Something only the person can see (did it count?): they answer yes or not yet */
  | { selfCheck: string };

export interface LessonStep {
  id: string;
  title: string;
  /** Markdown. Tags written in it show as code (tutorialLinkProcessor). */
  body: string;
  /** For the HTML box */
  code: string;
  /** For the CSS tab, when the step has some */
  css?: string;
  tips?: string[];
  /** false when the example needs your own data or CSS to show anything */
  live?: boolean;
  checks?: LessonCheck[];
}

export interface Lesson {
  slug: string;
  title: string;
  /** One or two sentences under the title, and on the lessons page */
  lede: string;
  shelf: 'start' | 'further';
  steps: LessonStep[];
  /** The last thing on the page, before Next */
  wrapUp: string;
}

const PAT_PAGE = `<main>
  <h1>Hi, I'm Pat!</h1>
  <p>I collect old radios and I'm trying to learn the banjo.</p>
</main>`;

const PAT_WITH_PICTURE = `<main>
  <h1>Hi, I'm Pat!</h1>
  <img src="/assets/default-avatar.gif" alt="A cartoon of me" width="96">
  <p>I collect old radios and I'm trying to learn the banjo.</p>
</main>`;

const PAT_WITH_GUESTBOOK = `<main>
  <h1>Hi, I'm Pat!</h1>
  <img src="/assets/default-avatar.gif" alt="A cartoon of me" width="96">
  <p>I collect old radios and I'm trying to learn the banjo.</p>

  <h2>Sign my guestbook</h2>
  <Guestbook heading="none" />
</main>`;

export const lessons: Lesson[] = [
  {
    slug: 'make-it-yours',
    title: 'Make it yours',
    lede: 'Change the words, add a picture of your own and put out a guestbook. About five minutes.',
    shelf: 'start',
    steps: [
      {
        id: 'words',
        title: 'Start with a few words',
        body: "Whatever is in the editor's HTML box is your page (it's in Settings, under Your page, if you're not there yet). It opens with a starter page already in it, so swap the words for your own. Normal HTML works here, the same as on Neocities or anywhere else.",
        code: PAT_PAGE,
        tips: [
          'The preview next to the editor updates as you type, so you see it before anyone else does.',
          'Nothing goes on your page until you press Save.',
        ],
        checks: [
          { tag: 'p', hint: 'Write a few words of your own in a p tag.' },
          { textChanged: { tag: 'p', from: "I collect old radios and I'm trying to learn the banjo." }, hint: "Change the words to your own. Unless you also collect old radios." },
          { selfCheck: 'Does the preview show your words?' },
        ],
      },
      {
        id: 'picture',
        title: 'Add a picture',
        body: "Upload a picture on your Media page, press Copy link on it, and paste the link into an img tag. Or press Insert image above the code and pick one. Links to pictures on other sites work too, just know that site can see who's looking at your page.",
        code: PAT_WITH_PICTURE,
        tips: [
          'Write a short alt description so people using screen readers know what the picture is.',
          'PNG, GIF and WebP stay exactly as you uploaded them, so pixel art stays crisp.',
        ],
        checks: [
          { tag: 'img', hint: 'Add an img tag with your picture\'s link in src.' },
        ],
      },
      {
        id: 'guestbook',
        title: 'Put out a guestbook',
        body: "This is where the site comes in. Some tags aren't HTML at all, they're pieces of the site you can drop into your page. <Guestbook /> is the one I'd start with: visitors sign it right there on your page. It has its own heading, so if you write one yourself like I did here, add heading=\"none\" and you won't get two.",
        code: PAT_WITH_GUESTBOOK,
        live: false,
        tips: [
          'Component names start with a capital letter, which is how the editor tells them apart from HTML.',
          'The components page lists every one, starting with the ones that show your own stuff.',
        ],
        checks: [
          { uses: 'Guestbook', hint: 'Add <Guestbook /> where you want it.' },
        ],
      },
      {
        id: 'save',
        title: 'Save it',
        body: "Press Save & Go Live and that's your page! If you change your mind later, History in the editor keeps the versions you saved over, so you can always go back.",
        code: PAT_WITH_GUESTBOOK,
        live: false,
        tips: [
          'Tick "Visitors can view my source" if you\'d like people to learn from your page the way you might have learned from theirs.',
        ],
        checks: [
          { noProblems: true, hint: "Something on the page has a problem. The list under the code says which line." },
          { selfCheck: 'Did you press Save & Go Live?' },
        ],
      },
    ],
    wrapUp: "That's a real page, written by you, with a guestbook people can sign. Next, I'd put your own stuff on it: your friends, your song, your rings and your house.",
  },

  {
    slug: 'your-stuff',
    title: 'Your stuff',
    lede: 'The site keeps your friends, your song, your rings and your house. Each one is a single tag you can put anywhere on your page.',
    shelf: 'start',
    steps: [
      {
        id: 'top-8',
        title: 'Your Top 8',
        body: 'Pick up to eight friends in Settings, under Profile. Then <FriendDisplay /> shows them with their pictures, and each one links to their page.',
        code: `<h2>My Top 8</h2>
<FriendDisplay heading="none" />`,
        checks: [
          { uses: 'FriendDisplay', hint: 'Add <FriendDisplay /> where you want your friends to show.' },
        ],
      },
      {
        id: 'song',
        title: 'Your song',
        body: "Pick a song in Settings, under Music. <ProfileMusic /> puts its player wherever you put the tag. If you've turned autoplay on, it starts when a visitor first clicks somewhere on the page, unless they've said no to music starting on its own. Leave the tag out and the player floats in the corner instead.",
        code: `<h2>On repeat</h2>
<ProfileMusic />`,
        live: false,
        checks: [
          { uses: 'ProfileMusic', hint: 'Add <ProfileMusic /> where you want the player.' },
        ],
      },
      {
        id: 'rings',
        title: 'Your rings',
        body: "<MyRings /> lists the rings you're in, as links. <RingNav /> is a webring bar for one of them: Previous, the ring's page, Random and Next. For ring, use the end of the ring's address, so for /tr/tiny-gardens it's tiny-gardens.",
        code: `<h2>Rings I'm in</h2>
<MyRings />

<RingNav ring="welcome" />`,
        live: false,
        tips: [
          "Previous and Next go to the pixel homes of the people next to you on the ring's street.",
        ],
        checks: [
          { uses: 'MyRings', hint: 'Add <MyRings /> to list your rings.' },
        ],
      },
      {
        id: 'house',
        title: 'Your house',
        body: "<MyHouse /> is a little picture of your pixel home, and <HouseBadge /> is its 88x31 button. Both of them link to it.",
        code: `<MyHouse size="sm" />
<HouseBadge />`,
        live: false,
        tips: [
          "If one of these has nothing in it yet, visitors see nothing and you see a note about it on your own page.",
        ],
        checks: [
          { uses: 'MyHouse', hint: 'Add <MyHouse /> to show your home.' },
        ],
      },
    ],
    wrapUp: "Now your page shows the things you already have here, and they stay up to date by themselves. Next up: your own colours.",
  },

  {
    slug: 'colours-and-fonts',
    title: 'Colours and fonts',
    lede: 'Make the page your colours, first with pickers you can change without touching the code, then with CSS.',
    shelf: 'start',
    steps: [
      {
        id: 'colour-pickers',
        title: 'Colour pickers',
        body: "Put a line like <meta name=\"color:Background\" content=\"#fdf3d9\"> at the top of your page, and Settings shows a colour picker for it, under Your page. In your CSS, var(--color-background) is that colour. Change the picker and the page follows, no code needed.",
        code: `<meta name="color:Background" content="#fdf3d9">
<meta name="color:Ink" content="#3a2f26">

<h1>Hi, I'm Pat!</h1>
<p>I collect old radios and I'm trying to learn the banjo.</p>`,
        css: `body {
  background: var(--color-background);
  color: var(--color-ink);
}`,
        live: false,
        tips: [
          'The name after color: is what the picker is called, and it becomes the variable: Ink is var(--color-ink).',
        ],
        checks: [
          { selfCheck: 'Open Settings, Your page. Is there a picker for your colour?' },
        ],
      },
      {
        id: 'fonts',
        title: 'A font',
        body: "Fonts work the same way: <meta name=\"font:Text\" content=\"Georgia, serif\"> gives you a font picker, and var(--font-text) in your CSS. Any font people have on their computer works by name. For one from Google Fonts, paste its @import line at the very top of your CSS.",
        code: `<meta name="font:Text" content="Georgia, serif">

<h1>Hi, I'm Pat!</h1>
<p>I collect old radios and I'm trying to learn the banjo.</p>`,
        css: `@import url('https://fonts.googleapis.com/css2?family=Silkscreen&display=swap');

body {
  font-family: var(--font-text);
}

h1 {
  font-family: 'Silkscreen', monospace;
}`,
        live: false,
        checks: [
          { selfCheck: 'Does your heading show in the new font in the preview?' },
        ],
      },
      {
        id: 'own-css',
        title: 'The rest is CSS',
        body: "Anything else is ordinary CSS, in the CSS tab. Site styles on means the site's look sits underneath yours, and off means only yours counts. For a page that's all your own, I'd turn them off.",
        code: PAT_PAGE,
        css: `h1 {
  border-bottom: 3px double currentColor;
}

a {
  color: #b2432f;
}`,
        live: false,
        tips: [
          "The components page and What works here say which class names the site's own parts have, if you want to style those too.",
        ],
        checks: [
          { selfCheck: 'Did the preview change when you added your CSS?' },
        ],
      },
    ],
    wrapUp: "That's your page in your colours, with pickers for anyone who starts from it later. Next, if you've got an old page somewhere, I'll show you how to bring it over.",
  },

  {
    slug: 'bring-your-old-page',
    title: 'Bring your old page',
    lede: 'Got a page on Neocities, or an old GeoCities backup? Paste the whole thing in. Most of it just works, and this is what to do about the bits that don\'t.',
    shelf: 'start',
    steps: [
      {
        id: 'paste',
        title: 'Paste it in',
        body: "Copy everything from your old index.html and paste it into the HTML box. The <html>, <head> and <body> tags are set aside for you, and a <style> block moves itself to the CSS tab. Then look at the list under the code. It says what didn't make it, and which line it was on.",
        code: `<center>
  <h1>Pat's Radio Shack</h1>
  <marquee>Under construction since 2003</marquee>
  <p>Welcome to my corner of the web.</p>
</center>`,
        checks: [
          { tag: 'h1', hint: 'Paste your old page into the HTML box.' },
        ],
      },
      {
        id: 'pictures',
        title: 'Pictures',
        body: "Pictures from your old site don't come along with the page. Upload them on your Media page, press Copy link on each one, and swap the old address for the new one. A short address like construction.gif only ever worked on your old site.",
        code: `<!-- before: only worked on the old site -->
<!-- <img src="construction.gif"> -->

<img src="/assets/default-avatar.gif" alt="Under construction">`,
        checks: [
          { tag: 'img', hint: 'Put the new link from your Media page in the img tag.' },
        ],
      },
      {
        id: 'videos',
        title: 'Your videos and songs',
        body: "If your old page had a YouTube video on it, you'll see the iframe listed under \"Removed for safety\" when you save. That's on purpose: a whole other website running inside your page could see who's visiting, and I'd rather it didn't.\n\nSo instead, take the link out of the iframe's src and give it to <Embed>. The video waits behind a play button until someone clicks it, and only then does YouTube find out anyone was here. It works for Vimeo, Bandcamp, SoundCloud and Spotify too.",
        code: `<h2>Song of the week</h2>
<Embed src="https://www.youtube.com/watch?v=jNQXAC9IVRw" />`,
        tips: [
          'The /embed/ links YouTube puts in its iframe code work as well, so you can copy the src straight across.',
          "For Bandcamp, use the link from their embed code (Share, then Embed). Their normal album pages don't say which album to play.",
        ],
        checks: [
          { uses: 'Embed', hint: 'Swap the <iframe> for <Embed src="…" /> with the same link.' },
          { noProblems: true, hint: "Something is still being taken out. The list under the code says which line." },
        ],
      },
      {
        id: 'scripts',
        title: 'Buttons that did things',
        body: "onclick and <script> don't run here, so they're taken out. Most of what they used to do has a tag now. A click goes in an <OnClick> inside a <Button>, and an old hit counter or guestbook script becomes your <Guestbook />. The next lesson is all about buttons.",
        code: `<Var name="lights" type="boolean" initial="true" />

<Button>
  <OnClick>
    <Toggle var="lights" />
  </OnClick>
  Lights
</Button>

<If condition="lights">
  <p>The shack is open.</p>
</If>`,
        checks: [
          { inside: 'OnClick', parent: 'Button', hint: 'Put the <OnClick> straight inside the <Button>.' },
        ],
      },
    ],
    wrapUp: "Your old page lives here now, with its pictures, its videos and a guestbook that works. Next: making things on it do something when people click.",
  },

  {
    slug: 'things-people-can-click',
    title: 'Things people can click',
    lede: 'A button that counts, a mood that changes and a little quiz about you. This is the bit that would be JavaScript anywhere else.',
    shelf: 'start',
    steps: [
      {
        id: 'counter',
        title: 'A button that counts',
        body: "Let's make a button that counts how many people have waved at you. There are a few new tags in this one, so I'll go through them in order.\n\n<Var> makes a little box with a name on it and puts a number in it. It doesn't show anything by itself. <ShowVar> shows what's in the box. The <Button> has an <OnClick> inside it, and whatever is inside the OnClick happens when someone clicks. Here that's <Increment>, which adds one.\n\nPaste this in and click the button in the preview a few times.",
        code: `<Var name="waves" type="number" initial="0" />

<p>People have waved at me <ShowVar name="waves" /> times.</p>

<Button>
  <OnClick>
    <Increment var="waves" />
  </OnClick>
  Wave hello
</Button>`,
        tips: [
          "The count belongs to whoever is clicking. It starts again at 0 when they reload, and nobody else sees their number. (It's a toy, not a hit counter!)",
          "<Var> gets a name=. The tags that change it point at it with var=. ShowVar takes either one.",
        ],
        checks: [
          { varDeclared: 'waves', hint: "I can't find a <Var name=\"waves\">. It needs to be on the page for the others to find it." },
          { uses: 'Increment', props: { var: 'waves' }, hint: 'Your Increment needs var="waves" so it knows which box to add to.' },
          { inside: 'OnClick', parent: 'Button', hint: 'Put the <OnClick> inside the <Button>, before the words.' },
          { selfCheck: 'Click Wave hello in the preview. Did the number go up?' },
        ],
      },
      {
        id: 'mood',
        title: 'A mood that changes',
        body: "Now for something that isn't a number. This time the box holds a word, and <Cycle> swaps it for the next word in your list each time someone clicks. After the last one it goes back to the start.\n\nThe <If> at the bottom only shows what's inside it when the mood is grumpy. Change the moods to your own and see what happens.",
        code: `<Var name="mood" type="string" initial="sleepy" />

<p>Today I'm feeling <ShowVar name="mood" />.</p>

<Button>
  <OnClick>
    <Cycle var="mood" values="sleepy,sunny,grumpy" />
  </OnClick>
  Change my mood
</Button>

<If condition="mood" equals="grumpy">
  <p>Bring snacks.</p>
</If>`,
        tips: [
          "Write equals=\"grumpy\", not mood == 'grumpy'. If you've done some JavaScript that'll feel backwards, but it's the only way If can tell what you mean.",
          'Put a picture inside the If instead of words if you like. Anything can go in there.',
        ],
        checks: [
          { uses: 'Cycle', props: { var: 'mood' }, hint: 'Your Cycle needs var="mood" and a values list with commas between the moods.' },
          { uses: 'If', props: { condition: 'mood' }, hint: 'Give your If condition="mood" and an equals= with one of your moods.' },
          { noProblems: true, hint: 'Something on the page has a problem. The list under the code says which line.' },
        ],
      },
      {
        id: 'quiz',
        title: 'A tiny quiz about you',
        body: "A quiz is just a few buttons that each put a different answer in the same box, with an <If> for each answer underneath. <Set> is the one that puts a word in the box.\n\nMake it about you. Your first pet, your worst haircut, the radio you named. Your friends will love getting it wrong.",
        code: `<Var name="answer" type="string" initial="" />

<p>What did I name my first radio?</p>

<Button><OnClick><Set var="answer" value="Rosie" /></OnClick>Rosie</Button>
<Button><OnClick><Set var="answer" value="Static" /></OnClick>Static</Button>
<Button><OnClick><Set var="answer" value="Big Al" /></OnClick>Big Al</Button>

<If condition="answer" equals="Static">
  <p>Yes! It only ever played static, so it seemed fair.</p>
</If>
<If condition="answer" equals="Rosie">
  <p>Close, but Rosie is my bike.</p>
</If>
<If condition="answer" equals="Big Al">
  <p>Big Al is my neighbour's cat. Try again!</p>
</If>`,
        tips: [
          'Each answer gets its own If. There\'s an <Else>, but it only works inside an OnClick, so on the page itself one If per answer is the way.',
          'The words in value= and equals= have to match exactly, capitals and spaces included.',
        ],
        checks: [
          { uses: 'Set', props: { var: 'answer' }, hint: 'Each button needs a <Set var="answer" value="…"> inside its OnClick.' },
          { uses: 'If', props: { condition: 'answer' }, hint: 'Add an <If condition="answer" equals="…"> for the right answer.' },
          { selfCheck: 'Click each answer in the preview. Does the right reply show up?' },
        ],
      },
    ],
    wrapUp: "That's buttons that count, switch and remember an answer. Everything else in this part of the language is more of the same. Next: things that open and close.",
  },

  {
    slug: 'show-and-hide',
    title: 'Show and hide',
    lede: 'Spoilers, tabs, a secret that only shows when someone asks, and notes only you can see.',
    shelf: 'start',
    steps: [
      {
        id: 'reveal',
        title: 'A spoiler',
        body: "A <RevealBox> is a button that opens to show what's inside, and closes again. It's good for spoilers, long lists and the embarrassing photo.",
        code: `<RevealBox buttonText="The ending of my favourite book" revealText="Hide it again">
  <p>The lighthouse keeper was the narrator all along.</p>
</RevealBox>`,
        checks: [
          { uses: 'RevealBox', hint: 'Add a <RevealBox> with something inside it.' },
        ],
      },
      {
        id: 'tabs',
        title: 'Tabs',
        body: "<Tabs> puts a few things side by side and shows one at a time. Each <Tab> inside gets a title for its button, and the first one is open when the page loads.",
        code: `<Tabs>
  <Tab title="About me">
    <p>I fix old radios and I'm learning the banjo.</p>
  </Tab>
  <Tab title="Reading">
    <ul>
      <li>A Wizard of Earthsea</li>
      <li>Piranesi</li>
    </ul>
  </Tab>
</Tabs>`,
        checks: [
          { inside: 'Tab', parent: 'Tabs', hint: 'Each <Tab> goes inside the <Tabs>.' },
        ],
      },
      {
        id: 'secret',
        title: 'A secret on a switch',
        body: "This one you've nearly seen already. A <Var> that's true or false, a <Button> that flips it with <Toggle>, and an <If> that shows the secret while it's true.",
        code: `<Var name="showSecret" type="boolean" initial="false" />

<Button>
  <OnClick>
    <Toggle var="showSecret" />
  </OnClick>
  A confession
</Button>

<If condition="showSecret">
  <p>I still have my Tamagotchi. It's still alive.</p>
</If>`,
        checks: [
          { uses: 'Toggle', props: { var: 'showSecret' }, hint: 'Your Toggle needs var="showSecret".' },
          { selfCheck: 'Click the button twice in the preview. Does the secret show, then hide?' },
        ],
      },
      {
        id: 'just-for-you',
        title: 'Notes just for you',
        body: "Things inside <IfOwner> only show to you, signed in, on your own page. They're handy for notes to yourself. <IfVisitor> is the other way round: everyone sees it except you. Both are still sent along with the page, so don't put anything private in them.",
        code: `<IfOwner>
  <p>Note to self: answer the guestbook.</p>
</IfOwner>
<IfVisitor>
  <p>Thanks for stopping by. Sign the guestbook on your way out!</p>
</IfVisitor>`,
        checks: [
          { uses: 'IfOwner', hint: 'Put a note to yourself inside <IfOwner>.' },
        ],
      },
    ],
    wrapUp: "Now your page can keep a few things tucked away until someone asks. Next: little surprises, things that are a bit different every time.",
  },

  {
    slug: 'little-surprises',
    title: 'Little surprises',
    lede: 'A fortune that changes every visit, a button that recolours the page, and a count of your own visits.',
    shelf: 'start',
    steps: [
      {
        id: 'fortune',
        title: 'A fortune each visit',
        body: "A <Var> with type=\"random\" picks one of its <Option>s each time someone loads the page. Put as many in as you like.",
        code: `<Var name="fortune" type="random">
  <Option value="Someone is thinking about your guestbook entry." />
  <Option value="A song you forgot about is about to come back." />
  <Option value="Water your plants. Then drink some water too." />
</Var>

<p>Your fortune: <ShowVar name="fortune" /></p>`,
        checks: [
          { varDeclared: 'fortune', hint: 'Make a <Var name="fortune" type="random"> with a few <Option>s inside.' },
          { selfCheck: 'Reload the preview a few times. Does the fortune change?' },
        ],
      },
      {
        id: 'mood-colour',
        title: 'A button that recolours the page',
        body: "<SetCSSVar> sets a CSS variable, and everything that uses it changes at once. Here, the two buttons set --mood, and the paragraph's colour is var(--mood).",
        code: `<Button>
  <OnClick><SetCSSVar name="--mood" value="#b2432f" /></OnClick>
  Fired up
</Button>
<Button>
  <OnClick><SetCSSVar name="--mood" value="#2f5d7c" /></OnClick>
  Calm
</Button>

<p style="color: var(--mood)">This is the colour of my mood.</p>`,
        checks: [
          { uses: 'SetCSSVar', hint: 'Add a <SetCSSVar name="--mood" value="…"> inside a button\'s OnClick.' },
          { selfCheck: 'Click the buttons in the preview. Does the colour change?' },
        ],
      },
      {
        id: 'visits',
        title: 'Your visits',
        body: "persist=\"true\" keeps a <Var> in each visitor's own browser, so it's still there next time. <OnMount> runs once when the page loads, and here it adds one. Everyone gets their own count: nobody else sees it, so it's not a hit counter, more a \"welcome back\".",
        code: `<Var name="visits" type="number" initial="0" persist="true" />
<OnMount><Set var="visits" expression="$vars.visits + 1" /></OnMount>

<p>You've visited from this browser <ShowVar name="visits" /> times.</p>`,
        checks: [
          { uses: 'Var', props: { persist: 'true' }, hint: 'Give your Var persist="true" so it\'s kept.' },
          { selfCheck: 'Reload the preview. Did the number go up?' },
        ],
      },
    ],
    wrapUp: "That's the whole starter shelf. You've got a page with your own words, your own stuff, your colours and things to click. Tick \"Visitors can view my source\" and it goes in the showcase, where people can start from it. The lessons below go further, if you're curious.",
  },

  {
    slug: 'lists',
    title: 'Lists of your things',
    lede: 'Keep a list on your page, like the books you\'re reading, and let it grow and shrink.',
    shelf: 'further',
    steps: [
      {
        id: 'show-a-list',
        title: 'Show a list',
        body: "A <Var> with type=\"array\" holds a list, written as JSON in single quotes. <ForEach> repeats what's inside it once for each thing on the list, and {book} is the current one.",
        code: `<Var name="books" type="array" initial='["A Wizard of Earthsea", "Piranesi", "Momo"]' />

<ul>
  <ForEach var="books" item="book">
    <li>{book}</li>
  </ForEach>
</ul>`,
        tips: [
          'Inside a ForEach, write {book} in curly brackets. ShowVar can\'t show the current item.',
        ],
        checks: [
          { uses: 'ForEach', props: { var: 'books' }, hint: 'Add a <ForEach var="books" item="book">.' },
        ],
      },
      {
        id: 'add',
        title: 'Add to it',
        body: "A <TInput> is a text box that fills a variable as someone types. <Push> adds that to the end of the list.",
        code: `<Var name="books" type="array" initial='["Piranesi"]' />
<Var name="newBook" type="string" initial="" />

<TInput var="newBook" placeholder="A book" />
<Button>
  <OnClick><Push var="books" value="$vars.newBook" /></OnClick>
  Add it
</Button>

<ul>
  <ForEach var="books" item="book">
    <li>{book}</li>
  </ForEach>
</ul>`,
        tips: [
          "Anyone can add to it, but only in their own browser. It isn't saved to your page.",
        ],
        checks: [
          { uses: 'Push', props: { var: 'books' }, hint: 'Add a <Push var="books" value="$vars.newBook"> to the button.' },
        ],
      },
      {
        id: 'remove',
        title: 'Cross one off',
        body: "<RemoveAt> takes something off the list. Inside a ForEach you can leave out which one, and it takes the one it's next to.",
        code: `<Var name="books" type="array" initial='["Piranesi", "Momo", "Beloved"]' />

<ul>
  <ForEach var="books" item="book">
    <li>
      {book}
      <Button><OnClick><RemoveAt var="books" /></OnClick>Finished</Button>
    </li>
  </ForEach>
</ul>`,
        checks: [
          { uses: 'RemoveAt', hint: 'Add a <RemoveAt var="books" /> inside a button in the ForEach.' },
        ],
      },
    ],
    wrapUp: 'That\'s a list that grows and shrinks. Next, sorting it and picking things out of it.',
  },

  {
    slug: 'sorting-and-searching',
    title: 'Sorting and searching',
    lede: 'Put a list in order, and show only the things that match.',
    shelf: 'further',
    steps: [
      {
        id: 'sort',
        title: 'A to Z',
        body: "<Sort> makes a sorted copy of a list in another variable, and leaves the original as it was. by=\"item\" sorts the items themselves.",
        code: `<Var name="records" type="array" initial='["Stereolab", "Broadcast", "Cocteau Twins"]' />
<Var name="sorted" type="array" initial="[]" />

<Button>
  <OnClick><Sort var="records" target="sorted" by="item" /></OnClick>
  A to Z
</Button>

<ul>
  <ForEach var="sorted" item="record">
    <li>{record}</li>
  </ForEach>
</ul>`,
        checks: [
          { uses: 'Sort', hint: 'Add a <Sort var="…" target="…" by="item"> to a button.' },
        ],
      },
      {
        id: 'filter',
        title: 'Only the ones I haven\'t read',
        body: "For a list of things with a few details each, write each one as {\"title\": …, \"read\": …}. <Filter> keeps only the ones that pass a test, written with item: here, !item.read means not read yet.",
        code: `<Var name="books" type="array" initial='[{"title": "Kindred", "read": true}, {"title": "Piranesi", "read": false}]' />
<Var name="unread" type="array" initial="[]" />

<Button>
  <OnClick><Filter var="books" target="unread" where="!item.read" /></OnClick>
  What's left?
</Button>

<ul>
  <ForEach var="unread" item="book">
    <li>{book.title}</li>
  </ForEach>
</ul>`,
        tips: [
          '{book.title} shows one detail of the current item.',
        ],
        checks: [
          { uses: 'Filter', hint: 'Add a <Filter var="books" target="unread" where="!item.read"> to a button.' },
        ],
      },
    ],
    wrapUp: "I use this for my records page, so people can find the one album they came for. Next: things that move on their own.",
  },

  {
    slug: 'timing',
    title: 'Things that move on their own',
    lede: 'Weather that changes every few seconds, a knock at the door, a kettle that boils.',
    shelf: 'further',
    steps: [
      {
        id: 'interval',
        title: 'Every few seconds',
        body: "<OnInterval> runs what's inside it over and over, every seconds= seconds, for as long as the page is open.",
        code: `<Var name="weather" type="string" initial="sunny" />

<p>Outside my window it's <ShowVar name="weather" />.</p>

<OnInterval seconds="3">
  <Cycle var="weather" values="sunny,rainy,foggy,snowy" />
</OnInterval>`,
        tips: [
          "Keep it slow. Something changing every second is hard to read, and some people find it hard to look at.",
        ],
        checks: [
          { uses: 'OnInterval', hint: 'Put a <Cycle> inside an <OnInterval seconds="3">.' },
        ],
      },
      {
        id: 'delay',
        title: 'Wait a moment',
        body: "<Delay> waits, then runs what's inside it. Everything after it in the same OnClick happens straight away.",
        code: `<Var name="note" type="string" initial="" />

<Button>
  <OnClick>
    <Set var="note" value="Knock knock..." />
    <Delay seconds="2"><Set var="note" value="Who's there? Come on in." /></Delay>
  </OnClick>
  Knock
</Button>

<p><ShowVar name="note" /></p>`,
        checks: [
          { uses: 'Delay', hint: 'Put a <Set> inside a <Delay seconds="2"> in the button\'s OnClick.' },
        ],
      },
      {
        id: 'sequence',
        title: 'One thing after another',
        body: "<Sequence> runs a few <Step>s in order. Each Step can wait with delay=, in milliseconds, before it runs.",
        code: `<Var name="kettle" type="string" initial="Cold" />

<Button>
  <OnClick>
    <Sequence>
      <Step><Set var="kettle" value="Boiling..." /></Step>
      <Step delay="3000"><Set var="kettle" value="Tea's ready" /></Step>
    </Sequence>
  </OnClick>
  Put the kettle on
</Button>

<p>Kettle: <ShowVar name="kettle" /></p>`,
        checks: [
          { uses: 'Sequence', hint: 'Put a <Sequence> with two <Step>s in the button\'s OnClick.' },
        ],
      },
    ],
    wrapUp: "That's the language. Every component and what it does is on the components page, and the showcase has whole pages you can start from.",
  },
];

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find((l) => l.slug === slug);
}

/** The lesson after this one, on either shelf */
export function nextLesson(slug: string): Lesson | undefined {
  const i = lessons.findIndex((l) => l.slug === slug);
  return i >= 0 ? lessons[i + 1] : undefined;
}

/** Where the old tutorial addresses go (next.config.ts redirects) */
export const OLD_TUTORIALS: Record<string, string> = {
  'make-it-yours': '/build/html/make-it-yours',
  'your-first-template': '/build/html/things-people-can-click',
  'working-with-variables': '/build/html/things-people-can-click',
  'user-interactions': '/build/html/things-people-can-click',
  'conditional-logic': '/build/html/show-and-hide',
  'loops-and-lists': '/build/html/lists',
  'collection-operations': '/build/html/sorting-and-searching',
  'timing-and-sequences': '/build/html/timing',
  'advanced-state-management': '/build/html',
};
