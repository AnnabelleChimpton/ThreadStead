// Runs in each test worker before any module loads: point the app's db
// client (lib/config/database/connection.ts) at the throwaway database.
import { testDatabaseUrl } from './config'

process.env.DATABASE_URL = testDatabaseUrl()
