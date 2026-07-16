import { expect, test } from "@playwright/test";
import { clickHeaderAction, openCleanApp, recordManual, snapshot, startGame } from "./ui-driver";

function category(type: string) { test.info().annotations.push({ type: "auditCategory", description: type }); }

test.beforeEach(async ({ page }) => openCleanApp(page));

test("autosave восстанавливает игру после перезагрузки", async ({ page }) => {
  category("persistence");
  await startGame(page, "Сочи", 3);
  await recordManual(page, 0, "Гора", 7);
  const before = await snapshot(page);
  await page.reload();
  await expect(page.locator("body")).toHaveClass(/game-started/);
  const after = await snapshot(page);
  expect(after.mountain).toEqual(before.mountain);
  expect(after.history).toEqual(before.history);
  await expect(page.locator("#historyList")).toContainText("Ручной ввод");
});

test("экспорт и импорт возвращают расчётное состояние", async ({ page }) => {
  category("persistence");
  await startGame(page, "Питер", 3);
  await recordManual(page, 1, "Висты", 12, 0);
  const expected = await snapshot(page);
  const downloadPromise = page.waitForEvent("download");
  await clickHeaderAction(page, "#saveButton");
  const download = await downloadPromise;
  const file = await download.path();
  expect(file).toBeTruthy();
  await clickHeaderAction(page, "#newGameButton");
  await expect(page.locator("#appConfirmTitle")).toHaveText("Начать новую игру?");
  await page.locator("#confirmAppConfirmButton").click();
  await expect(page.locator("body")).not.toHaveClass(/game-started/);
  await page.locator("#loadInput").setInputFiles(file!);
  await expect(page.locator("body")).toHaveClass(/game-started/);
  const actual = await snapshot(page);
  expect(actual.players).toEqual(expected.players);
  expect(actual.whists).toEqual(expected.whists);
  expect(actual.history).toEqual(expected.history);
});

test("неполный мастер блокирует запись и показывает причину", async ({ page }) => {
  category("record-wizard");
  await startGame(page, "Сочи", 3);
  await page.locator("#floatingRecordButton").click();
  await page.locator('[data-type="Взятки"]').click();
  await page.locator("#nextStepButton").click();
  await page.locator('[data-trick-button="0"][data-value="6"]').click();
  await page.locator('[data-trick-button="1"][data-value="1"]').click();
  await page.locator('[data-trick-button="2"][data-value="0"]').click();
  await page.locator("#addButton").click();
  await expect(page.locator("#recordModal")).toHaveClass(/open/);
  await expect(page.locator("#recordValidationMessage")).toContainText("Не хватает 3");
  expect((await snapshot(page)).history).toHaveLength(0);
});

test("desktop/mobile не создают горизонтальный overflow в основных экранах", async ({ page }) => {
  category("appearance");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.reload();
    if (viewport.width < 721) await page.locator("#mobileMenuButton").click();
    await expect(page.locator("#startButton")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("ручной подсчёт, возможные игры и текстовый отчёт доступны через UI", async ({ page }) => {
  category("possible-games");
  await page.locator("#scoreCountingMode").selectOption("manual");
  await startGame(page, "Сочи", 3);
  await expect(page.locator("#possibleGamesCard")).toBeVisible();
  await page.locator('[data-record-type="Распасы"]').click();
  await expect(page.locator("#gameType")).toHaveValue("Распасы");
  await page.locator("#closeRecordButton").click();
  await recordManual(page, 0, "Пуля", 2);
  await expect(page.locator("#calculateScoresButton")).toBeVisible();
  await page.locator("#calculateScoresButton").click();
  await expect(page.locator("#scoreConfirmModal")).toHaveClass(/open/);
  await page.locator("#confirmScoreCalculationButton").click();
  expect((await snapshot(page)).scoresCalculated).toBe(true);
  await clickHeaderAction(page, "#reportButton");
  await expect(page.locator("#message")).toContainText("Отчёт");
});

test("все игровые настройки конвенции доступны и создают пользовательский пресет", async ({ page }) => {
  category("record-wizard");
  await page.locator("#playerCount").selectOption("4");
  await clickHeaderAction(page, "#conventionButton");
  const fields = page.locator("[data-convention-setting]");
  expect(await fields.count()).toBe(24);
  for (const pattern of ["6", "6-7", "6-7-8", "cycle-6-7-8", "6-7-7-8", "6-7-8-9"]) {
    await page.locator('[data-convention-setting="raspassProgression"]').selectOption(pattern);
    await expect(page.locator("#raspassProgressionHelp")).not.toHaveText("");
  }
  for (const pattern of ["6", "7", "6-7", "6-7-8", "cycle-6-7-8", "6-7-7-8", "6-7-8-9"]) {
    await page.locator('[data-convention-setting="raspassExitProgression"]').selectOption(pattern);
    await expect(page.locator("#raspassExitProgressionHelp")).not.toHaveText("");
  }
  await page.locator('[data-convention-setting="whistRequirementMode"]').selectOption("each");
  await page.locator('[data-convention-setting="whistShortfallDistribution"]').selectOption("whisters-passers");
  await page.locator('[data-convention-setting="whistResponsibility"]').selectOption("full");
  await page.locator('[data-convention-setting="declarerRemizWhistMode"]').selectOption("greedy");
  await page.locator('[data-convention-setting="raspassZeroTricksPool"]').check();
  await page.locator('[data-convention-setting="restingTalonPool"]').check();
  await page.locator("#conventionName").fill("Матрица настроек");
  await page.locator("#closeConventionButton").click();
  await startGame(page, "Матрица настроек", 4);
  const actual = await snapshot(page);
  const custom = actual.customConventions[0];
  expect(custom).toMatchObject({
    whistRequirementMode: "each", whistShortfallDistribution: "whisters-passers",
    whistResponsibility: "full", declarerRemizWhistMode: "greedy",
    raspassZeroTricksPool: true, restingTalonPool: "yes", raspassProgression: "6-7-8-9"
  });
});
