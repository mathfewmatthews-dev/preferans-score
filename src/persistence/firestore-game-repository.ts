import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import { GAME_SCHEMA_VERSION, hashValue, type GameEvent, type GameSnapshotEnvelope } from "../domain/game-event.ts";
import type { GameState } from "../domain/game-state.ts";
import { assertValidGameState, cloneGameState } from "../domain/game-state.ts";
import type { CommitResult, RemoteGameRepository } from "../sync/sync-coordinator.ts";

export class RevisionConflictError extends Error {
  constructor(readonly expected: number, readonly actual: number) {
    super(`Конфликт ревизии: ожидалась ${expected}, в Firestore находится ${actual}.`);
    this.name = "RevisionConflictError";
  }
}

export interface FirestoreRepositoryOptions {
  config: FirebaseOptions;
  normalizeLegacyState(value: unknown): GameState;
}

export class FirestoreGameRepository implements RemoteGameRepository {
  private readonly db: Firestore;

  constructor(private readonly options: FirestoreRepositoryOptions) {
    const app = getApps()[0] || initializeApp(options.config);
    this.db = getFirestore(app);
  }

  async load(gameId: string): Promise<GameSnapshotEnvelope | null> {
    const snapshot = await getDoc(doc(this.db, "games", gameId));
    if (!snapshot.exists()) return null;
    return this.parseSnapshot(gameId, snapshot.data());
  }

  watch(gameId: string, onValue: (snapshot: GameSnapshotEnvelope) => void, onError: (error: unknown) => void): () => void {
    return onSnapshot(doc(this.db, "games", gameId), (snapshot) => {
      if (!snapshot.exists()) return;
      void this.parseSnapshot(gameId, snapshot.data()).then(onValue).catch(onError);
    }, onError);
  }

  async commit(event: GameEvent, state: GameState): Promise<CommitResult> {
    assertValidGameState(state);
    const gameRef = doc(this.db, "games", event.gameId);
    const eventRef = doc(this.db, "games", event.gameId, "events", event.eventId);
    const backupRef = doc(this.db, "games", event.gameId, "backups", "legacy-v1");
    return runTransaction(this.db, async (transaction) => {
      const [gameSnapshot, existingEvent] = await Promise.all([transaction.get(gameRef), transaction.get(eventRef)]);
      const data = gameSnapshot.exists() ? gameSnapshot.data() : null;
      const actualRevision = data?.schemaVersion === GAME_SCHEMA_VERSION ? Number(data.revision || 0) : 0;
      if (existingEvent.exists()) {
        const current = data ? await this.parseSnapshot(event.gameId, data) : null;
        if (!current) throw new Error("Повтор события найден без снимка партии.");
        return { snapshot: current, duplicate: true };
      }
      if (actualRevision !== event.baseRevision) throw new RevisionConflictError(event.baseRevision, actualRevision);
      if (data && data.schemaVersion !== GAME_SCHEMA_VERSION) {
        transaction.set(backupRef, { schemaVersion: 1, sourceJson: JSON.stringify(data), migratedAt: serverTimestamp() });
      }
      const stateHash = await hashValue(state);
      transaction.set(eventRef, {
        schemaVersion: GAME_SCHEMA_VERSION,
        eventId: event.eventId,
        gameId: event.gameId,
        baseRevision: event.baseRevision,
        revision: event.revision,
        beforeHash: event.beforeHash,
        afterHash: event.afterHash,
        eventJson: JSON.stringify(event),
        createdAt: serverTimestamp(),
      });
      transaction.set(gameRef, {
        schemaVersion: GAME_SCHEMA_VERSION,
        gameId: event.gameId,
        revision: event.revision,
        stateJson: JSON.stringify(state),
        stateHash,
        updatedAt: serverTimestamp(),
        clientUpdatedAt: event.clientCreatedAt,
      });
      return {
        duplicate: false,
        snapshot: {
          schemaVersion: GAME_SCHEMA_VERSION,
          gameId: event.gameId,
          revision: event.revision,
          state: cloneGameState(state),
          stateHash,
          updatedAt: event.clientCreatedAt,
        },
      };
    });
  }

  private async parseSnapshot(gameId: string, data: Record<string, unknown>): Promise<GameSnapshotEnvelope> {
    if (data.schemaVersion === GAME_SCHEMA_VERSION && typeof data.stateJson === "string") {
      const state = JSON.parse(data.stateJson) as GameState;
      assertValidGameState(state);
      return {
        schemaVersion: GAME_SCHEMA_VERSION,
        gameId,
        revision: Number(data.revision || 0),
        state,
        stateHash: String(data.stateHash || await hashValue(state)),
        updatedAt: timestampMillis(data.updatedAt) || Number(data.clientUpdatedAt || Date.now()),
      };
    }
    let legacy: unknown = data.state;
    if (typeof data.stateJson === "string") legacy = JSON.parse(data.stateJson);
    const state = this.options.normalizeLegacyState(legacy);
    assertValidGameState(state);
    return { schemaVersion: GAME_SCHEMA_VERSION, gameId, revision: 0, state, stateHash: await hashValue(state), updatedAt: timestampMillis(data.updatedAt) || Number(data.clientUpdatedAt || 0) };
  }
}

function timestampMillis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") return Number(value.toMillis());
  return 0;
}
