import fs from 'fs';
import path from 'path';

const file=path.resolve('server/index.js');
let source=fs.readFileSync(file,'utf8');
const marker='EMAIL_READINESS_V20_5_7';

if(!source.includes(marker)){
  const oldCheck=`    smtp: (process.env.EMAIL_MODE || "console") === "smtp"
      ? Boolean(
          process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASSWORD
        )
      : false,
    stripe:`;
  const newCheck=`    /* EMAIL_READINESS_V20_5_7 */
    email: (() => {
      const mode=String(process.env.EMAIL_MODE || "console").toLowerCase();
      if(mode==="brevo") {
        return Boolean(
          process.env.BREVO_API_KEY &&
          (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM)
        );
      }
      if(mode==="smtp") {
        return Boolean(
          process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASSWORD &&
          process.env.EMAIL_FROM
        );
      }
      return false;
    })(),
    smtp: (process.env.EMAIL_MODE || "console") === "smtp"
      ? Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
      : false,
    brevo: (process.env.EMAIL_MODE || "console") === "brevo"
      ? Boolean(process.env.BREVO_API_KEY && (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM))
      : false,
    stripe:`;
  if(!source.includes(oldCheck))throw new Error('Readiness email check anchor not found');
  source=source.replace(oldCheck,newCheck);
  source=source.replace('    "smtp",\n    "storage_writable"','    "email",\n    "storage_writable"');
}

if(!source.includes(marker))throw new Error('Brevo readiness patch failed');
if(!source.includes('    "email",\n    "storage_writable"'))throw new Error('Public readiness still does not require generic email');
fs.writeFileSync(file,source,'utf8');
console.log('Updated readiness checks for Brevo and SMTP email.');
