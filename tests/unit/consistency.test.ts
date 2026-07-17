import { describe, expect, it } from "vitest";
import { auditSnapshot } from "../../src/audit/consistency";
import { hashValue, type GameSnapshotEnvelope } from "../../src/domain/game-event";
import type { GameState } from "../../src/domain/game-state";

describe("database consistency audit", () => {
  it("reports a scoreLog that disagrees with the snapshot", async () => {
    const state: GameState = {
      convention: "Сочи", poolTarget: 20, players: ["A", "B", "C"], pool: [2, 0, 0], mountain: [0, 0, 0],
      whists: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], history: [], gameId: "abcdefghijklmnop",
      scoreLog: { pool: [[0], [0], [0]], mountain: [[0], [0], [0]], whists: [[[0], [0], [0]], [[0], [0], [0]], [[0], [0], [0]]] },
    };
    const snapshot: GameSnapshotEnvelope = { schemaVersion: 2, gameId: "abcdefghijklmnop", revision: 0, state, stateHash: await hashValue(state), updatedAt: 0 };
    const result = await auditSnapshot(snapshot);
    expect(result.valid).toBe(false);
    expect(result.issues.some((entry) => entry.code === "POOL_LOG_MISMATCH")).toBe(true);
  });
});
