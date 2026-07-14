import { expect, test } from "@playwright/test";
import { openCleanApp } from "./ui-driver";

test("Firebase sync smoke is explicitly opt-in", async ({ page }) => {
  test.info().annotations.push({ type: "auditCategory", description: "sync" });
  test.skip(process.env.PREFERANS_FIREBASE_E2E !== "1", "Set PREFERANS_FIREBASE_E2E=1 to permit an isolated remote write.");
  await openCleanApp(page);
  const configured = await page.evaluate(() => Boolean((window as typeof window & { FIREBASE_CONFIG?: unknown }).FIREBASE_CONFIG));
  expect(configured, "Firebase config must be explicitly available before remote smoke").toBe(true);
  const result = await page.evaluate(async () => {
    const runtime = window as typeof window & { firebase?: { firestore(): { collection(name: string): { doc(id: string): { set(value: unknown): Promise<void>; get(): Promise<{ exists: boolean }>; delete(): Promise<void> } } } } };
    if (!runtime.firebase) throw new Error("Firebase runtime is unavailable");
    const id = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const doc = runtime.firebase.firestore().collection("games").doc(id);
    try {
      await doc.set({ e2e: true, createdAt: Date.now() });
      const saved = await doc.get();
      return { id, exists: saved.exists };
    } finally {
      await doc.delete();
    }
  });
  expect(result.exists).toBe(true);
  expect(result.id).toMatch(/^e2e-/);
});
