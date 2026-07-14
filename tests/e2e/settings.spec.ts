import { expect, test, type Page } from "@playwright/test";

const colors = [
  ["headerColor", "--header-bg"],
  ["headerButtonColor", "--header-button-bg"],
  ["headerButtonTextColor", "--header-button-text"],
  ["headerTextColor", "--header-text"],
  ["themeColor", "--accent"],
  ["buttonTextColor", "--button-text"],
  ["backgroundColor", "--bg"],
  ["tableColor", "--table-bg"],
  ["clothColor", "--cloth-color"],
  ["fieldTextColor", "--field-text-color"],
  ["textBackdropColor", "--sheet-text-backdrop"],
  ["lineColor", "--line"]
] as const;

async function setInputValue(page: Page, id: string, value: string) {
  await page.locator(`#${id}`).evaluate((node, nextValue) => {
    const input = node as HTMLInputElement;
    input.value = String(nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

async function cssVariable(page: Page, name: string) {
  return page.evaluate((property) =>
    getComputedStyle(document.documentElement).getPropertyValue(property).trim(), name);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  if (await page.locator("#mobileMenuButton").isVisible()) {
    await page.locator("#mobileMenuButton").click();
  }
  await page.locator("#settingsButton").click();
  await expect(page.locator("#colorSettingsDrawer")).toHaveClass(/open/);
});

test("all appearance settings update the live UI and reset", async ({ page }, testInfo) => {
  await page.screenshot({ path: testInfo.outputPath("settings-desktop.png"), fullPage: true });

  await page.locator("#darkModeButton").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#darkModeButton")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#lightModeButton").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#lightModeButton")).toHaveAttribute("aria-pressed", "true");

  for (const [id, variable] of colors) {
    await setInputValue(page, id, "#2468ac");
    await expect.poll(() => cssVariable(page, variable)).toBe("#2468ac");
  }

  await expect(page.locator("label[for='textBackdropOpacity'] > span"))
    .toHaveText("Прозрачность заливки текста поля");

  for (const [id, outputId, variable] of [
    ["clothOpacity", "clothOpacityValue", "--cloth-opacity"],
    ["textBackdropOpacity", "textBackdropOpacityValue", "--sheet-text-backdrop-opacity"]
  ] as const) {
    await setInputValue(page, id, "0");
    await expect(page.locator(`#${outputId}`)).toHaveText("0%");
    await expect.poll(() => page.locator(`#${id}`).evaluate((node) =>
      (node as HTMLElement).style.getPropertyValue("--range-progress"))).toBe("0%");

    await setInputValue(page, id, "100");
    await expect(page.locator(`#${outputId}`)).toHaveText("100%");
    await expect.poll(() => page.locator(`#${id}`).evaluate((node) =>
      (node as HTMLElement).style.getPropertyValue("--range-progress"))).toBe("100%");
    await expect.poll(() => cssVariable(page, variable)).toBe("1");

    const geometry = await page.locator(`#${id}`).evaluate((node) => {
      const input = node as HTMLInputElement;
      const style = getComputedStyle(input);
      return {
        value: input.value,
        width: input.getBoundingClientRect().width,
        backgroundSize: style.backgroundSize,
        progress: input.style.getPropertyValue("--range-progress")
      };
    });
    expect(geometry.value).toBe("100");
    expect(geometry.width).toBeGreaterThan(200);
    expect(geometry.backgroundSize).toContain("22px");
    expect(geometry.progress).toBe("100%");
  }

  await page.locator("#textBackdropShadow").check();
  await expect.poll(() => cssVariable(page, "--sheet-text-backdrop-shadow")).not.toBe("none");
  await page.screenshot({ path: testInfo.outputPath("settings-desktop-updated.png"), fullPage: true });

  const sheetText = page.locator("#poolSheet text").filter({ hasText: "Игрок" }).first();
  await expect(sheetText).toBeVisible();
  await expect.poll(() => sheetText.evaluate((node) => getComputedStyle(node).fill))
    .toBe("rgb(36, 104, 172)");

  await expect(page.locator("#resetColorSettingsButton")).toBeEnabled();
  await page.locator("#resetColorSettingsButton").click();
  await expect(page.locator("#resetColorSettingsButton")).toBeDisabled();
  await expect(page.locator("#fieldTextColor")).toHaveValue("#18202a");
});

test("table image can be loaded and removed locally", async ({ page }) => {
  await page.locator("#tableImageInput").setInputFiles("icons/pwa-192.png");
  await expect(page.locator("#tableImagePreview")).toBeVisible();
  await expect.poll(() => cssVariable(page, "--table-image")).not.toBe("none");
  await page.locator("#removeTableImageButton").click();
  await expect(page.locator("#tableImagePreview")).toBeHidden();
  await expect.poll(() => cssVariable(page, "--table-image")).toBe("none");
});

test("mobile color palette supports every color setting and labels wrap", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator("#mobileMenuButton").click();
  await page.locator("#settingsButton").click();
  await page.locator("label.color-field:has(#fieldTextColor)").click();
  await expect(page.locator("#mobileColorPalette")).not.toHaveAttribute("hidden", "");
  await expect(page.locator("#paletteTargetLabel")).toHaveText("Цвет текста поля");

  await page.locator("#closePaletteButton").click();
  const label = page.locator("label[for='textBackdropOpacity'] > span");
  await expect(label).toHaveText("Прозрачность заливки текста поля");
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noOverflow).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("settings-mobile.png"), fullPage: true });
});
