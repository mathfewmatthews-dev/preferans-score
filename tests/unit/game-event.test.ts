import { describe, expect, it } from "vitest";
import { applyPatch, createGameEvent, hashValue, replayEvents, type GameSnapshotEnvelope } from "../../src/domain/game-event";
import type { GameState } from "../../src/domain/game-state";

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    convention: "Сочи", poolTarget: 20, players: ["A", "B", "C"], pool: [0, 0, 0], mountain: [0, 0, 0],
    whists: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], history: [], scoreLog: null, gameId: "abcdefghijklmnop", ...overrides,
  };
}

describe("game events", () => {
  it("creates a deterministic patch without mutating either state", async () => {
    const before = state();
    const after = state({ pool: [2, 0, 0], history: ["12:00 | 6 взяток"] });
    const event = await createGameEvent({ gameId: "abcdefghijklmnop", baseRevision: 0, clientId: "client", command: { type: "record-added", payload: { contract: 6 } }, before, after });
    expect(event.revision).toBe(1);
    expect(event.patch.changes.pool).toEqual([2, 0, 0]);
    expect(applyPatch(before, event.patch)).toEqual(after);
    expect(before.pool).toEqual([0, 0, 0]);
  });

  it("detects a damaged hash chain", async () => {
    const before = state();
    const after = state({ pool: [2, 0, 0] });
    const event = await createGameEvent({ gameId: "abcdefghijklmnop", baseRevision: 0, clientId: "client", command: { type: "record-added", payload: {} }, before, after });
    const base: GameSnapshotEnvelope = { schemaVersion: 2, gameId: "abcdefghijklmnop", revision: 0, state: before, stateHash: await hashValue(before), updatedAt: 0 };
    await expect(replayEvents(base, [{ ...event, afterHash: "damaged" }])).rejects.toThrow("не воспроизводит");
  });
});
