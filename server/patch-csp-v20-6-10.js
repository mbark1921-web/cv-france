import fs from "fs";
import path from "path";

const file = path.resolve("server/index.js");
let text = fs.readFileSync(file, "utf8");

const oldLine = 'app.use(helmet({ contentSecurityPolicy: false }));';
const newBlock = `app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));`;

if (text.includes(newBlock)) {
  console.log("CSP patch already applied.");
  process.exit(0);
}

if (!text.includes(oldLine)) {
  throw new Error("Helmet CSP anchor not found");
}

text = text.replace(oldLine, newBlock);
fs.writeFileSync(file, text, "utf8");
console.log("Enabled production CSP with compatibility directives.");
