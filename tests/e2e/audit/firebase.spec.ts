import { expect, test } from "@playwright/test";
import { deleteApp, initializeApp } from "firebase/app";
import { deleteDoc, doc, getDoc, getFirestore, runTransaction, serverTimestamp } from "firebase/firestore";
import { createGameEvent, hashValue } from "../../../src/domain/game-event";
import type { GameState } from "../../../src/domain/game-state";
import { openCleanApp } from "./ui-driver";

test("Firebase v2 event transaction is explicitly opt-in and isolated", async ({ page }) => {
  test.info().annotations.push({ type: "auditCategory", description: "sync" });
  test.skip(process.env.PREFERANS_FIREBASE_E2E !== "1", "Set PREFERANS_FIREBASE_E2E=1 to permit an isolated remote write.");
  await openCleanApp(page);
  const config = await page.evaluate(() => (window as typeof window & { FIREBASE_CONFIG?: Record<string, string> }).FIREBASE_CONFIG || null);
  expect(config, "Firebase config must be explicitly available before remote smoke").toBeTruthy();
  const app = initializeApp(config!, `e2e-${Date.now()}`);
  const db = getFirestore(app);
  const gameId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const gameRef = doc(db, "games", gameId);
  const state: GameState = {
    convention: "Сочи", poolTarget: 20, players: ["E2E 1", "E2E 2", "E2E 3"], pool: [0, 0, 0], mountain: [0, 0, 0],
    whists: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], history: [], scoreLog: null, gameId,
  };
  const event = await createGameEvent({ gameId, baseRevision: 0, clientId: "playwright", command: { type: "game-created", payload: {} }, before: state, after: state });
  const eventRef = doc(db, "games", gameId, "events", event.eventId);
  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(eventRef, {
        schemaVersion: 2, eventId: event.eventId, gameId, baseRevision: 0, revision: 1,
        beforeHash: event.beforeHash, afterHash: event.afterHash,
        eventJson: JSON.stringify(event), createdAt: serverTimestamp(),
      });
      transaction.set(gameRef, { schemaVersion: 2, gameId, revision: 1, stateJson: JSON.stringify(state), stateHash: await hashValue(state), updatedAt: serverTimestamp(), clientUpdatedAt: Date.now(), testOnly: true, expiresAt: Date.now() + 3_600_000 });
    });
    expect((await getDoc(gameRef)).exists()).toBe(true);
    expect((await getDoc(eventRef)).exists()).toBe(true);
  } finally {
    await deleteDoc(eventRef).catch(() => undefined);
    await deleteDoc(gameRef).catch(() => undefined);
    await deleteApp(app);
  }
});
