import { describe, expect, it } from "vitest";
import { hashValue, type GameEvent, type GameSnapshotEnvelope } from "../../src/domain/game-event";
import type { GameState } from "../../src/domain/game-state";
import { SyncCoordinator, type RemoteGameRepository, type SyncStatus } from "../../src/sync/sync-coordinator";

const baseState = (): GameState => ({ convention: "Сочи", poolTarget: 20, players: ["A", "B", "C"], pool: [0, 0, 0], mountain: [0, 0, 0], whists: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], history: [], scoreLog: null, gameId: "abcdefghijklmnop" });

class FakeRepository implements RemoteGameRepository {
  watchers: Array<(snapshot: GameSnapshotEnvelope) => void> = [];
  events: GameEvent[] = [];
  constructor(public snapshot: GameSnapshotEnvelope) {}
  async load() { return structuredClone(this.snapshot); }
  watch(_gameId: string, onValue: (snapshot: GameSnapshotEnvelope) => void) { this.watchers.push(onValue); return () => {}; }
  async commit(event: GameEvent, state: GameState) {
    const duplicate = this.events.some((item) => item.eventId === event.eventId);
    if (duplicate) return { snapshot: structuredClone(this.snapshot), duplicate: true };
    if (event.baseRevision !== this.snapshot.revision) throw new Error(`revision conflict ${event.baseRevision}/${this.snapshot.revision}`);
    const stateHash = await hashValue(state);
    // Firestore transactions retry when the document changes during commit.
    // Recheck after the async work so the fake has the same atomicity guarantee.
    if (event.baseRevision !== this.snapshot.revision) throw new Error(`revision conflict ${event.baseRevision}/${this.snapshot.revision}`);
    this.events.push(structuredClone(event));
    this.snapshot = { schemaVersion: 2, gameId: event.gameId, revision: event.revision, state: structuredClone(state), stateHash, updatedAt: Date.now() };
    this.watchers.forEach((watcher) => watcher(structuredClone(this.snapshot)));
    return { snapshot: structuredClone(this.snapshot), duplicate: false };
  }
}

describe("SyncCoordinator", () => {
  it("keeps a conflicting local event pending instead of overwriting remote state", async () => {
    const state = baseState();
    const snapshot: GameSnapshotEnvelope = { schemaVersion: 2, gameId: "abcdefghijklmnop", revision: 0, state, stateHash: await hashValue(state), updatedAt: 0 };
    const repository = new FakeRepository(snapshot);
    const statuses: SyncStatus[] = [];
    const first = coordinator("one", repository, snapshot, statuses);
    const second = coordinator("two", repository, snapshot, statuses);
    first.start(); second.start();
    const firstState = baseState(); firstState.mountain[0] = 2;
    const secondState = baseState(); secondState.mountain[0] = 4;
    await Promise.all([
      first.stage({ type: "manual-adjustment", payload: {} }, state, firstState),
      second.stage({ type: "manual-adjustment", payload: {} }, state, secondState),
    ]);
    await eventually();
    expect([2, 4]).toContain(repository.snapshot.state.mountain[0]);
    expect(first.pendingEvents().length + second.pendingEvents().length).toBe(1);
    expect(statuses).toContain("conflict");
  });

  it("treats a retried event idempotently", async () => {
    const state = baseState();
    const snapshot: GameSnapshotEnvelope = { schemaVersion: 2, gameId: "abcdefghijklmnop", revision: 0, state, stateHash: await hashValue(state), updatedAt: 0 };
    const repository = new FakeRepository(snapshot);
    const client = coordinator("one", repository, snapshot, []);
    client.start();
    const after = baseState(); after.pool[0] = 2;
    await client.stage({ type: "record-added", payload: {} }, state, after);
    await eventually();
    expect(repository.events).toHaveLength(1);
    expect(client.pendingEvents()).toHaveLength(0);
  });
});

function coordinator(clientId: string, repository: RemoteGameRepository, snapshot: GameSnapshotEnvelope, statuses: SyncStatus[]) {
  return new SyncCoordinator({ gameId: snapshot.gameId, clientId, repository, initialSnapshot: snapshot, onRemoteState() {}, onPendingChange() {}, onStatus(status) { statuses.push(status); } });
}

const eventually = () => new Promise((resolve) => setTimeout(resolve, 20));
