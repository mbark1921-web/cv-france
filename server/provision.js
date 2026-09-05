import { provisionDatabase } from './recovery.js';
try { await provisionDatabase(); console.log('PostgreSQL migrations verified and applied.'); }
catch { console.error('Provisioning refused or failed. Check the isolated recovery runbook and migration history.'); process.exitCode=1; }
