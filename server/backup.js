import { backupDatabase } from './recovery.js';
try { await backupDatabase(process.argv[2]); console.log('PostgreSQL backup and checksum created.'); }
catch { console.error('Backup refused or failed. Check the isolated recovery runbook and tooling.'); process.exitCode=1; }
