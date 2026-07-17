import type { GameEvent, GameSnapshotEnvelope } from "../domain/game-event.ts";
import { GAME_SCHEMA_VERSION, hashValue } from "../domain/game-event.ts";
import type { GameState } from "../domain/game-state.ts";
import { assertValidGameState, cloneGameState } from "../domain/game-state.ts";

export const LOCAL_FORMAT = "preferans-local-v2" as const;

export interface LocalGameEnvelope {
  format: typeof LOCAL_FORMAT;
  schemaVersion: typeof GAME_SCHEMA_VERSION;
  started: true;
  gameId: string;
  revision: number;
  stateHash: string;
  state: GameState;
  pendingEvents: GameEvent[];
  savedAt: number;
}

export interface LoadedLocalGame {
  envelope: LocalGameEnvelope;
  migratedFromV1: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class LocalGameRepository {
  constructor(private readonly storage: StorageLike, private readonly backupLimit = 50) {}

  async load(key: string, expectedGameId?: string | null): Promise<LoadedLocalGame | null> {
    const raw = this.storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.format === LOCAL_FORMAT && parsed.schemaVersion === GAME_SCHEMA_VERSION) {
      const envelope = parsed as unknown as LocalGameEnvelope;
      this.assertEnvelope(envelope, expectedGameId);
      return { envelope: cloneGameState(envelope), migratedFromV1: false };
    }
    const legacyState = parsed.started === true && parsed.state && typeof parsed.state === "object"
      ? parsed.state as GameState
      : null;
    if (!legacyState) throw new Error("Неизвестный формат локального сохранения.");
    assertValidGameState(legacyState);
    const gameId = String(legacyState.gameId || expectedGameId || "");
    if (!gameId || (expectedGameId && gameId !== expectedGameId)) throw new Error("Локальное сохранение относится к другой партии.");
    const stateHash = await hashValue(legacyState);
    return {
      migratedFromV1: true,
      envelope: {
        format: LOCAL_FORMAT,
        schemaVersion: GAME_SCHEMA_VERSION,
        started: true,
        gameId,
        revision: 0,
        stateHash,
        state: cloneGameState(legacyState),
        pendingEvents: [],
        savedAt: Date.now(),
      },
    };
  }

  save(key: string, envelope: LocalGameEnvelope): void {
    this.assertEnvelope(envelope, envelope.gameId);
    const previous = this.storage.getItem(key);
    if (previous) this.saveBackup(key, previous, envelope.revision);
    this.storage.setItem(key, JSON.stringify(envelope));
  }

  remove(key: string): void {
    this.storage.removeItem(key);
    const index = this.readBackupIndex(key);
    index.forEach((entry) => this.storage.removeItem(entry.key));
    this.storage.removeItem(this.backupIndexKey(key));
  }

  backups(key: string): Array<{ revision: number; savedAt: number; key: string }> {
    return this.readBackupIndex(key);
  }

  restoreBackup(key: string, backupKey: string): void {
    const value = this.storage.getItem(backupKey);
    if (!value) throw new Error("Резервная ревизия не найдена.");
    this.storage.setItem(key, value);
  }

  private assertEnvelope(envelope: LocalGameEnvelope, expectedGameId?: string | null): void {
    if (envelope.format !== LOCAL_FORMAT || envelope.schemaVersion !== GAME_SCHEMA_VERSION) throw new Error("Неверная версия локального сохранения.");
    if (expectedGameId && envelope.gameId !== expectedGameId) throw new Error("Сохранение относится к другой партии.");
    if (!Number.isInteger(envelope.revision) || envelope.revision < 0) throw new Error("Некорректная локальная ревизия.");
    assertValidGameState(envelope.state);
  }

  private saveBackup(key: string, value: string, revision: number): void {
    const savedAt = Date.now();
    const backupKey = `${this.backupNamespace(key)}.${revision}.${savedAt}`;
    const index = this.readBackupIndex(key);
    try {
      this.storage.setItem(backupKey, value);
      index.push({ revision, savedAt, key: backupKey });
      while (index.length > this.backupLimit) {
        const removed = index.shift();
        if (removed) this.storage.removeItem(removed.key);
      }
      this.storage.setItem(this.backupIndexKey(key), JSON.stringify(index));
    } catch {
      const removed = index.shift();
      if (removed) this.storage.removeItem(removed.key);
    }
  }

  private readBackupIndex(key: string): Array<{ revision: number; savedAt: number; key: string }> {
    try {
      const value = JSON.parse(this.storage.getItem(this.backupIndexKey(key)) || "[]");
      return Array.isArray(value) ? value.filter((entry) => entry && typeof entry.key === "string") : [];
    } catch {
      return [];
    }
  }

  private backupIndexKey(key: string): string {
    return `${this.backupNamespace(key)}.index`;
  }

  private backupNamespace(key: string): string {
    return `preferans.revisions.v2.${encodeURIComponent(key)}`;
  }
}

export async function createLocalEnvelope(snapshot: GameSnapshotEnvelope, pendingEvents: GameEvent[] = []): Promise<LocalGameEnvelope> {
  assertValidGameState(snapshot.state);
  const stateHash = await hashValue(snapshot.state);
  return {
    format: LOCAL_FORMAT,
    schemaVersion: GAME_SCHEMA_VERSION,
    started: true,
    gameId: snapshot.gameId,
    revision: snapshot.revision,
    stateHash,
    state: cloneGameState(snapshot.state),
    pendingEvents: cloneGameState(pendingEvents),
    savedAt: Date.now(),
  };
}
