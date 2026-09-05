import { restoreDatabase } from './recovery.js';
try { await restoreDatabase(process.argv[2]); console.log('PostgreSQL restore completed in the separate isolated target.'); }
catch { console.error('Restore refused or failed. Check the isolated recovery runbook and archive.'); process.exitCode=1; }
