import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.resolve(process.env.DATA_DIR || "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "cv-france.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  token_version INTEGER NOT NULL DEFAULT 0,
  email_verified INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS profiles (user_id INTEGER PRIMARY KEY,data_json TEXT NOT NULL DEFAULT '{}',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS cv_documents (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,title TEXT NOT NULL DEFAULT 'Mon CV',target_role TEXT DEFAULT '',data_json TEXT NOT NULL DEFAULT '{}',is_primary INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS cover_letters (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,title TEXT NOT NULL DEFAULT 'Lettre de motivation',company TEXT DEFAULT '',target_role TEXT DEFAULT '',content TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,company TEXT NOT NULL,role TEXT NOT NULL,applied_date TEXT,status TEXT NOT NULL DEFAULT 'Envoyée',notes TEXT DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS email_verification_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,token_hash TEXT UNIQUE NOT NULL,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS password_reset_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,token_hash TEXT UNIQUE NOT NULL,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,rating INTEGER,category TEXT NOT NULL DEFAULT 'general',message TEXT NOT NULL,page TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'open',admin_note TEXT DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,event_type TEXT NOT NULL,event_data TEXT DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS beta_invites (id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE NOT NULL,label TEXT DEFAULT '',max_uses INTEGER NOT NULL DEFAULT 1,used_count INTEGER NOT NULL DEFAULT 0,is_active INTEGER NOT NULL DEFAULT 1,expires_at TEXT,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS beta_invite_uses (id INTEGER PRIMARY KEY AUTOINCREMENT,invite_id INTEGER NOT NULL,user_id INTEGER NOT NULL,used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(invite_id) REFERENCES beta_invites(id) ON DELETE CASCADE,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS client_errors (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,message TEXT NOT NULL,source TEXT DEFAULT '',line INTEGER,column_no INTEGER,stack TEXT DEFAULT '',page TEXT DEFAULT '',user_agent TEXT DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS ai_usage (user_id INTEGER NOT NULL,usage_day TEXT NOT NULL,request_count INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id, usage_day),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
`);

const cols = db.prepare("PRAGMA table_info(users)").all().map(x => x.name);
const migrations = [
  ["token_version", "ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0"],
  ["email_verified", "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0"],
  ["stripe_customer_id", "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT"],
  ["stripe_subscription_id", "ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT"],
  ["subscription_status", "ALTER TABLE users ADD COLUMN subscription_status TEXT"]
];
for (const [name, sql] of migrations) if (!cols.includes(name)) db.exec(sql);
const feedbackCols = db.prepare("PRAGMA table_info(feedback)").all().map(x => x.name);
if (!feedbackCols.includes("status")) db.exec("ALTER TABLE feedback ADD COLUMN status TEXT NOT NULL DEFAULT 'open'");
if (!feedbackCols.includes("admin_note")) db.exec("ALTER TABLE feedback ADD COLUMN admin_note TEXT DEFAULT ''");
if (!feedbackCols.includes("updated_at")) db.exec("ALTER TABLE feedback ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
export { dbPath };
export default db;
