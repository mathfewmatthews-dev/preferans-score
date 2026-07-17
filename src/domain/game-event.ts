import type { GameState, JsonValue } from "./game-state.ts";
import { assertValidGameState, cloneGameState } from "./game-state.ts";

export const GAME_SCHEMA_VERSION = 2 as const;

export type GameEventType =
  | "game-created"
  | "record-added"
  | "manual-adjustment"
  | "pool-extended"
  | "convention-changed"
  | "settings-changed"
  | "scores-calculated"
  | "undo"
  | "redo"
  | "state-migrated";

export interface GameCommand {
  type: GameEventType;
  payload: Record<string, JsonValue>;
}

export interface StatePatch {
  previous: Record<string, JsonValue>;
  changes: Record<string, JsonValue>;
  removed: string[];
}

export interface GameEvent {
  schemaVersion: typeof GAME_SCHEMA_VERSION;
  eventId: string;
  gameId: string;
  baseRevision: number;
  revision: number;
  clientId: string;
  command: GameCommand;
  patch: StatePatch;
  beforeHash: string;
  afterHash: string;
  clientCreatedAt: number;
}

export interface GameSnapshotEnvelope {
  schemaVersion: typeof GAME_SCHEMA_VERSION;
  gameId: string;
  revision: number;
  state: GameState;
  stateHash: string;
  updatedAt: number;
}

function jsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(jsonValue);
  if (typeof value === "object") {
    const result: Record<string, JsonValue> = {};
    Object.keys(value as Record<string, unknown>).sort().forEach((key) => {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined && typeof item !== "function" && typeof item !== "symbol") result[key] = jsonValue(item);
    });
    return result;
  }
  return null;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(jsonValue(value));
}

export async function hashValue(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

export function diffState(before: GameState, after: GameState): StatePatch {
  const previous: Record<string, JsonValue> = {};
  const changes: Record<string, JsonValue> = {};
  const removed: string[] = [];
  const beforeRecord = before as Record<string, unknown>;
  const afterRecord = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);
  keys.forEach((key) => {
    if (!(key in afterRecord)) {
      previous[key] = jsonValue(beforeRecord[key]);
      removed.push(key);
      return;
    }
    if (!(key in beforeRecord) || canonicalJson(beforeRecord[key]) !== canonicalJson(afterRecord[key])) {
      previous[key] = jsonValue(beforeRecord[key]);
      changes[key] = jsonValue(afterRecord[key]);
    }
  });
  return { previous, changes, removed: removed.sort() };
}

export function applyPatch(state: GameState, patch: StatePatch): GameState {
  const next = cloneGameState(state) as Record<string, unknown>;
  patch.removed.forEach((key) => delete next[key]);
  Object.entries(patch.changes).forEach(([key, value]) => { next[key] = cloneGameState(value); });
  assertValidGameState(next);
  return next;
}

export function canRebasePatch(base: GameState, latest: GameState, patch: StatePatch): boolean {
  return Object.entries(patch.previous).every(([key, previous]) => canonicalJson((latest as Record<string, unknown>)[key]) === canonicalJson(previous)
    || canonicalJson((base as Record<string, unknown>)[key]) === canonicalJson((latest as Record<string, unknown>)[key]));
}

export async function createGameEvent(input: {
  gameId: string;
  baseRevision: number;
  clientId: string;
  command: GameCommand;
  before: GameState;
  after: GameState;
  eventId?: string;
}): Promise<GameEvent> {
  assertValidGameState(input.before);
  assertValidGameState(input.after);
  return {
    schemaVersion: GAME_SCHEMA_VERSION,
    eventId: input.eventId || crypto.randomUUID(),
    gameId: input.gameId,
    baseRevision: input.baseRevision,
    revision: input.baseRevision + 1,
    clientId: input.clientId,
    command: cloneGameState(input.command),
    patch: diffState(input.before, input.after),
    beforeHash: await hashValue(input.before),
    afterHash: await hashValue(input.after),
    clientCreatedAt: Date.now(),
  };
}

export async function replayEvents(base: GameSnapshotEnvelope, events: GameEvent[]): Promise<GameSnapshotEnvelope> {
  let state = cloneGameState(base.state);
  let revision = base.revision;
  let hash = await hashValue(state);
  for (const event of [...events].sort((left, right) => left.revision - right.revision)) {
    if (event.baseRevision !== revision || event.revision !== revision + 1) throw new Error(`Нарушена последовательность ревизий у события ${event.eventId}.`);
    if (event.beforeHash !== hash) throw new Error(`Нарушена цепочка хешей у события ${event.eventId}.`);
    state = applyPatch(state, event.patch);
    hash = await hashValue(state);
    if (event.afterHash !== hash) throw new Error(`Событие ${event.eventId} не воспроизводит заявленное состояние.`);
    revision = event.revision;
  }
  return { schemaVersion: GAME_SCHEMA_VERSION, gameId: base.gameId, revision, state, stateHash: hash, updatedAt: Date.now() };
}
