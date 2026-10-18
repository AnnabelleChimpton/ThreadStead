// Entry point for `npm run dev`, `npm start` and pm2. The server itself is
// server.ts; tsx compiles it (and the lib/ modules it imports) on load.
/* eslint-disable @typescript-eslint/no-require-imports */
require('tsx/cjs/api').register();
require('./server.ts');
