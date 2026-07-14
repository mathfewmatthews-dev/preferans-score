import { expect, test, type Page } from "@playwright/test";
import { contractDelta, conventions, gameValue } from "./oracle";
import { clickHeaderAction, openCleanApp, recordContract, recordManual, recordMisere, recordRaspass, snapshot, startGame } from "./ui-driver";

function category(type: string) { test.info().annotations.push({ type: "auditCategory", description: type }); }

async function expectNoPageErrors(page: Page, action: () => Promise<void>) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await action();
  expect(errors).toEqual([]);
}

test.beforeEach(async ({ page }) => openCleanApp(page));

test("Сочи: контракты 6–10, журнал и undo/redo", async ({ page }) => {
  test.setTimeout(180_000);
  category("history");
  await expectNoPageErrors(page, async () => {
    await startGame(page, "Сочи", 3);
    for (const contract of [6, 7, 8, 9, 10]) {
      const record = { contract, declarer: 0, roles: ["Играет", "Вист", "Пас"], tricks: [contract, 10 - contract, 0] };
      await recordContract(page, record);
      const actual = await snapshot(page);
      const expected = contractDelta(3, conventions["Сочи"], record);
      expect(actual.pool).toEqual(expected.pool);
      expect(actual.mountain).toEqual(expected.mountain);
      expect(actual.whists).toEqual(expected.whists);
      await expect(page.locator("#historyList li")).toHaveCount(1);
      await clickHeaderAction(page, "#undoButton");
      expect((await snapshot(page)).history).toHaveLength(0);
      await clickHeaderAction(page, "#redoButton");
      expect((await snapshot(page)).history).toHaveLength(1);
      await clickHeaderAction(page, "#undoButton");
      await expect.poll(async () => (await snapshot(page)).history.length).toBe(0);
      await expect.poll(async () => (await snapshot(page)).pool).toEqual([0, 0, 0]);
    }
  });
});

test("Питер: жлобский вист, ремиз и прогрессия 6-7-8", async ({ page }) => {
  category("progressions");
  await startGame(page, "Питер", 3);
  const remiz = { contract: 7, declarer: 0, roles: ["Играет", "Вист", "Пас"], tricks: [6, 4, 0] };
  await recordContract(page, remiz);
  let actual = await snapshot(page);
  const expected = contractDelta(3, conventions["Питер"], remiz);
  expect(actual.mountain).toEqual(expected.mountain);
  expect(actual.whists).toEqual(expected.whists);

  await clickHeaderAction(page, "#undoButton");
  await recordRaspass(page, [0, 3, 7]);
  actual = await snapshot(page);
  expect(actual.pool).toEqual([gameValue(6), 0, 0]);
  expect(actual.mountain).toEqual([0, 6, 14]);
  expect(actual.raspassLevel).toBe(1);
  await expect(page.locator("#possibleGamesList")).toContainText("Сейчас 7");
  await recordRaspass(page, [1, 3, 6]);
  actual = await snapshot(page);
  expect(actual.mountain).toEqual([4, 18, 38]);
  expect(actual.raspassLevel).toBe(2);
});

test("Ростов: гора списывается перед пулей и распасы пишутся вистами", async ({ page }) => {
  category("calculations");
  await startGame(page, "Ростов", 3);
  await recordManual(page, 0, "Гора", 5);
  await recordContract(page, { contract: 8, declarer: 0, roles: ["Играет", "Вист", "Пас"], tricks: [8, 2, 0] });
  let actual = await snapshot(page);
  expect(actual.mountain[0]).toBe(0);
  expect(actual.pool[0]).toBe(1);
  await clickHeaderAction(page, "#undoButton");
  await clickHeaderAction(page, "#undoButton");
  await recordRaspass(page, [0, 3, 7]);
  actual = await snapshot(page);
  expect(actual.mountain).toEqual([0, 0, 0]);
  expect(actual.whists[0]).toEqual([0, 6, 14]);
});

test("Мизер: успешная запись, ремиз и выход по настройке", async ({ page }) => {
  category("calculations");
  await startGame(page, "Сочи", 3);
  await recordMisere(page, 0, [0, 5, 5]);
  let actual = await snapshot(page);
  expect(actual.pool[0]).toBe(10);
  expect(actual.history.at(-1)).toContain("Мизер");
  await clickHeaderAction(page, "#undoButton");
  await recordMisere(page, 0, [2, 4, 4]);
  actual = await snapshot(page);
  expect(actual.mountain[0]).toBe(20);
});

test("Своя конвенция: параметры создаются через UI и влияют на расчёт", async ({ page }) => {
  category("calculations");
  await clickHeaderAction(page, "#conventionButton");
  await page.locator('[data-convention-setting="gamePenaltyMultiplier"]').fill("2");
  await page.locator('[data-convention-setting="underThreeLoss"]').check();
  await page.locator('[data-convention-setting="raspassProgression"]').selectOption("cycle-6-7-8");
  await page.locator("#conventionName").fill("Аудит");
  await page.locator("#closeConventionButton").click();
  await startGame(page, "Аудит", 3);
  await page.locator("#floatingRecordButton").click();
  await page.locator('[data-type="Взятки"]').click();
  await page.locator('[data-declarer="0"]').click();
  await page.locator('[data-contract="6"]').click();
  await page.locator("#nextStepButton").click();
  await expect(page.locator('[data-under-three="0"]')).toBeVisible();
  await page.locator("#closeRecordButton").click();
  await recordContract(page, { contract: 6, declarer: 0, roles: ["Играет", "Вист", "Пас"], tricks: [3, 4, 3] });
  const actual = await snapshot(page);
  expect(actual.convention).toBe("Аудит");
  expect(actual.mountain[0]).toBe(12);
  expect(actual.whists[1][0]).toBe(10);
  expect(actual.whists[2][0]).toBe(10);
  expect(actual.customConventions).toHaveLength(1);
});

test("Составы 3/4/5 игроков и отдыхающий", async ({ page }) => {
  test.setTimeout(120_000);
  category("record-wizard");
  for (const playerCount of [3, 4, 5]) {
    await openCleanApp(page);
    await startGame(page, "Сочи", playerCount);
    expect((await snapshot(page)).players).toHaveLength(playerCount);
    await recordManual(page, 0, "Пуля", 1);
    expect((await snapshot(page)).pool[0]).toBe(1);
  }

  await openCleanApp(page);
  await page.locator("#playerCount").selectOption("4");
  await clickHeaderAction(page, "#conventionButton");
  await page.locator('[data-convention-setting="restingTalonPool"]').check();
  await page.locator("#conventionName").fill("Отдыхающий");
  await page.locator("#closeConventionButton").click();
  await startGame(page, "Отдыхающий", 4);
  await recordContract(page, { contract: 6, declarer: 0, roles: ["Играет", "Вист", "Пас", "Отдыхает"], tricks: [6, 4, 0, 2] });
  const actual = await snapshot(page);
  expect(actual.whists[3][0]).toBe(4);
});
