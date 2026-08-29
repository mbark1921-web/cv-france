import crypto from "crypto";
export function createRawToken(bytes=32){return crypto.randomBytes(bytes).toString("hex")}
export function hashToken(raw){return crypto.createHash("sha256").update(raw).digest("hex")}
export function futureIso(minutes){return new Date(Date.now()+minutes*60_000).toISOString()}
