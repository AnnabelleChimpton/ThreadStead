// Game Corner: a homepage with a game of tic-tac-toe on it. The starter to
// read for lists (<Var type="array">), loops (<ForEach>), clicks on
// anything (<OnClick> in a div), and checks across a list (some, every,
// map with an arrow). Each part of the game has a comment saying what it does.

export const GAME_CORNER = `<meta name="color:Page" content="#e9e4f5">
<meta name="color:Paper" content="#fffdf8">
<meta name="color:Ink" content="#2e2a3b">
<meta name="color:X" content="#c2415d">
<meta name="color:O" content="#2f6690">
<meta name="font:Text" content="'Trebuchet MS', 'Segoe UI', sans-serif">
<meta name="font:Board" content="'Courier New', Courier, monospace">
<style>
body {
  background: var(--color-page);
  margin: 0;
}

.profile-template-root {
  color: var(--color-ink);
  font-family: var(--font-text);
  line-height: 1.6;
  min-height: 100vh;
  padding: 2.5rem 1.25rem 4rem;
}

.corner {
  max-width: 34rem;
  margin: 0 auto;
}

.corner-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.corner-header h1 {
  font-size: 2.2rem;
  margin: 0;
}

.card {
  background: var(--color-paper);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  box-shadow: 4px 4px 0 var(--color-ink);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

h2 {
  font-size: 1.2rem;
  margin: 0 0 0.75rem;
}

/* The game */
.game {
  text-align: center;
}

.status {
  font-family: var(--font-board);
  font-weight: 700;
  margin: 0 0 1rem;
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  max-width: 18rem;
  margin: 0 auto 1rem;
}

/* One square. class="cell mark-{cell}" gives it mark-X, mark-O or mark-
   when it's empty, so each mark gets its own colour */
.cell {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  font: 700 2.4rem var(--font-board);
  background: #fff;
  border: 2px solid var(--color-ink);
  border-radius: 8px;
  animation: pop 0.3s ease-out both;
}

.cell:hover {
  background: var(--color-page);
}

.mark-X {
  color: var(--color-x);
}

.mark-O {
  color: var(--color-o);
}

/* Each square pops in a moment after the last (style="animation-delay…") */
@keyframes pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
}

/* Your buttons (<Button>) */
.corner .template-button {
  background: var(--color-ink);
  color: var(--color-paper);
  border: 0;
  border-radius: 999px;
  padding: 0.45rem 1.25rem;
}

a {
  color: var(--color-o);
}

a:focus-visible,
button:focus-visible,
textarea:focus-visible,
[role="button"]:focus-visible {
  outline: 3px solid var(--color-o);
  outline-offset: 2px;
}

/* Phones: a smaller name and board */
@media (max-width: 600px) {
  .corner-header h1 {
    font-size: 1.7rem;
  }

  .cell {
    font-size: 1.9rem;
  }
}

/* For visitors who'd rather things didn't move: no popping in */
@media (prefers-reduced-motion: reduce) {
  .cell {
    animation: none;
  }
}
</style>

<div class="corner">
  <div class="corner-header">
    <DisplayName as="h1" />
    <p>Welcome to my corner! Pull up a chair and play a round.</p>
  </div>

  <div class="card game">
    <h2>Tic-tac-toe</h2>

    <!-- The board: nine squares, each "", "X" or "O" -->
    <Var name="board" type="array" initial='["","","","","","","","",""]' />
    <Var name="turn" type="string" initial="X" />
    <!-- The eight ways to win: three squares in a row, by their places 0 to 8 -->
    <Var name="lines" type="array" initial="[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]" />
    <!-- Worked out again whenever the board changes: the winner's mark, or nothing -->
    <Var name="winner" type="computed" expression="lines.map(l => board[l[0]] == board[l[1]] && board[l[1]] == board[l[2]] ? board[l[0]] : '').join('').charAt(0)" />
    <Var name="full" type="computed" expression="board.every(c => c != '')" />

    <If data="$vars.winner"><p class="status"><ShowVar name="winner" /> wins!</p></If>
    <If data="$vars.winner" not>
      <If data="$vars.full"><p class="status">It's a draw.</p></If>
      <If data="$vars.full" not><p class="status"><ShowVar name="turn" />'s turn</p></If>
    </If>

    <div class="board">
      <!-- One square for each place on the board: cell is what's in it, i where it is -->
      <ForEach var="board" item="cell" index="i">
        <div class="cell mark-{cell}" style="animation-delay: calc({i} * 50ms)">
          <!-- A click on an empty square, before anyone has won, puts this turn's mark there -->
          <OnClick>
            <If data="cell" equals="">
              <If data="$vars.winner" not>
                <Set var="board" expression="board.slice(0, i).concat([turn]).concat(board.slice(i + 1))" />
                <Set var="turn" expression="turn == 'X' ? 'O' : 'X'" />
              </If>
            </If>
          </OnClick>
          {cell}
        </div>
      </ForEach>
    </div>

    <Button>
      <OnClick>
        <Reset var="board" />
        <Reset var="turn" />
      </OnClick>
      New game
    </Button>
  </div>

  <div class="card">
    <h2>About me</h2>
    <p>Write a little about yourself here. What games you love, what you're making, who you'd challenge to a rematch.</p>
  </div>

  <div class="card">
    <h2>Guestbook</h2>
    <Guestbook heading="none" />
  </div>
</div>`;
