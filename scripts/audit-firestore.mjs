import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { auditSnapshot } from "../src/audit/consistency.ts";
import { GAME_SCHEMA_VERSION, hashValue } from "../src/domain/game-event.ts";

const outputDir = path.resolve("database-audit-results");
const requestedIds = process.argv.slice(2).filter((value) => /^[A-Za-z0-9_-]{16,64}$/.test(value));

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
  console.error("Для read-only production-аудита задайте GOOGLE_APPLICATION_CREDENTIALS. Файл credentials не должен находиться в репозитории.");
  process.exit(2);
}

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: process.env.GCLOUD_PROJECT || "preferans-score" });
const db = getFirestore(app);
const documents = requestedIds.length
  ? await Promise.all(requestedIds.map((id) => db.collection("games").doc(id).get()))
  : (await db.collection("games").get()).docs;

const results = [];
for (const document of documents) {
  if (!document.exists) {
    results.push({ game: pseudonym(document.id), valid: false, schemaVersion: 0, revision: 0, eventCount: 0, issues: [{ code: "NOT_FOUND", path: "$", message: "Документ не найден.", severity: "error" }] });
    continue;
  }
  const data = document.data();
  try {
    const snapshot = await parseSnapshot(document.id, data);
    const eventDocs = data.schemaVersion === GAME_SCHEMA_VERSION
      ? (await document.ref.collection("events").orderBy("revision").get()).docs
      : [];
    const events = eventDocs.map((item) => parseEvent(item.data()));
    const audit = await auditSnapshot(snapshot, events);
    results.push({ game: pseudonym(document.id), ...audit });
  } catch (error) {
    results.push({ game: pseudonym(document.id), valid: false, schemaVersion: Number(data.schemaVersion || 1), revision: Number(data.revision || 0), eventCount: 0, issues: [{ code: "PARSE_FAILED", path: "$", message: error instanceof Error ? error.message : "Не удалось прочитать документ.", severity: "error" }] });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: "read-only",
  gameCount: results.length,
  validCount: results.filter((item) => item.valid).length,
  invalidCount: results.filter((item) => !item.valid).length,
  games: results,
};
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "firestore-audit.json"), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(outputDir, "firestore-audit.md"), markdown(report));
console.log(`Проверено партий: ${report.gameCount}; корректных: ${report.validCount}; с ошибками: ${report.invalidCount}.`);
console.log(path.join(outputDir, "firestore-audit.md"));
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

function pseudonym(gameId) {
  return createHash("sha256").update(gameId).digest("hex").slice(0, 12);
}

function markdown(report) {
  const lines = ["# Firestore consistency audit", "", `Generated: ${report.generatedAt}`, "Mode: **read-only**", `Games: ${report.gameCount}; valid: ${report.validCount}; invalid: ${report.invalidCount}`, ""];
  for (const game of report.games) {
    lines.push(`## ${game.game} — ${game.valid ? "PASS" : "FAIL"}`, "", `Schema: ${game.schemaVersion}; revision: ${game.revision}; events: ${game.eventCount}`, "");
    for (const item of game.issues) lines.push(`- ${item.severity.toUpperCase()} ${item.code} (${item.path}): ${item.message}`);
    lines.push("");
  }
  return lines.join("\n");
}
