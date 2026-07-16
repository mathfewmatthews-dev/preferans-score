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

async function clickHeaderAction(page: Page, selector: string) {
  const menuButton = page.locator("#mobileMenuButton");
  if (await menuButton.isVisible() && await menuButton.getAttribute("aria-expanded") !== "true") {
    await menuButton.click();
  }
  await page.locator(selector).click();
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

test("mobile record wizard keeps route steps, footer and scrolling consistent", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCleanApp(page);
  await startGame(page);
  await page.locator("#floatingRecordButton").click();

  const visibleSteps = () => page.locator("#recordModal .steps span:visible").allTextContents();
  await expect.poll(visibleSteps).toEqual(["1"]);

  await page.locator('[data-type="Распасы"]').click();
  await expect.poll(visibleSteps).toEqual(["1", "2"]);
  await expect(page.locator("#stepDot2")).toHaveClass(/active/);

  const tableStyle = await page.locator("#recordModal .round-card").evaluate((node) => {
    const style = getComputedStyle(node);
    const rowStyle = getComputedStyle(node.querySelector<HTMLElement>(".round-row")!);
    return {
      overflow: style.overflow,
      radius: style.borderTopLeftRadius,
      rowRadius: rowStyle.borderTopLeftRadius,
      rowShadow: rowStyle.boxShadow
    };
  });
  expect(tableStyle).toEqual({ overflow: "visible", radius: "0px", rowRadius: "0px", rowShadow: "none" });

  await page.locator("#prevStepButton").click();
  await expect(page.locator("#recordTitle")).toHaveText("Тип записи");
  await expect.poll(visibleSteps).toEqual(["1"]);

  await page.locator('[data-type="Ручной ввод"]').click();
  await expect.poll(visibleSteps).toEqual(["1", "2"]);
  await expect(page.locator("#addButton")).toHaveText("Записать");
  await expect(page.locator("#manualPanel")).toHaveCSS("box-shadow", "none");
  await page.locator("#prevStepButton").click();
  await expect.poll(visibleSteps).toEqual(["1"]);

  await page.locator('[data-type="Взятки"]').click();
  await expect.poll(visibleSteps).toEqual(["1", "2", "3"]);
  await page.locator("#nextStepButton").click();
  await expect(page.locator('#recordModal .wizard-step[data-step="3"]')).toBeHidden();
  for (const player of [0, 1, 2]) {
    await page.locator(`[data-trick-button="${player}"][data-value="0"]`).click();
  }
  await expect(page.locator("#recordValidationMessage")).not.toBeEmpty();

  const footerGeometry = await page.locator("#recordModal .wizard-actions").evaluate((footer) => {
    const message = footer.querySelector<HTMLElement>(".record-validation-message")!.getBoundingClientRect();
    const buttonRow = footer.querySelector<HTMLElement>(".wizard-action-buttons")!;
    const buttons = buttonRow.getBoundingClientRect();
    const panel = footer.closest<HTMLElement>(".modal-panel")!.getBoundingClientRect();
    return {
      messageAboveButtons: message.bottom <= buttons.top,
      messageHeight: message.height,
      buttonsInsidePanel: buttons.bottom <= panel.bottom + 1,
      buttonHeight: buttonRow.querySelector("button")!.getBoundingClientRect().height
    };
  });
  expect(footerGeometry.messageAboveButtons).toBe(true);
  expect(footerGeometry.messageHeight).toBeGreaterThan(30);
  expect(footerGeometry.buttonsInsidePanel).toBe(true);
  expect(footerGeometry.buttonHeight).toBeLessThanOrEqual(52);
});

test("mobile browser Back consumes wizard steps, modals and menu before leaving", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCleanApp(page);
  const appUrl = page.url();
  const browserBack = async () => {
    await page.evaluate(() => window.history.back());
  };

  await page.locator("#mobileMenuButton").click();
  await expect(page.locator("#mobileMenuButton")).toHaveAttribute("aria-expanded", "true");
  await browserBack();
  await expect(page.locator("#mobileMenuButton")).toHaveAttribute("aria-expanded", "false");
  expect(page.url()).toBe(appUrl);

  await page.locator("#mobileMenuButton").click();
  await page.locator("#settingsButton").click();
  await expect(page.locator("#colorSettingsDrawer")).toHaveClass(/open/);
  await browserBack();
  await expect(page.locator("#colorSettingsDrawer")).not.toHaveClass(/open/);
  expect(page.url()).toBe(appUrl);

  await startGame(page);
  const gameUrl = page.url();
  await page.locator("#floatingRecordButton").click();
  await page.locator('[data-type="Взятки"]').click();
  await expect(page.locator("#recordTitle")).toHaveText("Кто играет");

  await browserBack();
  await expect(page.locator("#recordModal")).toHaveClass(/open/);
  await expect(page.locator("#recordTitle")).toHaveText("Тип записи");
  await expect(page.locator("#recordModal .steps span:visible")).toHaveCount(1);

  await browserBack();
  await expect(page.locator("#recordModal")).not.toHaveClass(/open/);
  expect(page.url()).toBe(gameUrl);

  await browserBack();
  await expect.poll(() => page.url()).toBe("about:blank");
});

test("mobile browser Back closes a record modal after unwinding every route step", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCleanApp(page);
  await startGame(page);
  const localGameUrl = page.url();
  expect(localGameUrl).not.toContain("?game=");
  const browserBack = async () => {
    await page.evaluate(() => window.history.back());
  };

  await page.locator("#floatingRecordButton").click();
  await expect(page.locator("#recordTitle")).toHaveText("Тип записи");
  await browserBack();
  await expect(page.locator("#recordModal")).not.toHaveClass(/open/);

  await page.locator("#floatingRecordButton").click();
  await page.locator('[data-type="Взятки"]').click();
  await page.locator("#nextStepButton").click();
  await expect(page.locator("#recordTitle")).toHaveText("Висты и взятки");

  await browserBack();
  await expect(page.locator("#recordTitle")).toHaveText("Кто играет");
  await browserBack();
  await expect(page.locator("#recordTitle")).toHaveText("Тип записи");
  await browserBack();
  await expect(page.locator("#recordModal")).not.toHaveClass(/open/);

  await page.locator("#floatingRecordButton").click();
  await page.locator('[data-type="Мизер"]').click();
  await page.locator("#nextStepButton").click();
  await page.locator("#nextStepButton").click();
  await expect(page.locator("#recordTitle")).toHaveText("Взятки в мизере");

  for (const title of ["Карты мизера", "Кто играет", "Тип записи"]) {
    await browserBack();
    await expect(page.locator("#recordTitle")).toHaveText(title);
    await expect(page.locator("#recordModal")).toHaveClass(/open/);
  }
  await browserBack();
  await expect(page.locator("#recordModal")).not.toHaveClass(/open/);

  await page.locator("#floatingRecordButton").click();
  await expect(page.locator("#recordTitle")).toHaveText("Тип записи");
  await page.evaluate(() => {
    window.history.back();
    window.history.back();
  });
  await expect(page.locator("#recordModal")).not.toHaveClass(/open/);
  await expect.poll(() => page.url()).toBe(localGameUrl);
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

test("pre-game settings never overlap the sheet between 1181 and 1324px", async ({ page }) => {
  for (const width of [1181, 1200, 1280, 1323, 1324]) {
    await page.setViewportSize({ width, height: DESKTOP_HEIGHT });
    await page.goto("/");
    const geometry = await page.evaluate(() => {
      const sheet = document.querySelector<HTMLElement>(".pool-card")!.getBoundingClientRect();
      const settings = document.querySelector<HTMLElement>("#setupPanel")!.getBoundingClientRect();
      const horizontalOverlap = sheet.left < settings.right && sheet.right > settings.left;
      const verticalOverlap = sheet.top < settings.bottom && sheet.bottom > settings.top;
      return {
        overlap: horizontalOverlap && verticalOverlap,
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth
      };
    });

    expect(geometry.overlap, `${width}px`).toBe(false);
    expect(geometry.horizontalOverflow, `${width}px`).toBeLessThanOrEqual(1);
  }
});

test("saved header colors are applied before app bootstrap", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("preferans.autosave.v1", JSON.stringify({
      started: true,
      state: {
        appearanceMode: "light",
        headerColor: "#7c3aed",
        headerTextColor: "#f8fafc",
        headerButtonColor: "#fbbf24",
        headerButtonTextColor: "#18202a"
      }
    }));
  });

  let resumeApp!: () => void;
  const appBlocked = new Promise<void>((resolve) => {
    resumeApp = resolve;
  });
  await page.route("**/app.js*", async (route) => {
    await appBlocked;
    await route.continue();
  });

  await page.goto("/", { waitUntil: "commit" });
  await page.locator(".app-header").waitFor({ state: "visible" });
  await page.waitForFunction(() => [...document.styleSheets].some((sheet) => sheet.href?.includes("styles.css")));

  const firstPaint = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".app-header")!;
    const button = document.querySelector<HTMLElement>(".app-header button")!;
    return {
      header: getComputedStyle(header).backgroundColor,
      headerText: getComputedStyle(header).color,
      button: getComputedStyle(button).backgroundColor,
      buttonText: getComputedStyle(button).color,
      meta: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content
    };
  });

  expect(firstPaint).toEqual({
    header: "rgb(124, 58, 237)",
    headerText: "rgb(248, 250, 252)",
    button: "rgb(251, 191, 36)",
    buttonText: "rgb(24, 32, 42)",
    meta: "#7c3aed"
  });

  resumeApp();
  await page.waitForLoadState("domcontentloaded");
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1920, height: 1080 }
]) {
  test(`convention settings remain interactive during a game on ${viewport.name}`, async ({ page }) => {
    const nativeDialogs: string[] = [];
    page.on("dialog", async (dialog) => {
      nativeDialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openCleanApp(page);
    await startGame(page);
    await clickHeaderAction(page, "#conventionButton");
    await expect(page.locator("#conventionModal")).toHaveClass(/open/);

    await page.locator("#conventionModalSelect").selectOption({ label: "Питер" });
    await expect(page.locator("#conventionModalSelect")).toHaveValue("Питер");
    await expect(page.locator('[data-convention-setting="poolUnit"]')).toHaveValue("20");

    const toggle = page.locator('[data-convention-setting="underThreeLoss"]');
    const initialToggle = await toggle.isChecked();
    await toggle.setChecked(!initialToggle);
    await expect(toggle).toBeChecked({ checked: !initialToggle });

    const progression = page.locator('[data-convention-setting="raspassProgression"]');
    await progression.scrollIntoViewIfNeeded();
    await progression.selectOption("cycle-6-7-8");
    await expect(progression).toHaveValue("cycle-6-7-8");

    await page.locator("#closeConventionButton").click();
    await expect(page.locator("#appConfirmModal")).toHaveClass(/open/);
    await expect(page.locator("#appConfirmModal .confirm-brand")).toHaveText("Пуля преферанса");
    await expect(page.locator("#appConfirmTitle")).toHaveText("Изменение конвенции");
    await expect(page.locator("#appConfirmMessage")).toContainText("Итоговый счёт партии будет пересчитан");
    await expect(page.locator("#appConfirmMessage")).toContainText("останутся как записаны");

    await page.keyboard.press("Escape");
    await expect(page.locator("#appConfirmModal")).not.toHaveClass(/open/);
    await expect(page.locator("#conventionModal")).toHaveClass(/open/);
    await expect(page.locator("#closeConventionButton")).toBeFocused();

    await page.locator("#closeConventionButton").click();
    await page.locator("#appConfirmModal").click({ position: { x: 4, y: 4 } });
    await expect(page.locator("#appConfirmModal")).not.toHaveClass(/open/);
    await expect(page.locator("#conventionModal")).toHaveClass(/open/);

    await page.locator("#closeConventionButton").click();
    await page.locator("#confirmAppConfirmButton").click();
    await expect(page.locator("#conventionModal")).not.toHaveClass(/open/);
    expect(nativeDialogs).toEqual([]);

    await page.reload();
    await clickHeaderAction(page, "#conventionButton");
    await expect(page.locator("#conventionModalSelect")).toBeEnabled();
    await expect(page.locator("#conventionModalSelect")).toHaveValue(/Своя конвенция/);
    await expect(page.locator('[data-convention-setting="underThreeLoss"]')).toBeChecked({ checked: !initialToggle });
    await expect(page.locator('[data-convention-setting="raspassProgression"]')).toHaveValue("cycle-6-7-8");
  });
}

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1920, height: 1080 }
]) {
  test(`clear and new-game warnings use the branded dialog on ${viewport.name}`, async ({ page }) => {
    const nativeDialogs: string[] = [];
    page.on("dialog", async (dialog) => {
      nativeDialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openCleanApp(page);
    await startGame(page);
    await recordManual(page, 0, "Гора", 1);
    await expect(page.locator("#historyList li")).toHaveCount(1);

    await clickHeaderAction(page, "#resetButton");
    await expect(page.locator("#appConfirmTitle")).toHaveText("Очистить партию?");
    await expect(page.locator("#appConfirmModal .confirm-brand")).toHaveText("Пуля преферанса");
    await expect(page.locator("#appConfirmModal .app-confirm-panel")).toHaveClass(/is-danger/);
    await page.locator("#cancelAppConfirmButton").click();
    await expect(page.locator("#resetButton")).toBeFocused();
    await expect(page.locator("#historyList li")).toHaveCount(1);

    await clickHeaderAction(page, "#resetButton");
    await page.locator("#confirmAppConfirmButton").click();
    await expect(page.locator("body")).not.toHaveClass(/game-started/);

    await startGame(page);
    await clickHeaderAction(page, "#newGameButton");
    await expect(page.locator("#appConfirmTitle")).toHaveText("Начать новую игру?");
    await expect(page.locator("#appConfirmModal .app-confirm-panel")).not.toHaveClass(/is-danger/);
    const insets = await page.locator("#appConfirmModal .app-confirm-panel").evaluate((node) => {
      const panel = (node as HTMLElement).getBoundingClientRect();
      const brand = node.querySelector<HTMLElement>(".confirm-brand")!.getBoundingClientRect();
      const actions = node.querySelector<HTMLElement>(".confirm-actions")!.getBoundingClientRect();
      return {
        left: brand.left - panel.left,
        right: panel.right - actions.right,
        bottom: panel.bottom - actions.bottom
      };
    });
    expect(Math.abs(insets.left - insets.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(insets.left - insets.bottom)).toBeLessThanOrEqual(1);
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).toHaveClass(/game-started/);
    await expect(page.locator("#newGameButton")).toBeFocused();

    await clickHeaderAction(page, "#newGameButton");
    await page.locator("#confirmAppConfirmButton").click();
    await expect(page.locator("body")).not.toHaveClass(/game-started/);
    await page.reload();
    await expect(page.locator("body")).not.toHaveClass(/game-started/);
    expect(nativeDialogs).toEqual([]);
  });
}

test("metadata and social preview describe the public app", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Пуля преферанса — счётчик игры");

  const metadata = await page.evaluate(() => {
    const meta = (selector: string) => document.querySelector<HTMLMetaElement>(selector)?.content;
    return {
      description: meta('meta[name="description"]'),
      canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
      ogType: meta('meta[property="og:type"]'),
      ogSiteName: meta('meta[property="og:site_name"]'),
      ogLocale: meta('meta[property="og:locale"]'),
      ogTitle: meta('meta[property="og:title"]'),
      ogUrl: meta('meta[property="og:url"]'),
      ogImage: meta('meta[property="og:image"]'),
      ogImageType: meta('meta[property="og:image:type"]'),
      ogImageWidth: meta('meta[property="og:image:width"]'),
      ogImageHeight: meta('meta[property="og:image:height"]'),
      twitterCard: meta('meta[name="twitter:card"]'),
      twitterTitle: meta('meta[name="twitter:title"]')
    };
  });

  expect(metadata).toEqual({
    description: "Счётчик преферанса для онлайн-записи и игры по конвенциям Сочи, Питер, Ростов и собственным настройкам.",
    canonical: "https://mathfewmatthews-dev.github.io/preferans-score/",
    ogType: "website",
    ogSiteName: "Пуля преферанса",
    ogLocale: "ru_RU",
    ogTitle: "Пуля преферанса",
    ogUrl: "https://mathfewmatthews-dev.github.io/preferans-score/",
    ogImage: "https://mathfewmatthews-dev.github.io/preferans-score/social-preview.png",
    ogImageType: "image/png",
    ogImageWidth: "1200",
    ogImageHeight: "630",
    twitterCard: "summary_large_image",
    twitterTitle: "Пуля преферанса"
  });

  const imageResponse = await request.get("/social-preview.png");
  expect(imageResponse.ok()).toBe(true);
  expect(imageResponse.headers()["content-type"]).toContain("image/png");
  const image = await imageResponse.body();
  expect(image.readUInt32BE(16)).toBe(1200);
  expect(image.readUInt32BE(20)).toBe(630);

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.id).toBe("./");
  expect(manifest.start_url).toBe(".");
  expect(manifest.launch_handler).toEqual({ client_mode: "navigate-existing" });
});

test("shared games use their own preview page and return to the synchronized app", async ({ page, context, request }) => {
  const gameId = "ABCDEFGHIJKLMNOP";
  const landingResponse = await request.get(`/game/?game=${gameId}`);
  expect(landingResponse.ok()).toBe(true);
  const landingHtml = await landingResponse.text();
  expect(landingHtml).toContain('<meta property="og:title" content="Подключиться к общей партии">');
  expect(landingHtml).toContain("https://mathfewmatthews-dev.github.io/preferans-score/game-preview.png");
  expect(landingHtml).not.toContain("social-preview.png");

  const imageResponse = await request.get("/game-preview.png");
  expect(imageResponse.ok()).toBe(true);
  expect(imageResponse.headers()["content-type"]).toContain("image/png");
  const image = await imageResponse.body();
  expect(image.readUInt32BE(16)).toBe(1200);
  expect(image.readUInt32BE(20)).toBe(630);

  await page.goto(`/game/?game=${gameId}`);
  await expect(page).toHaveURL(new RegExp(`[?&]game=${gameId}(?:$|[&#])`));
  expect(new URL(page.url()).pathname).not.toContain("/game/");

  await openCleanApp(page);
  await startGame(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator("#floatingShareButton").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/game\/\?game=[A-Za-z0-9_-]{16,64}$/);
});

test("opening the main address in a new tab keeps a shared game isolated", async ({ page, context }) => {
  await page.route("https://www.gstatic.com/firebasejs/**", (route) => route.abort());
  await openCleanApp(page);
  await startGame(page);
  await expect(page).not.toHaveURL(/[?&]game=/);
  await expect(page.locator(".score-table-card")).toContainText("Анна");

  const sharedGameId = "SHAREDGAME123456";
  await page.evaluate((gameId) => {
    const local = JSON.parse(localStorage.getItem("preferans.autosave.v1") || "{}");
    const shared = structuredClone(local);
    shared.state.gameId = gameId;
    shared.state.players = ["Общий 1", "Общий 2", "Общий 3"];
    localStorage.setItem(`preferans.autosave.v1.shared.${gameId}`, JSON.stringify(shared));
  }, sharedGameId);

  await page.goto(`/?game=${sharedGameId}`);
  await expect(page.locator("body")).toHaveClass(/game-started/);
  await expect(page.locator(".score-table-card")).toContainText("Общий 1");

  const mainPage = await context.newPage();
  await mainPage.goto("/");
  await expect(mainPage.locator("body")).toHaveClass(/game-started/);
  await expect(mainPage.locator(".score-table-card")).toContainText("Анна");
  await expect(mainPage).not.toHaveURL(/[?&]game=/);

  await expect(page).toHaveURL(new RegExp(`[?&]game=${sharedGameId}(?:$|[&#])`));
  await expect(page.locator(".score-table-card")).toContainText("Общий 1");
});

test("the main address repairs a shared-game autosave from the primary backup", async ({ page }) => {
  await page.route("https://www.gstatic.com/firebasejs/**", (route) => route.abort());
  await openCleanApp(page);
  await startGame(page);

  const saved = await page.evaluate(() => ({
    primary: localStorage.getItem("preferans.autosave.v1"),
    backup: localStorage.getItem("preferans.autosave.primary.v1"),
    primaryId: localStorage.getItem("preferans.autosave.primaryGameId.v1")
  }));
  expect(saved.primary).toBeTruthy();
  expect(saved.backup).toBe(saved.primary);
  expect(saved.primaryId).toBeTruthy();

  const sharedGameId = "CONTAMINATED1234";
  await page.evaluate(({ sharedGameId }) => {
    const polluted = JSON.parse(localStorage.getItem("preferans.autosave.v1") || "{}");
    polluted.state.gameId = sharedGameId;
    polluted.state.players = ["Общий 1", "Общий 2", "Общий 3"];
    localStorage.setItem("preferans.autosave.v1", JSON.stringify(polluted));
  }, { sharedGameId });

  await page.goto("/");
  await expect(page).not.toHaveURL(/[?&]game=/);
  await expect(page.locator("body")).toHaveClass(/game-started/);
  await expect(page.locator(".score-table-card")).toContainText("Анна");
  const repaired = await page.evaluate((gameId) => ({
    main: localStorage.getItem("preferans.autosave.v1"),
    shared: localStorage.getItem(`preferans.autosave.v1.shared.${gameId}`)
  }), sharedGameId);
  expect(repaired.main).toBe(saved.backup);
  expect(repaired.shared).toContain("Общий 1");
});

test("the main address rejects a legacy shared game marked as the primary autosave", async ({ page }) => {
  const sharedGameId = "MARKEDSHARED1234";
  await page.goto("/");
  await page.evaluate((gameId) => {
    localStorage.setItem("preferans.autosave.primaryGameId.v1", gameId);
    localStorage.setItem("preferans.autosave.lastSharedGameId.v1", gameId);
    localStorage.removeItem("preferans.autosave.primary.v1");
    localStorage.setItem("preferans.autosave.v1", JSON.stringify({
      started: true,
      state: {
        gameId,
        players: ["Общий 1", "Общий 2", "Общий 3"],
        pool: [0, 0, 0],
        mountain: [0, 0, 0],
        whists: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
      }
    }));
  }, sharedGameId);

  await page.goto("/");
  await expect(page).not.toHaveURL(/[?&]game=/);
  await expect(page.locator("body")).not.toHaveClass(/game-started/);
  const repaired = await page.evaluate((gameId) => ({
    main: localStorage.getItem("preferans.autosave.v1"),
    shared: localStorage.getItem(`preferans.autosave.v1.shared.${gameId}`),
    primaryId: localStorage.getItem("preferans.autosave.primaryGameId.v1")
  }), sharedGameId);
  expect(repaired.main).toBeNull();
  expect(repaired.shared).toContain("Общий 1");
  expect(repaired.primaryId).toBeNull();
});

test("legacy shared autosave no longer makes the main address reopen that game", async ({ page }) => {
  const sharedGameId = "LEGACYSHARED1234";
  await page.goto("/");
  await page.evaluate((gameId) => {
    localStorage.removeItem("preferans.autosave.primaryGameId.v1");
    localStorage.setItem("preferans.autosave.v1", JSON.stringify({
      started: true,
      state: {
        gameId,
        players: ["Гость 1", "Гость 2", "Гость 3"],
        pool: [0, 0, 0],
        mountain: [0, 0, 0],
        whists: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
      }
    }));
  }, sharedGameId);

  await page.goto("/");
  await expect(page.locator("body")).not.toHaveClass(/game-started/);
  const migrated = await page.evaluate((gameId) => ({
    main: localStorage.getItem("preferans.autosave.v1"),
    shared: localStorage.getItem(`preferans.autosave.v1.shared.${gameId}`)
  }), sharedGameId);
  expect(migrated.main).toBeNull();
  expect(migrated.shared).toContain("Гость 1");
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

test("all buttons share the same hover motion and shadow, including the open hamburger", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const expectedShadow = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.boxShadow = "var(--ui-shadow-button-hover)";
    document.body.appendChild(probe);
    const shadow = getComputedStyle(probe).boxShadow;
    probe.remove();
    return shadow;
  });
  const expectHover = async (selector: string) => {
    const button = page.locator(selector);
    await button.hover();
    await expect.poll(() => button.evaluate((node) => {
      const style = getComputedStyle(node);
      return { transform: style.transform, shadow: style.boxShadow };
    })).toEqual({ transform: "matrix(1, 0, 0, 1, 0, -2)", shadow: expectedShadow });
  };

  await expectHover("#mobileMenuButton");
  await page.locator("#mobileMenuButton").click();
  await expect(page.locator("#mobileMenuButton")).toHaveAttribute("aria-expanded", "true");
  await expectHover("#mobileMenuButton");
  await expectHover("#settingsButton");

  await page.locator("#settingsButton").click();
  await expect(page.locator("#colorSettingsDrawer")).toHaveClass(/open/);
  await expectHover("#closeSettingsButton");
  await page.locator("#closeSettingsButton").click();
  await expectHover("#startButton");
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

test("closed-player markers are centered in a dedicated zone on every classic side", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: DESKTOP_HEIGHT });
  await openCleanApp(page);
  await startGame(page, "Сочи", 4);
  for (let player = 0; player < 4; player += 1) await recordManual(page, player, "Пуля", 20);

  const markers = page.locator("#poolSheet .pool-closed-marker");
  await expect(markers).toHaveCount(4);
  const centers = await markers.evaluateAll((nodes) => Object.fromEntries(nodes.map((node) => {
    const marker = node as SVGGraphicsElement;
    const box = marker.getBBox();
    return [marker.getAttribute("data-side"), { x: box.x + box.width / 2, y: box.y + box.height / 2 }];
  })));
  const expected = {
    top: { x: 690, y: 225 },
    right: { x: 775, y: 310 },
    bottom: { x: 690, y: 775 },
    left: { x: 225, y: 690 }
  };
  for (const [side, target] of Object.entries(expected)) {
    expect(Math.abs(centers[side].x - target.x), side).toBeLessThanOrEqual(3);
    expect(Math.abs(centers[side].y - target.y), side).toBeLessThanOrEqual(3);
  }
});

for (const viewport of [
  { width: 3440, height: 900 },
  { width: 2048, height: 1200 },
  { width: 1920, height: 700 },
  { width: 1440, height: 900 },
  { width: 1180, height: 700 },
  { width: 390, height: 844 }
]) {
  test(`completed pool keeps its add action accessible at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openCleanApp(page);
    await startGame(page, "Сочи", 3);
    for (let player = 0; player < 3; player += 1) await recordManual(page, player, "Пуля", 20);

    const addPool = page.locator("#addPoolButton");
    await expect(addPool).toBeVisible();
    const centerState = await page.locator("#poolSheet").evaluate((svg) => {
      const circle = svg.querySelector<SVGCircleElement>(".center-pool.closed")!;
      const value = svg.querySelector<SVGTextElement>(".center-value")!;
      const label = svg.querySelector<SVGTextElement>(".center-label")!;
      return {
        fill: getComputedStyle(circle).fill,
        label: label.textContent,
        value: value.textContent,
        valueFill: getComputedStyle(value).fill
      };
    });
    expect(centerState.fill).toBe("rgb(73, 168, 79)");
    expect(centerState.value).toBe("20");
    expect(centerState.label).toBe("личная");
    expect(centerState.valueFill).not.toBe(centerState.fill);

    if (viewport.width >= 1181) {
      const geometry = await page.evaluate(() => {
        const button = document.querySelector<HTMLElement>("#addPoolButton")!.getBoundingClientRect();
        const card = document.querySelector<HTMLElement>(".pool-card")!.getBoundingClientRect();
        return { buttonBottom: button.bottom, cardBottom: card.bottom, viewportBottom: window.innerHeight };
      });
      expect(geometry.buttonBottom).toBeLessThanOrEqual(geometry.cardBottom + 1);
      expect(geometry.buttonBottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
    } else {
      await addPool.scrollIntoViewIfNeeded();
      await expect(addPool).toBeInViewport();
    }

    await addPool.click();
    await expect(page.locator("#addPoolModal")).toHaveClass(/open/);
    await page.locator("#cancelAddPoolButton").click();
  });
}
