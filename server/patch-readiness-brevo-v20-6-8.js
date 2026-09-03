import fs from 'node:fs';

const file='server/index.js';
const marker='READINESS_BREVO_V20_6_8';
let s=fs.readFileSync(file,'utf8');

if(!s.includes(marker)){
  const old=`    smtp: (process.env.EMAIL_MODE || "console") === "smtp"\n      ? Boolean(\n          process.env.SMTP_HOST &&\n          process.env.SMTP_USER &&\n          process.env.SMTP_PASSWORD\n        )\n      : false,`;
  const replacement=`    email: (() => { /* ${marker} */\n      const mode=String(process.env.EMAIL_MODE || "console").toLowerCase();\n      if(mode==="brevo") return Boolean(\n        process.env.BREVO_API_KEY &&\n        (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM)\n      );\n      if(mode==="smtp") return Boolean(\n        process.env.SMTP_HOST &&\n        process.env.SMTP_USER &&\n        process.env.SMTP_PASSWORD &&\n        process.env.EMAIL_FROM\n      );\n      return mode==="console" && (process.env.APP_STAGE || "")!=="production";\n    })(),`;
  if(!s.includes(old)) throw new Error('Readiness SMTP anchor not found');
  s=s.replace(old,replacement);
  s=s.replace('"smtp",\n    "storage_writable"','"email",\n    "storage_writable"');
  fs.writeFileSync(file,s,'utf8');
}

console.log('Readiness now validates the configured email provider (Brevo/SMTP).');
