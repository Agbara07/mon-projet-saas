import path from 'path'
import dotenv from 'dotenv'
// Doit être importé EN PREMIER dans index.ts — charge .env avant que les providers lisent process.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
