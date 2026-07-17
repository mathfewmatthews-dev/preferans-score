import { describe, expect, it } from "vitest";
import { LocalGameRepository, createLocalEnvelope, type StorageLike } from "../../src/persistence/local-game-repository";
import { hashValue, type GameSnapshotEnvelope } from "../../src/domain/game-event";
import type { GameState } from "../../src/domain/game-state";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) || null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const gameState = (): GameState => ({ convention: "Сочи", poolTarget: 20, players: ["A", "B", "C"], pool: [0, 0, 0], mountain: [0, 0, 0], whists: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], history: [], scoreLog: null, gameId: "abcdefghijklmnop" });

describe("LocalGameRepository", () => {
  it("migrates a legacy autosave without deleting it", async () => {
    const storage = new MemoryStorage();
    storage.setItem("game", JSON.stringify({ started: true, state: gameState() }));
    const loaded = await new LocalGameRepository(storage).load("game", "abcdefghijklmnop");
    expect(loaded?.migratedFromV1).toBe(true);
    expect(loaded?.envelope.revision).toBe(0);
    expect(storage.getItem("game")).not.toBeNull();
  });

  it("keeps bounded revisions separately from the current save", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalGameRepository(storage, 2);
    const state = gameState();
    const snapshot: GameSnapshotEnvelope = { schemaVersion: 2, gameId: "abcdefghijklmnop", revision: 0, state, stateHash: await hashValue(state), updatedAt: 0 };
    repository.save("game", await createLocalEnvelope(snapshot));
    snapshot.revision = 1; repository.save("game", await createLocalEnvelope(snapshot));
    snapshot.revision = 2; repository.save("game", await createLocalEnvelope(snapshot));
    snapshot.revision = 3; repository.save("game", await createLocalEnvelope(snapshot));
    expect(repository.backups("game")).toHaveLength(2);
    expect(JSON.parse(storage.getItem("game") || "{}").revision).toBe(3);
  });
});
