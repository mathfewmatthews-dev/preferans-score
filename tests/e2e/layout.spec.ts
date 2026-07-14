import { expect, test, type Locator, type Page } from "@playwright/test";
import { openCleanApp, recordManual, startGame } from "./audit/ui-driver";

const DESKTOP_HEIGHT = 1080;

async function expectCloseAligned(close: Locator, panel: Locator, tolerance = 2) {
  const [closeBox, panelGeometry] = await Promise.all([
    close.boundingBox(),
    panel.evaluate((node) => {
      const element = node as HTMLElement;
      const rect = element.getBoundingClientRect();
      const header = element.querySelector<HTMLElement>(":scope > .modal-head")!;
      const headerRect = header.getBoundingClientRect();
      return {
        expectedRight: headerRect.right,
        headerRight: headerRect.right,
        panelRight: rect.right
      };
    })
  ]);
  expect(closeBox).not.toBeNull();
  expect(Math.abs(closeBox!.x + closeBox!.width - panelGeometry.expectedRight),
    JSON.stringify({ closeBox, panelGeometry })).toBeLessThanOrEqual(tolerance);
}

async function setRange(page: Page, id: string, value: number) {
  await page.locator(`#${id}`).evaluate((node, nextValue) => {
    const input = node as HTMLInputElement;
    input.value = String(nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

test("desktop modal close buttons align with the scrollable content edge", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: DESKTOP_HEIGHT });
  await openCleanApp(page);

  await page.locator("#settingsButton").click();
  await expectCloseAligned(page.locator("#closeSettingsButton"), page.locator(".settings-drawer-panel"));
  await page.locator("#closeSettingsButton").click();

  await page.locator("#rulesButton").click();
  await expectCloseAligned(page.locator("#closeRulesButton"), page.locator(".rules-panel"));
  await page.locator("#closeRulesButton").click();

  await page.locator("#conventionButton").click();
  await expectCloseAligned(page.locator("#closeConventionButton"), page.locator(".convention-settings-panel"));
  await page.locator("#closeConventionButton").click();

  await startGame(page);
  await page.locator("#floatingRecordButton").click();
  await expectCloseAligned(page.locator("#closeRecordButton"), page.locator("#recordModal .modal-panel"));
});

test("opacity ranges use the full track at 0, 50 and 100 percent", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCleanApp(page);
  await page.locator("#mobileMenuButton").click();
  await page.locator("#settingsButton").click();

  for (const id of ["clothOpacity", "textBackdropOpacity"]) {
    for (const value of [0, 50, 100]) {
      await setRange(page, id, value);
      const geometry = await page.locator(`#${id}`).evaluate((node) => {
        const input = node as HTMLInputElement;
        const style = getComputedStyle(input);
        const width = input.getBoundingClientRect().width;
        return {
          backgroundSize: style.backgroundSize,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          progress: input.style.getPropertyValue("--range-progress"),
          width
        };
      });

      expect(geometry.paddingLeft).toBe("0px");
      expect(geometry.paddingRight).toBe("0px");
      expect(geometry.progress).toBe(`${value}%`);
      expect(geometry.backgroundSize).toContain("22px");
      expect(geometry.backgroundSize).toContain("6px");
      expect(geometry.width).toBeGreaterThan(22);
    }
  }
});

for (const width of [3440, 1920]) {
  test(`possible-game cards fill the wide sidebar at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: DESKTOP_HEIGHT });
    await openCleanApp(page);
    await startGame(page);

    const geometry = await page.locator("#possibleGamesList").evaluate((node) => {
      const list = node as HTMLElement;
      const cards = [...list.querySelectorAll<HTMLElement>(".possible-game-card")];
      return {
        clientWidth: list.clientWidth,
        scrollWidth: list.scrollWidth,
        widths: cards.map((card) => card.getBoundingClientRect().width)
      };
    });

    expect(geometry.widths).toHaveLength(3);
    expect(Math.max(...geometry.widths) - Math.min(...geometry.widths)).toBeLessThanOrEqual(2);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  });
}

for (const width of [1919, 1440]) {
  test(`possible-game cards scroll horizontally below 1920px at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: DESKTOP_HEIGHT });
    await openCleanApp(page);
    await startGame(page);

    const geometry = await page.locator("#possibleGamesList").evaluate((node) => {
      const list = node as HTMLElement;
      const cards = [...list.querySelectorAll<HTMLElement>(".possible-game-card")];
      list.scrollLeft = list.scrollWidth;
      return {
        clientWidth: list.clientWidth,
        scrollLeft: list.scrollLeft,
        scrollWidth: list.scrollWidth,
        widths: cards.map((card) => card.getBoundingClientRect().width)
      };
    });

    expect(geometry.widths.every((cardWidth) => Math.abs(cardWidth - 300) <= 1)).toBe(true);
    expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
    expect(geometry.scrollLeft).toBeGreaterThan(0);
  });
}

test("the table shrinks before the sidebar and the 1180px layout stays stacked", async ({ page }) => {
  const sizes: Record<number, { pool: number; sidebar: number }> = {};
  for (const width of [3440, 1920]) {
    await page.setViewportSize({ width, height: DESKTOP_HEIGHT });
    await openCleanApp(page);
    await startGame(page);
    sizes[width] = await page.locator(".score-area").evaluate((node) => {
      const pool = node.querySelector<HTMLElement>(".pool-card")!;
      const sidebar = node.querySelector<HTMLElement>(".data-row")!;
      return {
        pool: pool.getBoundingClientRect().width,
        sidebar: sidebar.getBoundingClientRect().width
      };
    });
  }

  expect(sizes[3440].pool - sizes[1920].pool).toBeGreaterThan(
    sizes[3440].sidebar - sizes[1920].sidebar
  );

  await page.setViewportSize({ width: 1180, height: DESKTOP_HEIGHT });
  await openCleanApp(page);
  await startGame(page);
  const stacked = await page.locator(".score-area").evaluate((node) => {
    const pool = node.querySelector<HTMLElement>(".pool-card")!.getBoundingClientRect();
    const sidebar = node.querySelector<HTMLElement>(".data-row")!.getBoundingClientRect();
    return { sameLeft: Math.abs(pool.left - sidebar.left), sidebarBelow: sidebar.top >= pool.bottom };
  });
  expect(stacked.sameLeft).toBeLessThanOrEqual(2);
  expect(stacked.sidebarBelow).toBe(true);
});

test("empty history reaches the table bottom and remains usable after a record", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: DESKTOP_HEIGHT });
  await openCleanApp(page);
  await startGame(page);

  const bottoms = async () => page.evaluate(() => ({
    history: document.querySelector<HTMLElement>(".history-card")!.getBoundingClientRect().bottom,
    pool: document.querySelector<HTMLElement>(".pool-card")!.getBoundingClientRect().bottom
  }));

  await expect.poll(async () => {
    const empty = await bottoms();
    return Math.abs(empty.history - empty.pool);
  }).toBeLessThanOrEqual(2);

  await recordManual(page, 0, "Гора", 1);
  await expect(page.locator("#historyList li")).toHaveCount(1);
  const populated = await bottoms();
  expect(populated.history).toBeGreaterThanOrEqual(populated.pool - 2);
});

for (const width of [1461, 816]) {
  test(`header uses the hamburger before actions wrap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: DESKTOP_HEIGHT });
    await openCleanApp(page);
    await startGame(page);

    await expect(page.locator("#mobileMenuButton")).toBeVisible();
    await expect(page.locator("#headerActions")).toBeHidden();
    const closedHeight = await page.locator(".app-header").evaluate((node) =>
      (node as HTMLElement).getBoundingClientRect().height);
    expect(closedHeight).toBeLessThanOrEqual(90);

    await page.locator("#mobileMenuButton").click();
    await expect(page.locator("#headerActions")).toBeVisible();
    await expect(page.locator("#mobileMenuButton")).toHaveAttribute("aria-expanded", "true");
  });
}

test("the full header remains visible above the compact-menu breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 1501, height: DESKTOP_HEIGHT });
  await openCleanApp(page);
  await startGame(page);
  await expect(page.locator("#mobileMenuButton")).toBeHidden();
  await expect(page.locator("#headerActions")).toBeVisible();
});

test("floating share and record actions stay paired at 816px", async ({ page }) => {
  await page.setViewportSize({ width: 816, height: DESKTOP_HEIGHT });
  await openCleanApp(page);
  await startGame(page);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);

  const [share, record] = await Promise.all([
    page.locator("#floatingShareButton").boundingBox(),
    page.locator("#floatingRecordButton").boundingBox()
  ]);
  expect(share).not.toBeNull();
  expect(record).not.toBeNull();
  expect(Math.abs(share!.y + share!.height - (record!.y + record!.height))).toBeLessThanOrEqual(1);
  expect(record!.x + record!.width).toBeLessThanOrEqual(816);
  expect(share!.x).toBeGreaterThanOrEqual(0);
  expect(record!.x - (share!.x + share!.width)).toBeGreaterThanOrEqual(8);
});

for (const width of [1180, 816, 721]) {
  test(`stacked game scrolls at the viewport edge with symmetric gutters at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await openCleanApp(page);
    await startGame(page);

    const geometry = await page.evaluate(() => {
      const root = document.documentElement;
      const pool = document.querySelector<HTMLElement>(".pool-card")!.getBoundingClientRect();
      const bodyStyle = getComputedStyle(document.body);
      return {
        clientHeight: root.clientHeight,
        clientWidth: root.clientWidth,
        leftGutter: pool.left,
        overflowY: bodyStyle.overflowY,
        rightGutter: root.clientWidth - pool.right,
        scrollHeight: root.scrollHeight
      };
    });

    expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
    expect(geometry.overflowY).toBe("auto");
    expect(Math.abs(geometry.leftGutter - geometry.rightGutter)).toBeLessThanOrEqual(2);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
}

test("desktop keeps the outer gutters symmetric and scrolls only the long history", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openCleanApp(page);
  await startGame(page);

  await recordManual(page, 0, "Гора", 1);
  await expect(page.locator("#historyList li")).toHaveCount(1);
  await page.locator("#historyList").evaluate((list) => {
    const source = list.firstElementChild!;
    for (let index = 2; index <= 7; index += 1) {
      const clone = source.cloneNode(true) as HTMLElement;
      clone.dataset.layoutFixture = String(index);
      list.append(clone);
    }
  });
  await expect(page.locator("#historyList li")).toHaveCount(7);

  const geometry = await page.evaluate(() => {
    const root = document.documentElement;
    const scoreArea = document.querySelector<HTMLElement>(".score-area")!.getBoundingClientRect();
    const dataRow = document.querySelector<HTMLElement>(".data-row")!;
    const historyCard = document.querySelector<HTMLElement>(".history-card")!;
    const history = document.querySelector<HTMLElement>("#historyList")!;
    const pool = document.querySelector<HTMLElement>(".pool-card")!.getBoundingClientRect();
    history.scrollTop = history.scrollHeight;
    return {
      dataOverflow: getComputedStyle(dataRow).overflowY,
      dataScrollable: dataRow.scrollHeight - dataRow.clientHeight,
      historyBottom: historyCard.getBoundingClientRect().bottom,
      historyOverflow: getComputedStyle(history).overflowY,
      historyScrollTop: history.scrollTop,
      historyScrollable: history.scrollHeight - history.clientHeight,
      leftGutter: scoreArea.left,
      poolBottom: pool.bottom,
      rightGutter: root.clientWidth - scoreArea.right
    };
  });

  expect(Math.abs(geometry.leftGutter - geometry.rightGutter)).toBeLessThanOrEqual(2);
  expect(geometry.dataOverflow).toBe("hidden");
  expect(geometry.dataScrollable).toBeLessThanOrEqual(1);
  expect(geometry.historyOverflow).toBe("auto");
  expect(geometry.historyScrollable).toBeGreaterThan(0);
  expect(geometry.historyScrollTop).toBeGreaterThan(0);
  expect(Math.abs(geometry.historyBottom - geometry.poolBottom)).toBeLessThanOrEqual(2);
});

test("possible-game whists show gentleman or greedy declarer-remiz mode", async ({ page }) => {
  await openCleanApp(page);
  await startGame(page, "Сочи");
  const whists = page.locator('[data-record-type="Взятки"] .possible-game-section');
  await expect(whists).toContainText("джентльменский");
  await expect(whists).not.toContainText("жлобский");

  await openCleanApp(page);
  await startGame(page, "Питер");
  await expect(page.locator('[data-record-type="Взятки"] .possible-game-section'))
    .toContainText("жлобский");
});
