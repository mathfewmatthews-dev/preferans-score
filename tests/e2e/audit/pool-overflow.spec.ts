import { expect, test, type Page } from "@playwright/test";
import { clickHeaderAction, openCleanApp, recordContract, recordManual, snapshot, startGame } from "./ui-driver";

function category(type: string) { test.info().annotations.push({ type: "auditCategory", description: type }); }

function playerTrack(page: Page, player: number, track: "pool" | "mountain") {
  const trackClass = track === "pool" ? "pool-value-track" : "mountain-track";
  return page.locator(`#poolSheet .player-tracks[data-player-index="${player}"] .${trackClass}`);
}

function whistTrack(page: Page, player: number, target: number) {
  return page.locator(`#poolSheet .whist-summary[data-player-index="${player}"] [data-target-index="${target}"] .whist-vector-text`);
}

async function expectTrackChange(page: Page, player: number, track: "pool" | "mountain", before: number, after: number) {
  const line = playerTrack(page, player, track);
  await expect(line.locator("tspan.crossed").last()).toContainText(String(before));
  await expect(line.locator("tspan.last-change")).toHaveText(String(after));
}

async function expectWhistChange(page: Page, player: number, target: number, before: number, after: number) {
  const line = whistTrack(page, player, target);
  await expect(line.locator("tspan.crossed").last()).toContainText(String(before));
  await expect(line.locator("tspan.last-change")).toHaveText(String(after));
}

test.beforeEach(async ({ page }) => {
  category("calculations");
  await openCleanApp(page);
});

test("Сочи: избыток последовательно закрывает соперников, создаёт висты и списывает остаток с горы", async ({ page }) => {
  await startGame(page, "Сочи", 3);
  await recordManual(page, 0, "Пуля", 16);
  await recordManual(page, 0, "Гора", 5);
  await recordManual(page, 1, "Пуля", 18);
  await recordManual(page, 2, "Пуля", 19);

  await recordContract(page, { contract: 10, declarer: 0, roles: ["Играет", "Пас", "Пас"], tricks: [10, 0, 0] });
  const actual = await snapshot(page);
  expect(actual.pool).toEqual([20, 20, 20]);
  expect(actual.mountain).toEqual([2, 0, 0]);
  expect(actual.whists[0]).toEqual([0, 20, 10]);
  expect(actual.history.at(-1)).toContain("Висты +20 на Борис, +10 на Вера");
  await expectTrackChange(page, 0, "pool", 16, 20);
  await expectTrackChange(page, 0, "mountain", 5, 2);
  await expectWhistChange(page, 0, 1, 0, 20);
  await expectWhistChange(page, 0, 2, 0, 10);
  await expect(page.locator('#poolSheet .player-tracks[data-player-index="0"] .pool-closed-marker')).toHaveText("закрыл >>>");

  const summaryRow = page.locator("#scoreBody tr", { hasText: "Анна" });
  await expect(summaryRow.locator("td").nth(1)).toHaveText("20");
  await expect(summaryRow.locator("td").nth(2)).toHaveText("2");
  await expect(summaryRow.locator("td").nth(3)).toHaveText("30");
  const historyRecord = page.locator("#historyList li").first();
  await expect(historyRecord).toContainText("Пуля +4");
  await expect(historyRecord).toContainText("Гора -3");
  await expect(historyRecord).toContainText("Висты +20 на Борис, +10 на Вера");

  await clickHeaderAction(page, "#undoButton");
  const undone = await snapshot(page);
  expect(undone.pool).toEqual([16, 18, 19]);
  expect(undone.mountain).toEqual([5, 0, 0]);
  expect(undone.whists[0]).toEqual([0, 0, 0]);
  await expect(playerTrack(page, 0, "pool").locator("tspan").last()).toHaveText("16");
  await expect(playerTrack(page, 0, "mountain").locator("tspan").last()).toHaveText("5");
  await clickHeaderAction(page, "#redoButton");
  const redone = await snapshot(page);
  expect(redone.pool).toEqual([20, 20, 20]);
  expect(redone.mountain).toEqual([2, 0, 0]);
  expect(redone.whists[0]).toEqual([0, 20, 10]);
  await expectTrackChange(page, 0, "mountain", 5, 2);
  await expectWhistChange(page, 0, 1, 0, 20);
});

test("Сочи: когда весь избыток помещается в помощь, гора не меняется", async ({ page }) => {
  await startGame(page, "Сочи", 3);
  await recordManual(page, 0, "Пуля", 16);
  await recordManual(page, 0, "Гора", 5);
  await recordManual(page, 1, "Пуля", 10);

  await recordContract(page, { contract: 10, declarer: 0, roles: ["Играет", "Пас", "Пас"], tricks: [10, 0, 0] });
  const actual = await snapshot(page);
  expect(actual.pool).toEqual([20, 16, 0]);
  expect(actual.mountain).toEqual([5, 0, 0]);
  expect(actual.whists[0]).toEqual([0, 60, 0]);
  await expectWhistChange(page, 0, 1, 0, 60);
  await expect(playerTrack(page, 0, "mountain").locator("tspan").last()).toHaveText("5");
  await expect(playerTrack(page, 0, "mountain").locator("tspan.last-change")).toHaveCount(0);
  await expect(page.locator("#historyList li").first()).not.toContainText("Гора -");
});

test("Сочи: непоместившийся избыток не пропадает и может увести гору ниже нуля", async ({ page }) => {
  await startGame(page, "Сочи", 3);
  await recordManual(page, 0, "Пуля", 16);
  await recordManual(page, 0, "Гора", 2);
  await recordManual(page, 1, "Пуля", 20);
  await recordManual(page, 2, "Пуля", 20);

  await recordContract(page, { contract: 10, declarer: 0, roles: ["Играет", "Пас", "Пас"], tricks: [10, 0, 0] });
  const actual = await snapshot(page);
  expect(actual.pool).toEqual([20, 20, 20]);
  expect(actual.mountain).toEqual([-4, 0, 0]);
  expect(actual.whists[0]).toEqual([0, 0, 0]);
  await expectTrackChange(page, 0, "mountain", 2, -4);
  await expect(whistTrack(page, 0, 1).locator("tspan.last-change")).toHaveCount(0);
  await expect(whistTrack(page, 0, 2).locator("tspan.last-change")).toHaveCount(0);
  await expect(page.locator("#historyList li").first()).not.toContainText("Висты +");
});

test("Ростов: успешная игра сначала списывает гору, затем закрывает пулю и помогает", async ({ page }) => {
  await startGame(page, "Ростов", 3);
  await recordManual(page, 0, "Пуля", 16);
  await recordManual(page, 0, "Гора", 3);
  await recordManual(page, 1, "Пуля", 10);

  await recordContract(page, { contract: 10, declarer: 0, roles: ["Играет", "Пас", "Пас"], tricks: [10, 0, 0] });
  const actual = await snapshot(page);
  expect(actual.pool).toEqual([20, 13, 0]);
  expect(actual.mountain).toEqual([0, 0, 0]);
  expect(actual.whists[0]).toEqual([0, 30, 0]);
});

test("общая пуля сохраняет полную запись без помощи", async ({ page }) => {
  await page.locator("#poolClosingMode").selectOption("total");
  await startGame(page, "Сочи", 3);
  await recordManual(page, 0, "Пуля", 16);

  await recordContract(page, { contract: 10, declarer: 0, roles: ["Играет", "Пас", "Пас"], tricks: [10, 0, 0] });
  const actual = await snapshot(page);
  expect(actual.pool).toEqual([26, 0, 0]);
  expect(actual.mountain).toEqual([0, 0, 0]);
  expect(actual.whists[0]).toEqual([0, 0, 0]);
});
