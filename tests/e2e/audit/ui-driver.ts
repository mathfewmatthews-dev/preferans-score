import { expect, type Page } from "@playwright/test";
import type { ActualSnapshot, ContractRecord } from "./audit-types";

export async function openCleanApp(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("preferans.autosave."))
      .forEach((key) => localStorage.removeItem(key));
  });
  await page.reload();
  await expect(page.locator("#startButton")).toBeVisible();
}

export async function startGame(page: Page, convention = "Сочи", playerCount = 3) {
  await page.locator("#convention").selectOption(convention);
  await page.locator("#playerCount").selectOption(String(playerCount));
  const names = ["Анна", "Борис", "Вера", "Глеб", "Дина"];
  for (let index = 0; index < playerCount; index += 1) {
    await page.locator(`[data-player-name="${index}"]`).fill(names[index]);
  }
  await page.locator("#startButton").click();
  await expect(page.locator("body")).toHaveClass(/game-started/);
}

export async function clickHeaderAction(page: Page, selector: string) {
  const action = page.locator(selector);
  if (!(await action.isVisible())) {
    await page.locator("#mobileMenuButton").click();
    await expect(action).toBeVisible();
  }
  await action.click();
}

async function openRecord(page: Page, type: string) {
  await page.locator("#floatingRecordButton").click();
  await expect(page.locator("#recordModal")).toHaveClass(/open/);
  await page.locator(`[data-type="${type}"]`).click();
}

async function setTricks(page: Page, tricks: number[]) {
  for (let index = 0; index < tricks.length; index += 1) {
    const button = page.locator(`[data-trick-button="${index}"][data-value="${tricks[index]}"]`);
    if (await button.isEnabled()) await button.click();
  }
}

export async function recordContract(page: Page, record: ContractRecord) {
  await openRecord(page, "Взятки");
  await page.locator(`[data-declarer="${record.declarer}"]`).click();
  await page.locator(`[data-contract="${record.contract}"]`).click();
  await page.locator("#nextStepButton").click();
  for (let index = 0; index < record.roles.length; index += 1) {
    if (index === record.declarer || record.roles[index] === "Играет") continue;
    const role = page.locator(`[data-role-button="${index}"][data-role="${record.roles[index]}"]`);
    if (await role.count()) await role.click();
  }
  await setTricks(page, record.tricks);
  await page.locator("#addButton").click();
  await expect(page.locator("#recordModal")).not.toHaveClass(/open/);
}

export async function recordMisere(page: Page, declarer: number, tricks: number[]) {
  await openRecord(page, "Мизер");
  await page.locator(`[data-declarer="${declarer}"]`).click();
  await page.locator("#nextStepButton").click();
  await page.locator("#nextStepButton").click();
  await setTricks(page, tricks);
  await page.locator("#addButton").click();
}

export async function recordRaspass(page: Page, tricks: number[], restingIndex = -1) {
  await openRecord(page, "Распасы");
  if (restingIndex >= 0) await page.locator(`[data-role-button="${restingIndex}"][data-role="Отдыхает"]`).click();
  await setTricks(page, tricks);
  await page.locator("#addButton").click();
}

export async function recordManual(page: Page, player: number, area: "Гора" | "Пуля" | "Висты", amount: number, target = 1) {
  await openRecord(page, "Ручной ввод");
  await page.locator("#manualPlayer").selectOption(String(player));
  await page.locator("#manualArea").selectOption(area);
  if (area === "Висты") await page.locator("#manualTarget").selectOption(String(target));
  await page.locator("#manualAmount").fill(String(amount));
  await expect(page.locator("#addButton")).toBeEnabled();
  await page.locator("#addButton").click();
  await expect(page.locator("#recordModal")).not.toHaveClass(/open/);
}

export async function snapshot(page: Page): Promise<ActualSnapshot> {
  return page.evaluate(() => {
    const gameId = new URLSearchParams(location.search).get("game");
    const key = gameId
      ? `preferans.autosave.v1.shared.${gameId}`
      : "preferans.autosave.v1";
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return parsed.state;
  });
}
