import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { deleteApp, initializeApp } from "firebase/app";
import { collection, doc, getDoc, getDocs, getFirestore, orderBy, query, terminate } from "firebase/firestore";
import { auditSnapshot } from "../src/audit/consistency.ts";
import { GAME_SCHEMA_VERSION, hashValue } from "../src/domain/game-event.ts";

const outputDir = path.resolve("database-audit-results");
const requestedIds = process.argv.slice(2).filter((value) => /^[A-Za-z0-9_-]{16,64}$/.test(value));

globalThis.window = {};
await import("../firebase-config.js");
const config = globalThis.window.FIREBASE_CONFIG;
delete globalThis.window;
if (!config?.projectId) throw new Error("В firebase-config.js отсутствует конфигурация проекта.");

const app = initializeApp(config, `read-only-audit-${Date.now()}`);
const db = getFirestore(app);
const snapshots = requestedIds.length
  ? await Promise.all(requestedIds.map((id) => getDoc(doc(db, "games", id))))
  : (await getDocs(collection(db, "games"))).docs;
const results = [];

for (const snapshot of snapshots) {
  if (!snapshot.exists()) {
    results.push(failed(snapshot.id, "NOT_FOUND", "Документ не найден."));
    continue;
  }
  const data = snapshot.data();
  try {
    const envelope = await parseSnapshot(snapshot.id, data);
    const eventSnapshots = data.schemaVersion === GAME_SCHEMA_VERSION
      ? (await getDocs(query(collection(db, "games", snapshot.id, "events"), orderBy("revision")))).docs
      : [];
    const audit = await auditSnapshot(envelope, eventSnapshots.map((item) => parseEvent(item.data())));
    results.push({ game: pseudonym(snapshot.id), ...audit });
  } catch (error) {
    results.push(failed(snapshot.id, "PARSE_FAILED", error instanceof Error ? error.message : "Не удалось прочитать документ.", data));
  }
}

await terminate(db);
await deleteApp(app);
const report = {
  generatedAt: new Date().toISOString(),
  mode: "public-rules-read-only",
  gameCount: results.length,
  validCount: results.filter((item) => item.valid).length,
  invalidCount: results.filter((item) => !item.valid).length,
  games: results,
};
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "firestore-public-audit.json"), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(outputDir, "firestore-public-audit.md"), markdown(report));
console.log(`Проверено партий: ${report.gameCount}; корректных: ${report.validCount}; с ошибками: ${report.invalidCount}.`);
console.log(path.join(outputDir, "firestore-public-audit.md"));
process.exitCode = report.invalidCount ? 1 : 0;

async function parseSnapshot(gameId, data) {
  if (data.schemaVersion === GAME_SCHEMA_VERSION) {
    if (typeof data.stateJson !== "string") throw new Error("В v2-документе отсутствует stateJson.");
    return { schemaVersion: GAME_SCHEMA_VERSION, gameId, revision: Number(data.revision || 0), state: JSON.parse(data.stateJson), stateHash: String(data.stateHash || ""), updatedAt: data.updatedAt?.toMillis?.() || 0 };
  }
  const state = typeof data.stateJson === "string" ? JSON.parse(data.stateJson) : data.state;
  if (!state || typeof state !== "object") throw new Error("В legacy-документе отсутствует состояние.");
  return { schemaVersion: GAME_SCHEMA_VERSION, gameId, revision: 0, state, stateHash: await hashValue(state), updatedAt: data.updatedAt?.toMillis?.() || Number(data.clientUpdatedAt || 0) };
}

function parseEvent(data) {
  if (typeof data.eventJson !== "string") throw new Error("В событии отсутствует eventJson.");
  return JSON.parse(data.eventJson);
}

function failed(gameId, code, message, data = {}) {
  return { game: pseudonym(gameId), valid: false, schemaVersion: Number(data.schemaVersion || 1), revision: Number(data.revision || 0), eventCount: 0, issues: [{ code, path: "$", message, severity: "error" }] };
}

function pseudonym(gameId) {
  return createHash("sha256").update(gameId).digest("hex").slice(0, 12);
}

function markdown(report) {
  const lines = ["# Firestore consistency audit", "", `Generated: ${report.generatedAt}`, `Mode: **${report.mode}**`, `Games: ${report.gameCount}; valid: ${report.validCount}; invalid: ${report.invalidCount}`, ""];
  for (const game of report.games) {
    lines.push(`## ${game.game} — ${game.valid ? "PASS" : "FAIL"}`, "", `Schema: ${game.schemaVersion}; revision: ${game.revision}; events: ${game.eventCount}`, "");
    for (const item of game.issues) lines.push(`- ${item.severity.toUpperCase()} ${item.code} (${item.path}): ${item.message}`);
    lines.push("");
  }
  return lines.join("\n");
}
