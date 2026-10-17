/**
 * Side-effect import for tsx scripts: loads .env exactly as the Next server
 * does. Import it FIRST — app modules read env when they are imported.
 */
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())
