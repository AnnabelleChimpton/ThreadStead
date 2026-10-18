/**
 * pm2 config for the Indie Index nightly job (SEARCH_PLAN.md §3.5).
 * Separate from the web app, so deploy.sh never restarts it mid-run.
 *
 * Once, on the server in ~/threadstead:
 *   pm2 start ecosystem.indie-index.config.cjs && pm2 save
 *
 * pm2 runs it straight away on that first start, then every night at 03:15
 * server time. It exits when it's done; autorestart is off so pm2 doesn't
 * start it again until the next night. Logs: pm2 logs threadstead-index
 */
module.exports = {
  apps: [
    {
      name: 'threadstead-index',
      cwd: __dirname,
      script: 'node_modules/.bin/tsx',
      args: 'scripts/indie-index-refresh.ts',
      interpreter: 'none',
      cron_restart: '15 3 * * *',
      autorestart: false,
      env: { NODE_ENV: 'production' },
    },
  ],
}
