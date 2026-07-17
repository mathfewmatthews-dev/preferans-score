import type { GameCommand, GameEvent, GameSnapshotEnvelope } from "../domain/game-event.ts";
import { canRebasePatch, createGameEvent, hashValue, applyPatch, GAME_SCHEMA_VERSION } from "../domain/game-event.ts";
import type { GameState } from "../domain/game-state.ts";
import { cloneGameState } from "../domain/game-state.ts";

export type SyncStatus = "idle" | "saving" | "synced" | "offline" | "conflict";

export interface CommitResult { snapshot: GameSnapshotEnvelope; duplicate: boolean }

export interface RemoteGameRepository {
  load(gameId: string): Promise<GameSnapshotEnvelope | null>;
  commit(event: GameEvent, state: GameState): Promise<CommitResult>;
  watch(gameId: string, onValue: (snapshot: GameSnapshotEnvelope) => void, onError: (error: unknown) => void): () => void;
}

export interface SyncCoordinatorOptions {
  gameId: string;
  clientId: string;
  initialSnapshot: GameSnapshotEnvelope;
  repository: RemoteGameRepository;
  pendingEvents?: GameEvent[];
  onRemoteState(state: GameState, snapshot: GameSnapshotEnvelope): void;
  onPendingChange(events: GameEvent[], snapshot: GameSnapshotEnvelope): void;
  onStatus(status: SyncStatus, error?: unknown): void;
}

export class SyncCoordinator {
  private snapshot: GameSnapshotEnvelope;
  private pending: GameEvent[];
  private unsubscribe: (() => void) | null = null;
  private flushing = false;

  constructor(private readonly options: SyncCoordinatorOptions) {
    this.snapshot = cloneGameState(options.initialSnapshot);
    this.pending = cloneGameState(options.pendingEvents || []);
  }

  start(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.options.repository.watch(this.options.gameId, (snapshot) => void this.acceptRemote(snapshot), (error) => {
      this.options.onStatus("offline", error);
    });
    void this.flush();
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  currentSnapshot(): GameSnapshotEnvelope { return cloneGameState(this.snapshot); }
  pendingEvents(): GameEvent[] { return cloneGameState(this.pending); }

  async stage(command: GameCommand, before: GameState, after: GameState): Promise<void> {
    const base = this.pending.length ? this.pending[this.pending.length - 1]!.revision : this.snapshot.revision;
    const event = await createGameEvent({ gameId: this.options.gameId, baseRevision: base, clientId: this.options.clientId, command, before, after });
    this.pending.push(event);
    this.options.onPendingChange(this.pendingEvents(), this.currentSnapshot());
    await this.flush();
  }

  async flush(): Promise<void> {
    if (this.flushing || !this.pending.length) return;
    this.flushing = true;
    this.options.onStatus("saving");
    try {
      while (this.pending.length) {
        let event = this.pending[0]!;
        const state = applyPatch(this.snapshot.state, event.patch);
        if (event.baseRevision !== this.snapshot.revision) {
          if (!canRebasePatch(this.snapshot.state, this.snapshot.state, event.patch)) throw new Error("Конфликт параллельных изменений.");
          event = await createGameEvent({
            gameId: this.options.gameId,
            baseRevision: this.snapshot.revision,
            clientId: this.options.clientId,
            command: event.command,
            before: this.snapshot.state,
            after: state,
            eventId: event.eventId,
          });
          this.pending[0] = event;
        }
        const result = await this.options.repository.commit(event, state);
        this.snapshot = result.snapshot;
        this.pending.shift();
        this.options.onPendingChange(this.pendingEvents(), this.currentSnapshot());
      }
      this.options.onStatus("synced");
    } catch (error) {
      const remote = await this.options.repository.load(this.options.gameId).catch(() => null);
      if (remote && remote.revision > this.snapshot.revision) await this.acceptRemote(remote);
      else this.options.onStatus(error instanceof Error && /conflict|ревизи/i.test(error.message) ? "conflict" : "offline", error);
    } finally {
      this.flushing = false;
    }
  }

  private async acceptRemote(remote: GameSnapshotEnvelope): Promise<void> {
    if (remote.revision < this.snapshot.revision) return;
    if (remote.revision === this.snapshot.revision && remote.stateHash === this.snapshot.stateHash) return;
    if (this.pending.length) {
      const first = this.pending[0]!;
      if (!canRebasePatch(this.snapshot.state, remote.state, first.patch)) {
        this.options.onStatus("conflict", new Error("Удалённая партия изменилась в тех же полях."));
        return;
      }
      const rebasedState = applyPatch(remote.state, first.patch);
      this.pending[0] = await createGameEvent({ gameId: this.options.gameId, baseRevision: remote.revision, clientId: this.options.clientId, command: first.command, before: remote.state, after: rebasedState, eventId: first.eventId });
    }
    this.snapshot = { ...cloneGameState(remote), schemaVersion: GAME_SCHEMA_VERSION, stateHash: await hashValue(remote.state) };
    this.options.onRemoteState(cloneGameState(remote.state), this.currentSnapshot());
    this.options.onPendingChange(this.pendingEvents(), this.currentSnapshot());
    if (this.pending.length) void this.flush();
  }
}
