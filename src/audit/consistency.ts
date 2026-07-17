import type { GameEvent, GameSnapshotEnvelope } from "../domain/game-event.ts";
import { GAME_SCHEMA_VERSION, hashValue, replayEvents } from "../domain/game-event.ts";
import { validateGameState, type GameState, type StateValidationIssue } from "../domain/game-state.ts";

export interface ConsistencyIssue extends StateValidationIssue { code: string }

export interface GameAuditResult {
  valid: boolean;
  schemaVersion: number;
  revision: number;
  eventCount: number;
  issues: ConsistencyIssue[];
}

const issue = (code: string, path: string, message: string, severity: "error" | "warning" = "error"): ConsistencyIssue => ({ code, path, message, severity });

export async function auditSnapshot(snapshot: GameSnapshotEnvelope, events: GameEvent[] = []): Promise<GameAuditResult> {
  const issues: ConsistencyIssue[] = validateGameState(snapshot.state).map((entry) => ({ ...entry, code: "STATE_INVALID" }));
  if (snapshot.schemaVersion !== GAME_SCHEMA_VERSION) issues.push(issue("SCHEMA_UNSUPPORTED", "schemaVersion", `Ожидалась схема ${GAME_SCHEMA_VERSION}.`));
  if (!Number.isInteger(snapshot.revision) || snapshot.revision < 0) issues.push(issue("REVISION_INVALID", "revision", "Ревизия должна быть неотрицательным целым числом."));
  const calculatedHash = await hashValue(snapshot.state);
  if (snapshot.stateHash !== calculatedHash) issues.push(issue("SNAPSHOT_HASH_MISMATCH", "stateHash", "Хеш снимка не соответствует состоянию."));
  issues.push(...scoreLogIssues(snapshot.state));
  if (events.length) {
    try {
      const first = [...events].sort((left, right) => left.revision - right.revision)[0]!;
      if (first.baseRevision !== 0) issues.push(issue("EVENTS_INCOMPLETE", "events", "Набор событий начинается не с нулевой ревизии.", "warning"));
      else {
        const baseState = reverseFirstPatch(snapshot.state, first);
        const base: GameSnapshotEnvelope = { schemaVersion: GAME_SCHEMA_VERSION, gameId: snapshot.gameId, revision: 0, state: baseState, stateHash: await hashValue(baseState), updatedAt: 0 };
        const replayed = await replayEvents(base, events);
        if (replayed.revision !== snapshot.revision || replayed.stateHash !== snapshot.stateHash) issues.push(issue("EVENT_REPLAY_MISMATCH", "events", "События не воспроизводят текущий снимок."));
      }
    } catch (error) {
      issues.push(issue("EVENT_CHAIN_INVALID", "events", error instanceof Error ? error.message : "Не удалось воспроизвести события."));
    }
  } else if (snapshot.revision > 0) {
    issues.push(issue("EVENTS_MISSING", "events", "Для ненулевой ревизии отсутствуют события."));
  }
  return { valid: !issues.some((entry) => entry.severity === "error"), schemaVersion: snapshot.schemaVersion, revision: snapshot.revision, eventCount: events.length, issues };
}

function scoreLogIssues(state: GameState): ConsistencyIssue[] {
  const scoreLog = state.scoreLog as { pool?: number[][]; mountain?: number[][]; whists?: number[][][] } | null;
  if (!scoreLog) return [issue("SCORE_LOG_MISSING", "scoreLog", "Отсутствует история значений счёта.", "warning")];
  const issues: ConsistencyIssue[] = [];
  state.players.forEach((_player, index) => {
    if (last(scoreLog.pool?.[index]) !== state.pool[index]) issues.push(issue("POOL_LOG_MISMATCH", `scoreLog.pool.${index}`, "Последнее значение не совпадает с пулей."));
    if (last(scoreLog.mountain?.[index]) !== state.mountain[index]) issues.push(issue("MOUNTAIN_LOG_MISMATCH", `scoreLog.mountain.${index}`, "Последнее значение не совпадает с горой."));
    state.players.forEach((_target, target) => {
      if (last(scoreLog.whists?.[index]?.[target]) !== state.whists[index]?.[target]) issues.push(issue("WHIST_LOG_MISMATCH", `scoreLog.whists.${index}.${target}`, "Последнее значение не совпадает с вистами."));
    });
  });
  return issues;
}

function last(values?: number[]): number | undefined { return Array.isArray(values) ? values[values.length - 1] : undefined; }

function reverseFirstPatch(current: GameState, event: GameEvent): GameState {
  const base = structuredClone(current) as Record<string, unknown>;
  Object.entries(event.patch.previous).forEach(([key, value]) => { base[key] = structuredClone(value); });
  Object.keys(event.patch.changes).filter((key) => !(key in event.patch.previous)).forEach((key) => delete base[key]);
  return base as GameState;
}
