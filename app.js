const state = {
  convention: "Сочи",
  poolTarget: 20,
  initialPoolTarget: 20,
  raspassLevel: 0,
  themeColor: "#28733b",
  buttonTextColor: "#ffffff",
  headerButtonColor: "#ffffff",
  headerButtonTextColor: "#18202a",
  headerTextColor: "#ffffff",
  headerColor: "#28733b",
  backgroundColor: "#eef2f7",
  tableColor: "#ffffff",
  clothColor: "#ffffff",
  lineColor: "#3f454a",
  appearanceMode: "light",
  scoreCountingMode: "live",
  scoresCalculated: true,
  poolClosingMode: "each",
  players: ["Игрок 1", "Игрок 2", "Игрок 3"],
  pool: [0, 0, 0],
  mountain: [0, 0, 0],
  whists: [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
  scoreLog: null,
  lastScoreDelta: [0, 0, 0],
  lastChanged: null,
  history: [],
  customConventions: [],
  gameId: null,
  remoteUpdatedAt: null,
};

const STANDARD_CONVENTIONS = {
  "Сочи": {
    name: "Сочи",
    game6: 2,
    game7: 4,
    game8: 6,
    game9: 8,
    game10: 10,
    gamePenaltyMultiplier: 1,
    whistTrickMultiplier: 1,
    whistPenaltyMultiplier: 1,
    declarerRemizWhistMode: "gentleman",
    whistResponsibility: "half",
    raspassProgression: "none",
    raspassProgressionStop: "cycle",
    raspassExitCondition: "game",
    raspassZeroTricksPool: false,
    raspassScoringMode: "mountain",
    gameWinWriteMode: "pool",
    raspassTalonMode: "standard",
    underThreeLoss: false,
    misereExitsRaspass: false,
    greedyWhist: "no",
    restingTalonPool: "no",
    restingRaspassMountain: "no",
    whistShortfallDistribution: "whisters",
    whistRequirementMode: "together",
    minWhist6: 4,
    minWhist7: 2,
    minWhist8: 1,
    minWhist9: 1,
    minWhist10: 0,
    poolUnit: 10,
    mountainUnit: 10,
    notes: "",
  },
  "Питер": {
    name: "Питер",
    game6: 2,
    game7: 4,
    game8: 6,
    game9: 8,
    game10: 10,
    gamePenaltyMultiplier: 1,
    whistTrickMultiplier: 2,
    whistPenaltyMultiplier: 1,
    declarerRemizWhistMode: "greedy",
    whistResponsibility: "half",
    raspassProgression: "6-7-8",
    raspassProgressionStop: "cycle",
    raspassExitCondition: "one-whister-no-penalty",
    raspassZeroTricksPool: true,
    raspassScoringMode: "mountain",
    gameWinWriteMode: "pool",
    raspassTalonMode: "standard",
    underThreeLoss: false,
    misereExitsRaspass: false,
    greedyWhist: "yes",
    restingTalonPool: "no",
    restingRaspassMountain: "no",
    whistShortfallDistribution: "whisters",
    whistRequirementMode: "together",
    minWhist6: 4,
    minWhist7: 2,
    minWhist8: 1,
    minWhist9: 1,
    minWhist10: 0,
    poolUnit: 20,
    mountainUnit: 10,
    notes: "",
  },
  "Ростов": {
    name: "Ростов",
    game6: 2,
    game7: 4,
    game8: 6,
    game9: 8,
    game10: 10,
    gamePenaltyMultiplier: 1,
    whistTrickMultiplier: 1,
    whistPenaltyMultiplier: 1,
    declarerRemizWhistMode: "gentleman",
    whistResponsibility: "half",
    raspassProgression: "none",
    raspassProgressionStop: "cycle",
    raspassExitCondition: "game",
    raspassZeroTricksPool: false,
    raspassScoringMode: "rostov-whist",
    gameWinWriteMode: "mountain-first",
    raspassTalonMode: "closed",
    underThreeLoss: false,
    misereExitsRaspass: false,
    greedyWhist: "no",
    restingTalonPool: "no",
    restingRaspassMountain: "no",
    whistShortfallDistribution: "whisters",
    whistRequirementMode: "together",
    minWhist6: 4,
    minWhist7: 2,
    minWhist8: 1,
    minWhist9: 1,
    minWhist10: 0,
    poolUnit: 10,
    mountainUnit: 10,
    notes: "Ростов: прикуп на распасах не открывается; взявший минимум пишет висты на остальных; успешная игра сначала уменьшает гору.",
  },
};

const FIXED_GAME_VALUES = {
  6: 2,
  7: 4,
  8: 6,
  9: 8,
  10: 10,
};

const AUTOSAVE_KEY = "preferans.autosave.v1";
const TABLE_IMAGE_DB_NAME = "preferans.table-image.v1";
const TABLE_IMAGE_STORE = "assets";
const TABLE_IMAGE_KEY = "tableBackground";
const TABLE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const TABLE_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);
const COLOR_PALETTE = [
  "#111827", "#374151", "#6b7280", "#d1d5db", "#ffffff",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#16a34a", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#2563eb", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899", "#f43f5e", "#7f1d1d", "#92400e",
  "#365314", "#064e3b", "#164e63", "#1e3a8a", "#581c87", "#831843",
];
const THEME_COLOR_INPUT_IDS = [
  "headerColor", "headerButtonColor", "headerButtonTextColor", "headerTextColor",
  "themeColor", "buttonTextColor", "backgroundColor", "tableColor", "clothColor", "lineColor",
];


let undoStack = [];
let redoStack = [];
let wizardStep = 1;
let wasFullyClosed = false;
let lastRecordOutcome = null;
let autosaveRestoreStatus = "";
let deferredInstallPrompt = null;
let remoteDb = null;
let remoteUnsubscribe = null;
let remoteSaveTimer = null;
let applyingRemoteState = false;
let remoteAvailable = false;
let tableImageObjectUrl = "";
let tableImageLoaded = false;
let activePaletteInput = null;


const el = {
  appHeader: document.querySelector(".app-header"),
  mobileMenuButton: document.getElementById("mobileMenuButton"),
  headerActions: document.getElementById("headerActions"),
  themeColorMeta: document.querySelector('meta[name="theme-color"]'),
  convention: document.getElementById("convention"),
  poolTarget: document.getElementById("poolTarget"),
  themeColor: document.getElementById("themeColor"),
  buttonTextColor: document.getElementById("buttonTextColor"),
  headerButtonColor: document.getElementById("headerButtonColor"),
  headerButtonTextColor: document.getElementById("headerButtonTextColor"),
  headerTextColor: document.getElementById("headerTextColor"),
  headerColor: document.getElementById("headerColor"),
  backgroundColor: document.getElementById("backgroundColor"),
  tableColor: document.getElementById("tableColor"),
  clothColor: document.getElementById("clothColor"),
  lineColor: document.getElementById("lineColor"),
  tableImageDropzone: document.getElementById("tableImageDropzone"),
  tableImageInput: document.getElementById("tableImageInput"),
  tableImagePreview: document.getElementById("tableImagePreview"),
  tableImagePreviewImg: document.getElementById("tableImagePreviewImg"),
  removeTableImageButton: document.getElementById("removeTableImageButton"),
  tableImageError: document.getElementById("tableImageError"),
  colorPalette: document.getElementById("mobileColorPalette"),
  paletteTargetLabel: document.getElementById("paletteTargetLabel"),
  paletteTargetSelect: document.getElementById("paletteTargetSelect"),
  paletteHexInput: document.getElementById("paletteHexInput"),
  paletteSwatches: document.getElementById("paletteSwatches"),
  paletteError: document.getElementById("paletteError"),
  closePaletteButton: document.getElementById("closePaletteButton"),
  lightModeButton: document.getElementById("lightModeButton"),
  darkModeButton: document.getElementById("darkModeButton"),
  scoreCountingMode: document.getElementById("scoreCountingMode"),
  poolClosingMode: document.getElementById("poolClosingMode"),
  playerCount: document.getElementById("playerCount"),
  playersSetup: document.getElementById("playersSetup"),
  startButton: document.getElementById("startButton"),
  gameType: document.getElementById("gameType"),
  declarer: document.getElementById("declarer"),
  declarerButtons: document.getElementById("declarerButtons"),
  declarerField: document.getElementById("declarerField"),
  contract: document.getElementById("contract"),
  contractButtons: document.getElementById("contractButtons"),
  contractField: document.getElementById("contractField"),
  roundRows: document.getElementById("roundRows"),
  roundStepTitle: document.getElementById("roundStepTitle"),
  roundRoleColumn: document.getElementById("roundRoleColumn"),
  misereCardsPanel: document.getElementById("misereCardsPanel"),
  misereReviewPanel: document.getElementById("misereReviewPanel"),
  misereReviewCards: document.getElementById("misereReviewCards"),
  manualPanel: document.getElementById("manualPanel"),
  manualPlayer: document.getElementById("manualPlayer"),
  manualArea: document.getElementById("manualArea"),
  manualTarget: document.getElementById("manualTarget"),
  manualAmount: document.getElementById("manualAmount"),
  manualNote: document.getElementById("manualNote"),
  addButton: document.getElementById("addButton"),
  resetButton: document.getElementById("resetButton"),
  message: document.getElementById("message"),
  gameCaption: document.getElementById("gameCaption"),
  statusTitle: document.getElementById("statusTitle"),
  conventionDescription: document.getElementById("conventionDescription"),
  gameConventionDescription: document.getElementById("gameConventionDescription"),
  conventionPanel: document.getElementById("conventionPanel"),
  conventionModalSelect: document.getElementById("conventionModalSelect"),
  conventionName: document.getElementById("conventionName"),
  conventionSettingInputs: [...document.querySelectorAll("[data-convention-setting]")],
  closedBadge: document.getElementById("closedBadge"),
  poolSheet: document.getElementById("poolSheet"),
  calculateScoresButton: document.getElementById("calculateScoresButton"),
  addPoolButton: document.getElementById("addPoolButton"),
  addPoolModal: document.getElementById("addPoolModal"),
  newPoolTarget: document.getElementById("newPoolTarget"),
  addPoolHint: document.getElementById("addPoolHint"),
  cancelAddPoolButton: document.getElementById("cancelAddPoolButton"),
  confirmAddPoolButton: document.getElementById("confirmAddPoolButton"),
  scoreBody: document.getElementById("scoreBody"),
  historyList: document.getElementById("historyList"),
  possibleGamesCard: document.getElementById("possibleGamesCard"),
  possibleGamesList: document.getElementById("possibleGamesList"),
  openRecordButton: document.getElementById("openRecordButton"),
  floatingRecordButton: document.getElementById("floatingRecordButton"),
  floatingShareButton: document.getElementById("floatingShareButton"),
  shareQrPopover: document.getElementById("shareQrPopover"),
  shareQrCode: document.getElementById("shareQrCode"),
  recordModal: document.getElementById("recordModal"),
  recordTitle: document.getElementById("recordTitle"),
  closeRecordButton: document.getElementById("closeRecordButton"),
  prevStepButton: document.getElementById("prevStepButton"),
  nextStepButton: document.getElementById("nextStepButton"),
  recordDetailsTitle: document.getElementById("recordDetailsTitle"),
  stepDot1: document.getElementById("stepDot1"),
  stepDot2: document.getElementById("stepDot2"),
  stepDot3: document.getElementById("stepDot3"),
  typeChoices: document.getElementById("typeChoices"),
  newGameButton: document.getElementById("newGameButton"),
  settingsButton: document.getElementById("settingsButton"),
  rulesButton: document.getElementById("rulesButton"),
  conventionButton: document.getElementById("conventionButton"),
  colorSettingsDrawer: document.getElementById("colorSettingsDrawer"),
  closeSettingsButton: document.getElementById("closeSettingsButton"),
  resetColorSettingsButton: document.getElementById("resetColorSettingsButton"),
  installAppFooter: document.getElementById("installAppFooter"),
  installAppButton: document.getElementById("installAppButton"),
  conventionModal: document.getElementById("conventionModal"),
  closeConventionButton: document.getElementById("closeConventionButton"),
  rulesModal: document.getElementById("rulesModal"),
  closeRulesButton: document.getElementById("closeRulesButton"),
  undoButton: document.getElementById("undoButton"),
  redoButton: document.getElementById("redoButton"),
  saveButton: document.getElementById("saveButton"),
  loadInput: document.getElementById("loadInput"),
  reportButton: document.getElementById("reportButton"),
  scoreConfirmModal: document.getElementById("scoreConfirmModal"),
  cancelScoreCalculationButton: document.getElementById("cancelScoreCalculationButton"),
  confirmScoreCalculationButton: document.getElementById("confirmScoreCalculationButton"),
};

function initialize() {
  applyTheme();
  restoreTableImageFromStorage();
  registerServiceWorker();
  setupRemoteSync();
  const urlGameId = getUrlGameId();
  autosaveRestoreStatus = urlGameId ? "" : restoreAutosavedGame();
  renderConventionOptions();
  syncControlsFromState();
  renderConventionPanel();
  renderSetupPlayers();
  bindEvents();
  hydrateSelectors();
  renderRoundRows();
  refresh();
  if (urlGameId) loadRemoteGame(urlGameId);
  if (autosaveRestoreStatus === "failed") showMessage("Не удалось восстановить автосохранение.");
}

function bindEvents() {
  el.mobileMenuButton?.addEventListener("click", toggleMobileMenu);
  el.headerActions?.addEventListener("click", (event) => {
    const action = event.target.closest("button, label");
    if (action) window.setTimeout(closeMobileMenu, 0);
  });
  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 721px)").matches) closeMobileMenu();
  });
  el.playerCount.addEventListener("change", updateSetupPlayerCount);
  el.convention.addEventListener("change", selectConvention);
  el.conventionModalSelect?.addEventListener("change", selectConventionFromModal);
  el.conventionName.addEventListener("input", updateCustomConventionName);
  el.conventionSettingInputs.forEach((input) => input.addEventListener("input", updateConventionSetting));
  el.themeColor.addEventListener("input", updateThemeFromInputs);
  el.buttonTextColor.addEventListener("input", updateThemeFromInputs);
  el.headerButtonColor.addEventListener("input", updateThemeFromInputs);
  el.headerButtonTextColor.addEventListener("input", updateThemeFromInputs);
  el.headerTextColor.addEventListener("input", updateThemeFromInputs);
  el.headerColor.addEventListener("input", updateThemeFromInputs);
  el.backgroundColor.addEventListener("input", updateThemeFromInputs);
  el.tableColor.addEventListener("input", updateThemeFromInputs);
  el.clothColor.addEventListener("input", updateThemeFromInputs);
  el.lineColor.addEventListener("input", updateThemeFromInputs);
  colorPaletteInputs().forEach((input) => input.addEventListener("change", updateThemeFromInputs));
  bindColorPaletteControls();
  el.resetColorSettingsButton?.addEventListener("click", resetColorSettings);
  bindTableImageControls();
  el.installAppButton?.addEventListener("click", installApp);
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
  el.lightModeButton.addEventListener("click", () => setAppearanceMode("light"));
  el.darkModeButton.addEventListener("click", () => setAppearanceMode("dark"));
  el.poolClosingMode.addEventListener("change", () => {
    state.poolClosingMode = el.poolClosingMode.value === "total" ? "total" : "each";
    refresh();
    saveAutosavedGame();
  });
  el.startButton.addEventListener("click", startGame);
  el.calculateScoresButton.addEventListener("click", requestScoreCalculation);
  el.addPoolButton.addEventListener("click", openAddPoolModal);
  el.cancelAddPoolButton.addEventListener("click", closeAddPoolModal);
  el.confirmAddPoolButton.addEventListener("click", addPoolTarget);
  el.addPoolModal.addEventListener("click", (event) => {
    if (event.target === el.addPoolModal) closeAddPoolModal();
  });
  el.cancelScoreCalculationButton.addEventListener("click", closeScoreConfirmation);
  el.confirmScoreCalculationButton.addEventListener("click", confirmScoreCalculation);
  el.scoreConfirmModal.addEventListener("click", (event) => {
    if (event.target === el.scoreConfirmModal) closeScoreConfirmation();
  });
  el.gameType.addEventListener("change", renderRoundRows);
  el.manualArea.addEventListener("change", updateManualTargetState);
  el.openRecordButton.addEventListener("click", openRecordWizard);
  el.floatingRecordButton.addEventListener("click", openRecordWizard);
  el.floatingShareButton?.addEventListener("click", shareCurrentGame);
  el.possibleGamesList?.addEventListener("click", selectPossibleGame);
  document.addEventListener("click", closeShareQrOnOutsideClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideShareQrPopover();
  });
  el.closeRecordButton.addEventListener("click", closeRecordWizard);
  el.recordModal.addEventListener("click", (event) => {
    if (event.target === el.recordModal) closeRecordWizard();
  });
  el.prevStepButton.addEventListener("click", previousStep);
  el.nextStepButton.addEventListener("click", nextStep);
  el.typeChoices.addEventListener("click", selectType);
  el.declarerButtons.addEventListener("click", selectDeclarer);
  el.contractButtons.addEventListener("click", selectContract);
  el.misereCardsPanel.addEventListener("click", toggleMisereCard);
  el.misereReviewCards.addEventListener("click", toggleMisereReviewCard);
  el.addButton.addEventListener("click", addRecord);
  el.resetButton.addEventListener("click", resetScores);
  el.newGameButton.addEventListener("click", newGame);
  el.settingsButton.addEventListener("click", openColorSettings);
  el.closeSettingsButton.addEventListener("click", closeColorSettings);
  el.colorSettingsDrawer.addEventListener("click", (event) => {
    if (event.target === el.colorSettingsDrawer) closeColorSettings();
  });
  el.rulesButton.addEventListener("click", openRulesModal);
  el.conventionButton.addEventListener("click", openConventionModal);
  el.closeConventionButton.addEventListener("click", closeConventionModal);
  el.conventionModal.addEventListener("click", (event) => {
    if (event.target === el.conventionModal) closeConventionModal();
  });
  el.closeRulesButton.addEventListener("click", closeRulesModal);
  el.rulesModal.addEventListener("click", (event) => {
    if (event.target === el.rulesModal) closeRulesModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRecordWizard();
      closeScoreConfirmation();
      closeAddPoolModal();
      closeRulesModal();
      closeConventionModal();
      closeColorSettings();
      closeMobileMenu();
    }
  });
  el.undoButton.addEventListener("click", undoRecord);
  el.redoButton.addEventListener("click", redoRecord);
  el.saveButton.addEventListener("click", saveGame);
  el.loadInput.addEventListener("change", loadGame);
  el.reportButton.addEventListener("click", copyReport);
}

function renderSetupPlayers() {
  const count = Number(el.playerCount.value);
  el.playersSetup.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const label = document.createElement("label");
    label.innerHTML = `<span>Игрок ${i + 1}</span><input data-player-name="${i}" value="${state.players[i] || `Игрок ${i + 1}`}">`;
    el.playersSetup.appendChild(label);
  }
  el.playersSetup.querySelectorAll("[data-player-name]").forEach((input) => {
    input.addEventListener("input", updatePreviewPlayerNames);
  });
  renderConventionPanel();
}

function updatePreviewPlayerNames() {
  if (gameStarted()) return;
  state.players = [...document.querySelectorAll("[data-player-name]")]
    .map((input, index) => input.value.trim() || `Игрок ${index + 1}`);
  hydrateSelectors();
  renderRoundRows();
  refresh();
}

function updateSetupPlayerCount() {
  if (!gameStarted()) {
    resizePreviewPlayers(Number(el.playerCount.value));
  }
  renderSetupPlayers();
  hydrateSelectors();
  renderRoundRows();
  refresh();
}

function resizePreviewPlayers(count) {
  const names = [...document.querySelectorAll("[data-player-name]")]
    .map((input, index) => input.value.trim() || state.players[index] || `Игрок ${index + 1}`);
  state.players = Array.from({ length: count }, (_, index) => names[index] || state.players[index] || `Игрок ${index + 1}`);
  state.pool = state.players.map((_, index) => Number(state.pool[index] || 0));
  state.mountain = state.players.map((_, index) => Number(state.mountain[index] || 0));
  state.whists = state.players.map((_, i) => state.players.map((__, j) => Number((state.whists[i] || [])[j] || 0)));
  state.scoreLog = createScoreLog();
  state.lastChanged = null;
}

function standardConventionNames() {
  return Object.keys(STANDARD_CONVENTIONS);
}

function allConventions() {
  return [
    ...standardConventionNames().map((name) => cloneConvention(STANDARD_CONVENTIONS[name])),
    ...state.customConventions,
  ];
}

function cloneConvention(convention) {
  return JSON.parse(JSON.stringify(convention));
}

function saveAutosavedGame() {
  if (!gameStarted()) return;
  if (!applyingRemoteState) state.remoteUpdatedAt = Date.now();
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ started: true, state }));
  } catch (error) {
    // Local storage can be unavailable in some privacy modes; manual save still works.
  }
  if (!applyingRemoteState) queueRemoteSave();
}

function clearAutosavedGame() {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch (error) {
    // Ignore storage failures; this should never block the UI.
  }
}

function restoreAutosavedGame() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    if (!parsed?.started || !parsed.state) return "";
    Object.assign(state, normalizeState(parsed.state));
    ensureScoreLog();
    document.body.classList.add("game-started");
    return "restored";
  } catch (error) {
    clearAutosavedGame();
    return "failed";
  }
}

function normalizeRemizWhistMode(source = {}, fallback = STANDARD_CONVENTIONS["Сочи"]) {
  if (["gentleman", "greedy"].includes(source.declarerRemizWhistMode)) return source.declarerRemizWhistMode;
  if (source.whistPreset === "greedy" || source.whistPreset === "responsible") return "greedy";
  if (source.whistPreset === "gentleman") return "gentleman";
  if (source.greedyWhist === "yes") return "greedy";
  if (source.greedyWhist === "no") return "gentleman";
  return fallback.declarerRemizWhistMode || "gentleman";
}

function normalizeWhistResponsibility(source = {}, fallback = STANDARD_CONVENTIONS["Сочи"]) {
  if (["half", "full"].includes(source.whistResponsibility)) return source.whistResponsibility;
  if (source.whistPreset === "responsible") return "full";
  if (source.whistPenaltyMultiplier != null && source.gamePenaltyMultiplier != null) {
    return Number(source.whistPenaltyMultiplier) >= Number(source.gamePenaltyMultiplier) ? "full" : "half";
  }
  return fallback.whistResponsibility || "half";
}

function normalizeWhistRequirementMode(source = {}, fallback = STANDARD_CONVENTIONS["Сочи"]) {
  if (["together", "each"].includes(source.whistRequirementMode)) return source.whistRequirementMode;
  if (source.whistPreset === "responsible") return "each";
  return fallback.whistRequirementMode || "together";
}

function currentConvention() {
  return allConventions().find((item) => item.name === state.convention) || cloneConvention(STANDARD_CONVENTIONS["Сочи"]);
}

function renderConventionOptions() {
  const selected = state.convention;
  const options = allConventions()
    .map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`)
    .join("");
  const value = allConventions().some((item) => item.name === selected) ? selected : "Сочи";
  if (el.convention) {
    el.convention.innerHTML = options;
    el.convention.value = value;
  }
  if (el.conventionModalSelect) {
    el.conventionModalSelect.innerHTML = options;
    el.conventionModalSelect.value = value;
    el.conventionModalSelect.disabled = document.body.classList.contains("game-started");
  }
  state.convention = value;
}

function renderConventionPanel() {
  const convention = currentConvention();
  const locked = document.body.classList.contains("game-started");
  const isCustom = !standardConventionNames().includes(convention.name);
  const title = document.getElementById("conventionSettingsTitle");
  if (title) title.textContent = locked ? "Конвенция" : "Настройки конвенции";
  if (el.conventionModalSelect) {
    el.conventionModalSelect.value = convention.name;
    el.conventionModalSelect.disabled = locked;
  }
  if (el.conventionName) {
    el.conventionName.value = convention.name;
    el.conventionName.disabled = locked || !isCustom;
  }
  el.conventionSettingInputs.forEach((input) => {
    if (input.type === "checkbox") input.checked = checkboxSettingChecked(input.dataset.conventionSetting, convention);
    else input.value = convention[input.dataset.conventionSetting] ?? "";
    input.disabled = locked;
  });
  updateConventionDependencyStates(locked);
  if (el.gameConventionDescription) el.gameConventionDescription.textContent = "";
  if (el.conventionDescription) el.conventionDescription.textContent = "";
}

function selectConvention() {
  state.convention = el.convention.value;
  renderConventionOptions();
  renderConventionPanel();
  refresh();
}

function selectConventionFromModal() {
  state.convention = el.conventionModalSelect.value;
  renderConventionOptions();
  renderConventionPanel();
  refresh();
}

function updateCustomConventionName() {
  const convention = currentConvention();
  if (standardConventionNames().includes(convention.name)) return;
  const name = el.conventionName.value.trim();
  const custom = state.customConventions.find((item) => item.name === state.convention);
  if (!custom || !name) return;
  custom.name = uniqueConventionName(name, custom);
  state.convention = custom.name;
  renderConventionOptions();
  el.conventionName.value = custom.name;
}

function updateConventionSetting(event) {
  if (document.body.classList.contains("game-started")) return;
  const convention = ensureCustomConvention();
  const key = event.target.dataset.conventionSetting;
  convention[key] = settingValue(event.target, convention[key]);
  if (key === "declarerRemizWhistMode") {
    convention.greedyWhist = convention.declarerRemizWhistMode === "greedy" ? "yes" : "no";
  }
  renderConventionOptions();
  renderConventionPanel();
  refresh();
}

function updateConventionDependencyStates(locked) {
  const current = currentConvention();
  const raspassDisabled = locked || current.raspassProgression === "none";
  ["raspassProgressionStop"].forEach((key) => {
    const input = document.querySelector(`[data-convention-setting="${key}"]`);
    if (input) input.disabled = raspassDisabled;
  });
  const exitDisabled = locked || current.raspassProgression === "none";
  const exitInput = document.querySelector('[data-convention-setting="raspassExitCondition"]');
  if (exitInput) exitInput.disabled = exitDisabled;

  ["restingTalonPool", "restingRaspassMountain"].forEach((key) => {
    const input = document.querySelector(`[data-convention-setting="${key}"]`);
    if (!input) return;
    const disabled = locked || state.players.length === 3 || (key === "restingRaspassMountain" && current.raspassTalonMode === "closed");
    input.disabled = disabled;
    input.closest("label")?.classList.toggle("disabled-field", disabled);
  });
}

function settingValue(input, fallback) {
  if (input.type === "checkbox") {
    if (yesNoConventionSettings().includes(input.dataset.conventionSetting)) return input.checked ? "yes" : "no";
    return input.checked;
  }
  if (input.tagName === "SELECT" || input.tagName === "TEXTAREA") return input.value;
  return clampNumber(input.value, Number(input.min || 0), Number(input.max || 1000), fallback);
}

function yesNoConventionSettings() {
  return ["restingTalonPool", "restingRaspassMountain"];
}

function checkboxSettingChecked(key, convention) {
  const value = convention[key];
  if (yesNoConventionSettings().includes(key)) return value === "yes" || value === true;
  return Boolean(value);
}

function ensureCustomConvention() {
  const current = currentConvention();
  if (!standardConventionNames().includes(current.name)) return current;
  const custom = cloneConvention(current);
  custom.name = uniqueConventionName("Своя конвенция");
  state.customConventions.push(custom);
  state.convention = custom.name;
  return custom;
}

function uniqueConventionName(base, currentItem) {
  const cleanBase = base.trim() || "Своя конвенция";
  const existing = allConventions()
    .filter((item) => item !== currentItem)
    .map((item) => item.name);
  if (!existing.includes(cleanBase)) return cleanBase;
  let index = 2;
  while (existing.includes(`${cleanBase} ${index}`)) index += 1;
  return `${cleanBase} ${index}`;
}

function normalizeConventionConfig(source) {
  const fallback = STANDARD_CONVENTIONS["Сочи"];
  const whistRequirementMode = normalizeWhistRequirementMode(source, fallback);
  const declarerRemizWhistMode = normalizeRemizWhistMode(source, fallback);
  const whistResponsibility = normalizeWhistResponsibility(source, fallback);
  return {
    name: String(source.name || "Своя конвенция"),
    game6: Number(source.game6 ?? fallback.game6),
    game7: Number(source.game7 ?? fallback.game7),
    game8: Number(source.game8 ?? fallback.game8),
    game9: Number(source.game9 ?? fallback.game9),
    game10: Number(source.game10 ?? fallback.game10),
    gamePenaltyMultiplier: Number(source.gamePenaltyMultiplier ?? fallback.gamePenaltyMultiplier),
    whistTrickMultiplier: Number(source.whistTrickMultiplier ?? fallback.whistTrickMultiplier),
    whistPenaltyMultiplier: Number(source.whistPenaltyMultiplier ?? fallback.whistPenaltyMultiplier),
    declarerRemizWhistMode,
    whistResponsibility,
    raspassProgression: normalizeProgression(source.raspassProgression || fallback.raspassProgression),
    raspassProgressionStop: normalizeRaspassProgressionStop(source.raspassProgressionStop, fallback.raspassProgressionStop),
    raspassExitCondition: source.raspassExitCondition || fallback.raspassExitCondition,
    raspassZeroTricksPool: normalizeRaspassZeroTricksPool(source.raspassZeroTricksPool, fallback.raspassZeroTricksPool),
    raspassScoringMode: normalizeRaspassScoringMode(source.raspassScoringMode, fallback.raspassScoringMode),
    gameWinWriteMode: normalizeGameWinWriteMode(source.gameWinWriteMode, fallback.gameWinWriteMode),
    raspassTalonMode: normalizeRaspassTalonMode(source.raspassTalonMode, fallback.raspassTalonMode),
    underThreeLoss: Boolean(source.underThreeLoss ?? fallback.underThreeLoss),
    misereExitsRaspass: Boolean(source.misereExitsRaspass ?? fallback.misereExitsRaspass),
    greedyWhist: declarerRemizWhistMode === "greedy" ? "yes" : "no",
    restingTalonPool: normalizeYesNoSetting(source.restingTalonPool, fallback.restingTalonPool),
    restingRaspassMountain: normalizeYesNoSetting(source.restingRaspassMountain, fallback.restingRaspassMountain),
    whistShortfallDistribution: source.whistShortfallDistribution || fallback.whistShortfallDistribution,
    whistRequirementMode,
    minWhist6: Number(source.minWhist6 ?? source.minWhistTricks ?? fallback.minWhist6),
    minWhist7: Number(source.minWhist7 ?? source.minWhistTricks ?? fallback.minWhist7),
    minWhist8: Number(source.minWhist8 ?? source.minWhistTricks ?? fallback.minWhist8),
    minWhist9: Number(source.minWhist9 ?? fallback.minWhist9 ?? 1),
    minWhist10: Number(source.minWhist10 ?? fallback.minWhist10 ?? 0),
    poolUnit: Number(source.poolUnit ?? fallback.poolUnit),
    mountainUnit: Number(source.mountainUnit ?? source.poolUnit ?? fallback.mountainUnit ?? fallback.poolUnit),
    notes: source.notes || "",
  };
}

function normalizeYesNoSetting(value, fallback) {
  if (value === true || value === "yes") return "yes";
  if (value === false || value === "no") return "no";
  return fallback;
}

function normalizeRaspassScoringMode(value, fallback = "mountain") {
  return ["mountain", "rostov-whist"].includes(value) ? value : fallback || "mountain";
}

function normalizeGameWinWriteMode(value, fallback = "pool") {
  return ["pool", "mountain-first"].includes(value) ? value : fallback || "pool";
}

function normalizeRaspassTalonMode(value, fallback = "standard") {
  return ["standard", "closed"].includes(value) ? value : fallback || "standard";
}

function normalizeRaspassProgressionStop(value, fallback = "cycle") {
  const normalized = value === "cycle-until-game" ? "until-game" : value;
  if (["cycle", "until-game"].includes(normalized)) return normalized;
  return ["cycle", "until-game"].includes(fallback) ? fallback : "cycle";
}

function normalizeProgression(value) {
  if (value === "linear" || value === "double") return "6-7-8";
  return ["none", "6-7-8", "6-7-7-8", "6-7-8-9"].includes(value) ? value : "none";
}

function normalizeRaspassZeroTricksPool(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return value === "true" || Number(value) > 0;
  return Boolean(fallback);
}

function defaultHeaderButtonColor(mode = state.appearanceMode) {
  return mode === "dark" ? "#1f2937" : "#ffffff";
}

function defaultHeaderButtonTextColor(mode = state.appearanceMode) {
  return mode === "dark" ? "#ffffff" : "#18202a";
}

function defaultHeaderTextColor() {
  return "#ffffff";
}

function defaultTableColor(mode = state.appearanceMode) {
  return mode === "dark" ? "#2b313a" : "#ffffff";
}

function defaultSheetColor(mode = state.appearanceMode) {
  return mode === "dark" ? "#20252c" : "#ffffff";
}

function defaultLineColor(mode = state.appearanceMode) {
  return mode === "dark" ? "#F5F5F5" : "#3f454a";
}

function defaultThemeColors(mode = state.appearanceMode) {
  return {
    themeColor: "#28733b",
    buttonTextColor: "#ffffff",
    headerButtonColor: defaultHeaderButtonColor(mode),
    headerButtonTextColor: defaultHeaderButtonTextColor(mode),
    headerTextColor: defaultHeaderTextColor(),
    headerColor: "#28733b",
    backgroundColor: mode === "dark" ? "#252a31" : "#eef2f7",
    tableColor: defaultTableColor(mode),
    clothColor: defaultSheetColor(mode),
    lineColor: defaultLineColor(mode),
  };
}

function colorsMatchDefaults(mode = state.appearanceMode) {
  const defaults = defaultThemeColors(mode);
  const colorsDefault = Object.entries(defaults).every(([key, value]) => (state[key] || value).toLowerCase() === value.toLowerCase());
  return colorsDefault && !tableImageLoaded;
}

function syncColorResetButton() {
  if (!el.resetColorSettingsButton) return;
  el.resetColorSettingsButton.disabled = colorsMatchDefaults();
}

async function resetColorSettings() {
  Object.assign(state, defaultThemeColors());
  await clearTableImage();
  applyTheme();
  saveAutosavedGame();
}
function bindTableImageControls() {
  if (!el.tableImageDropzone || !el.tableImageInput) return;
  el.tableImageDropzone.addEventListener("click", () => el.tableImageInput.click());
  el.tableImageInput.addEventListener("change", () => handleTableImageFiles(el.tableImageInput.files));
  ["dragenter", "dragover"].forEach((eventName) => {
    el.tableImageDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      el.tableImageDropzone.classList.add("drag-over");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    el.tableImageDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      el.tableImageDropzone.classList.remove("drag-over");
    });
  });
  el.tableImageDropzone.addEventListener("drop", (event) => handleTableImageFiles(event.dataTransfer?.files));
  el.removeTableImageButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearTableImage();
  });
  el.removeTableImageButton?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    clearTableImage();
  });
}

async function handleTableImageFiles(fileList) {
  const file = fileList?.[0];
  if (!file) return;
  clearTableImageError();
  if (!TABLE_IMAGE_TYPES.has(file.type)) {
    showTableImageError("\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044e\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e PNG \u0438 JPEG.");
    resetTableImageInput();
    return;
  }
  if (file.size > TABLE_IMAGE_MAX_BYTES) {
    showTableImageError("\u041a\u0430\u0440\u0442\u0438\u043d\u043a\u0430 \u0431\u043e\u043b\u044c\u0448\u0435 20 \u041c\u0411. \u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u0430\u0439\u043b \u043f\u043e\u043c\u0435\u043d\u044c\u0448\u0435.");
    resetTableImageInput();
    return;
  }
  try {
    await saveTableImageToStorage(file);
    setTableImageBlob(file);
    clearTableImageError();
    resetTableImageInput();
  } catch (error) {
    console.warn("Table image save failed", error);
    showTableImageError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043a\u0430\u0440\u0442\u0438\u043d\u043a\u0443 \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.");
  }
}

function setTableImageBlob(blob) {
  if (tableImageObjectUrl) URL.revokeObjectURL(tableImageObjectUrl);
  tableImageObjectUrl = URL.createObjectURL(blob);
  tableImageLoaded = true;
  renderTableImagePreview();
  applyTheme();
}

function renderTableImagePreview() {
  if (!el.tableImageDropzone || !el.tableImagePreview || !el.tableImagePreviewImg) return;
  el.tableImageDropzone.classList.toggle("has-image", tableImageLoaded);
  el.tableImagePreview.hidden = !tableImageLoaded;
  if (tableImageLoaded) el.tableImagePreviewImg.src = tableImageObjectUrl;
  else el.tableImagePreviewImg.removeAttribute("src");
  syncColorResetButton();
  if (activePaletteInput) syncColorPalette(activePaletteInput);
  applySheetLineColorToSvg();
}

async function restoreTableImageFromStorage() {
  try {
    const stored = await readTableImageFromStorage();
    if (stored?.blob) setTableImageBlob(stored.blob);
    else renderTableImagePreview();
  } catch (error) {
    console.warn("Table image restore failed", error);
    renderTableImagePreview();
  }
}

async function clearTableImage() {
  try {
    await deleteTableImageFromStorage();
  } catch (error) {
    console.warn("Table image delete failed", error);
  }
  if (tableImageObjectUrl) URL.revokeObjectURL(tableImageObjectUrl);
  tableImageObjectUrl = "";
  tableImageLoaded = false;
  renderTableImagePreview();
  clearTableImageError();
  resetTableImageInput();
  applyTheme();
}

function showTableImageError(message) {
  if (el.tableImageError) el.tableImageError.textContent = message;
}

function clearTableImageError() {
  if (el.tableImageError) el.tableImageError.textContent = "";
}

function resetTableImageInput() {
  if (el.tableImageInput) el.tableImageInput.value = "";
}

function openTableImageDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(TABLE_IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(TABLE_IMAGE_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withTableImageStore(mode, action) {
  const db = await openTableImageDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TABLE_IMAGE_STORE, mode);
    const store = transaction.objectStore(TABLE_IMAGE_STORE);
    const request = action(store);
    transaction.oncomplete = () => {
      db.close();
      resolve(request?.result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function saveTableImageToStorage(file) {
  return withTableImageStore("readwrite", (store) => store.put({
    blob: file,
    name: file.name,
    type: file.type,
    size: file.size,
    updatedAt: Date.now(),
  }, TABLE_IMAGE_KEY));
}

function readTableImageFromStorage() {
  return withTableImageStore("readonly", (store) => store.get(TABLE_IMAGE_KEY));
}

function deleteTableImageFromStorage() {
  return withTableImageStore("readwrite", (store) => store.delete(TABLE_IMAGE_KEY));
}

function setAppearanceMode(mode) {
  const nextMode = mode === "dark" ? "dark" : "light";
  if (state.appearanceMode === nextMode) return;
  const wasDefaultLightBg = state.backgroundColor === "#eef2f7";
  const wasDefaultDarkBg = state.backgroundColor === "#252a31";
  const wasDefaultHeaderButton = !state.headerButtonColor || state.headerButtonColor === defaultHeaderButtonColor(state.appearanceMode);
  const wasDefaultHeaderButtonText = !state.headerButtonTextColor || state.headerButtonTextColor === defaultHeaderButtonTextColor(state.appearanceMode);
  const wasDefaultTable = !state.tableColor || state.tableColor === defaultTableColor(state.appearanceMode);
  const wasDefaultCloth = !state.clothColor || state.clothColor === defaultSheetColor(state.appearanceMode);
  const wasDefaultLine = !state.lineColor || state.lineColor === defaultLineColor(state.appearanceMode);
  state.appearanceMode = nextMode;
  if (nextMode === "dark" && wasDefaultLightBg) state.backgroundColor = "#252a31";
  if (nextMode === "light" && wasDefaultDarkBg) state.backgroundColor = "#eef2f7";
  if (wasDefaultHeaderButton) state.headerButtonColor = defaultHeaderButtonColor(nextMode);
  if (wasDefaultHeaderButtonText) state.headerButtonTextColor = defaultHeaderButtonTextColor(nextMode);
  if (wasDefaultTable) state.tableColor = defaultTableColor(nextMode);
  if (wasDefaultCloth) state.clothColor = defaultSheetColor(nextMode);
  if (wasDefaultLine) state.lineColor = defaultLineColor(nextMode);
  applyTheme();
  saveAutosavedGame();
}

function syncAppearanceModeControls() {
  const dark = state.appearanceMode === "dark";
  if (el.lightModeButton) {
    el.lightModeButton.classList.toggle("active", !dark);
    el.lightModeButton.setAttribute("aria-pressed", String(!dark));
  }
  if (el.darkModeButton) {
    el.darkModeButton.classList.toggle("active", dark);
    el.darkModeButton.setAttribute("aria-pressed", String(dark));
  }
}

function updateThemeFromInputs() {
  state.themeColor = el.themeColor.value || "#28733b";
  state.buttonTextColor = el.buttonTextColor.value || "#ffffff";
  state.headerButtonColor = el.headerButtonColor.value || defaultHeaderButtonColor();
  state.headerButtonTextColor = el.headerButtonTextColor.value || defaultHeaderButtonTextColor();
  state.headerTextColor = el.headerTextColor.value || defaultHeaderTextColor();
  state.headerColor = el.headerColor.value || state.themeColor || "#28733b";
  state.backgroundColor = el.backgroundColor.value || (state.appearanceMode === "dark" ? "#252a31" : "#eef2f7");
  state.tableColor = el.tableColor.value || defaultTableColor();
  state.clothColor = el.clothColor.value || defaultSheetColor();
  state.lineColor = el.lineColor.value || defaultLineColor();
  applyTheme();
  saveAutosavedGame();
}

function bindColorPaletteControls() {
  if (!el.colorPalette || !el.paletteSwatches) return;
  el.colorPalette.hidden = true;
  if (!el.paletteSwatches.dataset.ready) {
    COLOR_PALETTE.forEach((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "palette-swatch";
      button.style.setProperty("--swatch", color);
      button.dataset.color = color;
      button.setAttribute("aria-label", color);
      button.addEventListener("click", () => applyPaletteColor(color));
      el.paletteSwatches.appendChild(button);
    });
    el.paletteSwatches.dataset.ready = "true";
  }

  colorPaletteInputs().forEach((input) => {
    const field = input.closest(".color-field");
    const requestPalette = (event) => {
      if (!isMobileColorPaletteTarget(input)) return;
      event.preventDefault();
      event.stopPropagation();
      input.blur();
      openColorPalette(input);
    };
    field?.addEventListener("click", requestPalette);
    input.addEventListener("pointerdown", requestPalette);
    input.addEventListener("click", requestPalette);
    input.addEventListener("focus", () => {
      if (isMobileColorPaletteTarget(input)) openColorPalette(input);
    });
    input.addEventListener("input", () => {
      if (activePaletteInput === input && !el.colorPalette.hidden) syncColorPalette(input);
    });
  });

  el.colorPalette.addEventListener("click", (event) => {
    if (event.target === el.colorPalette) closeColorPalette();
  });
  el.closePaletteButton?.addEventListener("click", closeColorPalette);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeColorPalette();
  });
  window.addEventListener("resize", () => {
    if (!isMobileColorPaletteTarget(activePaletteInput)) closeColorPalette();
  });
  el.paletteHexInput?.addEventListener("input", () => {
    const normalized = normalizeHexInput(el.paletteHexInput.value);
    if (!normalized) {
      setPaletteError(el.paletteHexInput.value.trim() ? "Введите цвет в формате #RRGGBB." : "");
      return;
    }
    applyPaletteColor(normalized, { keepFocus: true });
  });
}

function colorPaletteInputs() {
  return THEME_COLOR_INPUT_IDS.map((id) => el[id]).filter(Boolean);
}

function isMobileColorPaletteTarget(input) {
  return Boolean(input && colorPaletteInputs().includes(input) && window.matchMedia("(max-width: 720px)").matches);
}

function closeColorPalette() {
  if (el.colorPalette) el.colorPalette.hidden = true;
  activePaletteInput = null;
  setPaletteError("");
}

function openColorPalette(input) {
  if (!input || !el.colorPalette || !isMobileColorPaletteTarget(input)) {
    closeColorPalette();
    return;
  }
  activePaletteInput = input;
  el.colorPalette.hidden = false;
  syncColorPalette(input);
}
function syncColorPalette(input = activePaletteInput) {
  if (!input || !el.colorPalette) return;
  activePaletteInput = input;
  const value = normalizeHexInput(input.value) || "#000000";
  const label = input.closest(".color-field")?.querySelector("span")?.textContent?.trim() || "Цвет";
  if (el.paletteTargetLabel) el.paletteTargetLabel.textContent = label;
  if (el.paletteTargetSelect && el.paletteTargetSelect.value !== input.id) el.paletteTargetSelect.value = input.id;
  if (el.paletteHexInput && document.activeElement !== el.paletteHexInput) el.paletteHexInput.value = value;
  el.paletteSwatches?.querySelectorAll(".palette-swatch").forEach((swatch) => {
    const selected = swatch.dataset.color?.toLowerCase() === value.toLowerCase();
    swatch.classList.toggle("selected", selected);
    swatch.setAttribute("aria-pressed", String(selected));
  });
  setPaletteError("");
}

function applyPaletteColor(color, options = {}) {
  const normalized = normalizeHexInput(color);
  if (!normalized || !activePaletteInput) return;
  activePaletteInput.value = normalized;
  activePaletteInput.dispatchEvent(new Event("input", { bubbles: true }));
  activePaletteInput.dispatchEvent(new Event("change", { bubbles: true }));
  if (el.paletteHexInput && !options.keepFocus) el.paletteHexInput.value = normalized;
  syncColorPalette(activePaletteInput);
}

function normalizeHexInput(value) {
  const raw = String(value || "").trim();
  const shortMatch = raw.match(/^#?([\da-f]{3})$/i);
  if (shortMatch) return `#${shortMatch[1].split("").map((char) => char + char).join("")}`.toLowerCase();
  const longMatch = raw.match(/^#?([\da-f]{6})$/i);
  return longMatch ? `#${longMatch[1]}`.toLowerCase() : "";
}

function setPaletteError(message) {
  if (el.paletteError) el.paletteError.textContent = message;
}
function syncButtonSurfaces() {
  const headerButtonBg = el.headerButtonColor?.value || state.headerButtonColor || defaultHeaderButtonColor();
  const headerButtonText = el.headerButtonTextColor?.value || state.headerButtonTextColor || defaultHeaderButtonTextColor();
  const accentBg = state.themeColor || "#28733b";
  document.querySelectorAll(".app-header .link-button, .app-header .ghost-button, .app-header .primary-button").forEach((button) => {
    button.style.setProperty("background", headerButtonBg, "important");
    button.style.setProperty("background-image", "none", "important");
    button.style.setProperty("color", headerButtonText, "important");
    button.style.setProperty("box-shadow", `inset 0 0 0 999px ${headerButtonBg}`, "important");
  });
  document.querySelectorAll(".primary-button").forEach((button) => {
    if (!button.closest(".app-header")) button.style.setProperty("background", accentBg, "important");
  });
}

function hexToRgbColor(hex) {
  const value = String(hex || "").trim().replace(/^#/, "");
  const normalized = value.length === 3
    ? value.split("").map((char) => char + char).join("")
    : value;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }) {
  const linear = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function rgbToHsl({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: lightness };
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = max === red
    ? (green - blue) / delta + (green < blue ? 6 : 0)
    : max === green
      ? (blue - red) / delta + 2
      : (red - green) / delta + 4;
  hue *= 60;
  return { h: hue, s: saturation, l: lightness };
}

function logoPaletteForHeader(headerColor) {
  const rgb = hexToRgbColor(headerColor) || hexToRgbColor("#28733b");
  const luminance = relativeLuminance(rgb);
  const hsl = rgbToHsl(rgb);
  const isYellowHeader = hsl.h >= 38 && hsl.h <= 68 && hsl.s >= 0.35 && hsl.l >= 0.35;
  const isVeryLightNeutral = luminance >= 0.82 && hsl.s <= 0.18;
  if (isYellowHeader) {
    return { disc: "#ffffff", mark: "#28733b", outline: "rgba(17, 24, 39, .48)" };
  }
  if (isVeryLightNeutral) {
    return { disc: "#111827", mark: "#ffc400", outline: "rgba(17, 24, 39, .22)" };
  }
  return {
    disc: "#ffffff",
    mark: "#ffc400",
    outline: luminance > 0.55 ? "rgba(17, 24, 39, .42)" : "rgba(255, 255, 255, .26)",
  };
}
function applySheetLineColorToSvg() {
  if (!el.poolSheet) return;
  const color = state.lineColor || defaultLineColor();
  el.poolSheet.style.setProperty("--line", color);
  el.poolSheet.style.setProperty("--soft-line", color);
  el.poolSheet.querySelectorAll([
    ".sheet-spoke",
    ".sheet-soft",
    ".whist-grid-line",
    ".whist-grid-box",
    ".sheet-border",
    ".five-player-card",
    ".five-guide",
    ".five-inner",
  ].join(",")).forEach((element) => {
    element.setAttribute("stroke", color);
  });
}
function applyTheme() {
  state.appearanceMode = state.appearanceMode === "dark" ? "dark" : "light";
  const dark = state.appearanceMode === "dark";
  const fallbackBg = dark ? "#252a31" : "#eef2f7";
  const fallbackInk = dark ? "#edf3f8" : "#18202a";
  const fallbackMuted = dark ? "#aeb8c5" : "#667080";
  const fallbackPaper = dark ? "#20252c" : "#f5f7fb";
  document.documentElement.dataset.theme = state.appearanceMode;
  document.documentElement.style.setProperty("--accent", state.themeColor || "#28733b");
  document.documentElement.style.setProperty("--button-text", state.buttonTextColor || "#ffffff");
  document.documentElement.style.setProperty("--header-button-bg", state.headerButtonColor || defaultHeaderButtonColor());
  document.documentElement.style.setProperty("--header-button-text", state.headerButtonTextColor || defaultHeaderButtonTextColor());
  document.documentElement.style.setProperty("--header-text", state.headerTextColor || defaultHeaderTextColor());
  const headerBg = state.headerColor || state.themeColor || "#28733b";
  const logoPalette = logoPaletteForHeader(headerBg);
  document.documentElement.style.setProperty("--header-bg", headerBg);
  if (el.themeColorMeta) el.themeColorMeta.setAttribute("content", headerBg);
  document.documentElement.style.setProperty("--logo-disc", logoPalette.disc);
  document.documentElement.style.setProperty("--logo-mark", logoPalette.mark);
  document.documentElement.style.setProperty("--logo-outline", logoPalette.outline);
  document.documentElement.style.setProperty("--table-bg", state.tableColor || defaultTableColor());
  document.documentElement.style.setProperty("--table-image", tableImageObjectUrl ? `url("${tableImageObjectUrl}")` : "none");
  document.documentElement.style.setProperty("--bg", state.backgroundColor || fallbackBg);
  document.documentElement.style.setProperty("--surface", state.backgroundColor || fallbackBg);
  document.documentElement.style.setProperty("--neu-bg", state.backgroundColor || fallbackBg);
  document.documentElement.style.setProperty("--neu-surface", state.backgroundColor || fallbackBg);
  document.documentElement.style.setProperty("--paper", fallbackPaper);
  document.documentElement.style.setProperty("--cloth-color", state.clothColor || defaultSheetColor());
  const sheetLineColor = state.lineColor || defaultLineColor();
  document.documentElement.style.setProperty("--sheet-text-backdrop", defaultSheetColor());
  document.documentElement.style.setProperty("--ink", fallbackInk);
  document.documentElement.style.setProperty("--muted", fallbackMuted);
  document.documentElement.style.setProperty("--line", sheetLineColor);
  document.documentElement.style.setProperty("--soft-line", sheetLineColor);
  document.documentElement.style.setProperty("--neu-light", dark ? "#303742" : "#ffffff");
  document.documentElement.style.setProperty("--neu-dark", dark ? "#171b21" : "#a3b1c6");
  document.documentElement.style.setProperty("--neu-modal-bg", dark ? "#252a31" : "#eef2f7");
  if (el.themeColor) el.themeColor.value = state.themeColor || "#28733b";
  if (el.buttonTextColor) el.buttonTextColor.value = state.buttonTextColor || "#ffffff";
  if (el.headerButtonColor) el.headerButtonColor.value = state.headerButtonColor || defaultHeaderButtonColor();
  if (el.headerButtonTextColor) el.headerButtonTextColor.value = state.headerButtonTextColor || defaultHeaderButtonTextColor();
  if (el.headerTextColor) el.headerTextColor.value = state.headerTextColor || defaultHeaderTextColor();
  if (el.headerColor) el.headerColor.value = state.headerColor || state.themeColor || "#28733b";
  if (el.backgroundColor) el.backgroundColor.value = state.backgroundColor || fallbackBg;
  if (el.tableColor) el.tableColor.value = state.tableColor || defaultTableColor();
  if (el.clothColor) el.clothColor.value = state.clothColor || defaultSheetColor();
  if (el.lineColor) el.lineColor.value = state.lineColor || defaultLineColor();
  syncAppearanceModeControls();
  syncButtonSurfaces();
  syncColorResetButton();
  if (activePaletteInput) syncColorPalette(activePaletteInput);
  applySheetLineColorToSvg();
}
function syncControlsFromState() {
  if (el.convention) el.convention.value = state.convention;
  if (el.conventionModalSelect) el.conventionModalSelect.value = state.convention;
  if (el.poolTarget) el.poolTarget.value = String(state.poolTarget);
  if (el.themeColor) el.themeColor.value = state.themeColor;
  if (el.buttonTextColor) el.buttonTextColor.value = state.buttonTextColor;
  if (el.headerButtonColor) el.headerButtonColor.value = state.headerButtonColor;
  if (el.headerButtonTextColor) el.headerButtonTextColor.value = state.headerButtonTextColor;
  if (el.headerTextColor) el.headerTextColor.value = state.headerTextColor;
  if (el.headerColor) el.headerColor.value = state.headerColor;
  if (el.backgroundColor) el.backgroundColor.value = state.backgroundColor;
  if (el.tableColor) el.tableColor.value = state.tableColor;
  if (el.clothColor) el.clothColor.value = state.clothColor;
  if (el.lineColor) el.lineColor.value = state.lineColor || defaultLineColor();
  if (activePaletteInput) syncColorPalette(activePaletteInput);
  if (el.scoreCountingMode) el.scoreCountingMode.value = state.scoreCountingMode;
  if (el.poolClosingMode) el.poolClosingMode.value = state.poolClosingMode;
  if (el.playerCount) el.playerCount.value = String(state.players.length);
}

function startGame() {
  const inputs = [...document.querySelectorAll("[data-player-name]")];
  if (!currentConvention().name.trim()) {
    showMessage("Укажите название конвенции.");
    return;
  }
  state.convention = el.convention.value;
  state.poolTarget = clampNumber(el.poolTarget.value, 1, 1000, 20);
  state.initialPoolTarget = state.poolTarget;
  state.raspassLevel = 0;
  state.themeColor = el.themeColor.value || "#28733b";
  state.buttonTextColor = el.buttonTextColor.value || "#ffffff";
  state.headerButtonColor = el.headerButtonColor.value || defaultHeaderButtonColor();
  state.headerButtonTextColor = el.headerButtonTextColor.value || defaultHeaderButtonTextColor();
  state.headerTextColor = el.headerTextColor.value || defaultHeaderTextColor();
  state.headerColor = el.headerColor.value || state.themeColor || "#28733b";
  state.backgroundColor = el.backgroundColor.value || (state.appearanceMode === "dark" ? "#252a31" : "#eef2f7");
  state.tableColor = el.tableColor.value || defaultTableColor();
  state.clothColor = el.clothColor.value || defaultSheetColor();
  state.lineColor = el.lineColor.value || defaultLineColor();
  state.scoreCountingMode = el.scoreCountingMode.value === "manual" ? "manual" : "live";
  state.scoresCalculated = state.scoreCountingMode === "live";
  state.poolClosingMode = el.poolClosingMode.value === "total" ? "total" : "each";
  state.players = inputs.map((input, index) => input.value.trim() || `Игрок ${index + 1}`);
  state.pool = state.players.map(() => 0);
  state.mountain = state.players.map(() => 0);
  state.whists = state.players.map(() => state.players.map(() => 0));
  state.scoreLog = createScoreLog();
  state.lastScoreDelta = state.players.map(() => 0);
  state.lastChanged = null;
  state.history = [];
  state.gameId = generateGameToken();
  state.remoteUpdatedAt = Date.now();
  undoStack = [];
  redoStack = [];
  setGameUrl(state.gameId);
  document.body.classList.add("game-started");
  closeConventionModal();
  applyTheme();
  renderConventionPanel();
  hydrateSelectors();
  renderRoundRows();
  refresh();
  saveAutosavedGame();
  showMessage("");
  launchSuitFirework(fullPoolTarget());
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function hydrateSelectors() {
  const options = state.players.map((name, index) => `<option value="${index}">${escapeHtml(name)}</option>`).join("");
  el.declarer.innerHTML = options;
  el.manualPlayer.innerHTML = options;
  el.manualTarget.innerHTML = options;
  if (state.players.length > 1) el.manualTarget.value = "1";
  renderDeclarerButtons();
  renderContractButtons();
}

function renderDeclarerButtons() {
  el.declarerButtons.innerHTML = state.players.map((name, index) => (
    `<button type="button" data-declarer="${index}" class="${Number(el.declarer.value || 0) === index ? "active" : ""}">${escapeHtml(name)}</button>`
  )).join("");
}

function renderContractButtons() {
  const values = [6, 7, 8, 9, 10];
  const minimum = minimumContractForRaspassExit();
  if (Number(el.contract.value || 6) < minimum) el.contract.value = String(minimum);
  el.contractButtons.innerHTML = values.map((value) => (
    `<button type="button" data-contract="${value}" class="${Number(el.contract.value || 6) === value ? "active" : ""}" ${value < minimum ? "disabled" : ""}>${value}</button>`
  )).join("");
}

function renderRoundRows() {
  const type = el.gameType.value;
  const isRaspass = el.gameType.value === "Распасы";
  const isMisere = el.gameType.value === "Мизер";
  const isManual = el.gameType.value === "Ручной ввод";
  const declarer = Number(el.declarer.value || 0);
  const restingPlayer = autoRestingPlayer(declarer);
  const showDeclarer = type === "Взятки" || isMisere;
  const showContract = type === "Взятки";
  el.recordModal.classList.toggle("raspass-record", isRaspass);
  el.recordModal.classList.toggle("misere-record", isMisere);
  if (showContract) renderContractButtons();
  el.declarerField.hidden = !showDeclarer;
  el.contractField.hidden = !showContract;
  el.declarer.disabled = !showDeclarer;
  el.contract.disabled = !showContract;
  el.recordDetailsTitle.textContent = isManual ? "Ручной ввод" : "Кто играет";
  el.roundStepTitle.textContent = isMisere ? "Взятки в мизере" : isRaspass ? `Взятки в распасах ${format(raspassContract())}` : "Висты и взятки";
  el.roundRoleColumn.textContent = isMisere || isRaspass ? "Роль" : "Вист";
  el.misereCardsPanel.hidden = !isMisere;
  el.manualPanel.style.display = isManual ? "grid" : "none";
  updateManualTargetState();

  el.roundRows.innerHTML = "";
  state.players.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "round-row";
    const roles = isRaspass
      ? state.players.length === 3 ? ["Играет"] : ["Играет", "Отдыхает"]
      : state.players.length === 3 ? ["Пас", "Вист", "Полвиста"] : ["Пас", "Вист", "Полвиста", "Отдыхает"];
    const isDeclarer = !isManual && !isRaspass && index === declarer;
    const isAutoResting = !isManual && !isRaspass && isMisere && index === restingPlayer;
    const isMisereResting = isMisere && isAutoResting && index !== declarer;
    const defaultRole = isMisere
      ? index === declarer ? "Играет" : isMisereResting ? "Отдыхает" : "Пас"
      : isRaspass ? "Играет" : state.players.length === 3 ? "Вист" : "Пас";
    const roleMarkup = isMisere
      ? `<span class="role-pill">${roleLabel(defaultRole)}</span><input type="hidden" data-role="${index}" value="${defaultRole}">`
      : isRaspass && state.players.length === 3
      ? `<span class="role-pill">Играет</span><input type="hidden" data-role="${index}" value="Играет">`
      : isDeclarer
      ? `<span class="role-pill">Играет</span><input type="hidden" data-role="${index}" value="Играет">`
      : `<div class="role-buttons" data-role-buttons="${index}">
          ${roles.map((role) => `<button type="button" data-role-button="${index}" data-role="${role}" class="${role === defaultRole ? "active" : ""}" ${isManual ? "disabled" : ""}>${roleLabel(role)}</button>`).join("")}
          <input type="hidden" data-role="${index}" value="${defaultRole}">
        </div>`;
    const showUnderThree = type === "Взятки" && isDeclarer && currentConvention().underThreeLoss;
    if (showUnderThree) row.classList.add("has-under-three");
    const underThreeMarkup = showUnderThree
      ? `<button type="button" class="under-three-button" data-under-three="${index}">Уход без трёх</button>`
      : "";
    const roleLineMarkup = showUnderThree
      ? `<div class="role-line">${roleMarkup}${underThreeMarkup}</div>`
      : roleMarkup;
    const restingPicker = restingTricksAllowed(defaultRole);
    const tricksDisabled = isManual || (defaultRole === "Отдыхает" && !restingPicker);
    row.innerHTML = `
      <strong>${escapeHtml(player)}</strong>
      ${roleLineMarkup}
      <span class="trick-label">Количество взяток</span>
      <div class="trick-picker ${restingPicker ? "resting-tricks" : ""}" data-picker="${index}">
        ${trickButtonsMarkup(index, restingPicker ? 2 : 10, tricksDisabled)}
        <input data-tricks="${index}" type="hidden" value="0">
      </div>
    `;
    el.roundRows.appendChild(row);
  });
  applyDefaultContractTricks();
  applyDefaultWhistTricks();
  syncTrickPickerStates();
  syncRecordTitle();
  updateTrickValidation();
}

function restingTricksAllowed(role) {
  if (role !== "Отдыхает" || state.players.length < 4) return false;
  if (el.gameType.value === "Взятки") return currentConvention().restingTalonPool === "yes";
  if (el.gameType.value === "Распасы") {
    const convention = currentConvention();
    return convention.raspassTalonMode !== "closed" && convention.restingRaspassMountain === "yes";
  }
  return false;
}

function trickButtonsMarkup(index, max, disabled) {
  return Array.from({ length: max + 1 }, (_, value) => (
    `<button type="button" data-trick-button="${index}" data-value="${value}" ${value === 0 ? "class=\"active\"" : ""} ${disabled ? "disabled" : ""}>${value}</button>`
  )).join("");
}

function applyDefaultContractTricks() {
  if (el.gameType.value !== "Взятки") return;
  const declarer = Number(el.declarer.value || 0);
  const contract = clampNumber(el.contract.value, 6, 10, 6);
  const input = document.querySelector(`[data-tricks="${declarer}"]`);
  if (!input || input.disabled) return;
  setTrickValueSilently(declarer, contract);
  input.dataset.touched = "true";
}

function applyDefaultWhistTricks() {
  if (el.gameType.value !== "Взятки") return;
  const declarer = Number(el.declarer.value || 0);
  const contract = clampNumber(el.contract.value, 6, 10, 6);
  const roles = getRoles();
  const whisters = roles
    .map((role, index) => role === "Вист" && index !== declarer ? index : -1)
    .filter((index) => index >= 0);
  const defenders = roles
    .map((role, index) => role !== "Играет" && role !== "Отдыхает" && index !== declarer ? index : -1)
    .filter((index) => index >= 0);
  defenders.forEach((index) => {
    const input = document.querySelector(`[data-tricks="${index}"]`);
    if (input && input.dataset.touched !== "true") setTrickValueSilently(index, 0);
  });
  if (whisters.length === 0) return;

  const untouchedWhisters = whisters.filter((index) => {
    const input = document.querySelector(`[data-tricks="${index}"]`);
    return input && input.dataset.touched !== "true";
  });
  let remaining = 10 - contract - sum(whisters
    .filter((index) => !untouchedWhisters.includes(index))
    .map((index) => Number(document.querySelector(`[data-tricks="${index}"]`)?.value || 0)));

  untouchedWhisters.forEach((index, order) => {
    const input = document.querySelector(`[data-tricks="${index}"]`);
    if (!input) return;
    const slotsLeft = untouchedWhisters.length - order;
    const value = whisters.length === 2 && remaining === 4
      ? 2
      : Math.max(0, Math.min(10, Math.ceil(remaining / Math.max(slotsLeft, 1))));
    setTrickValueSilently(index, value);
    remaining -= value;
  });
}

function roleLabel(role) {
  return role === "Отдыхает" ? "Отдых" : role;
}

function autoRestingPlayer(declarer) {
  if (state.players.length !== 5) return -1;
  return (declarer + 1) % state.players.length;
}

function selectDeclarer(event) {
  const button = event.target.closest("[data-declarer]");
  if (!button) return;
  el.declarer.value = button.dataset.declarer;
  renderDeclarerButtons();
  renderRoundRows();
}

function selectContract(event) {
  const button = event.target.closest("[data-contract]");
  if (!button) return;
  el.contract.value = button.dataset.contract;
  renderContractButtons();
  applyDefaultContractTricks();
  applyDefaultWhistTricks();
  syncTrickPickerStates();
  updateTrickValidation();
}

function openRecordWizard(type = "") {
  if (!gameStarted()) return;
  const requestedType = typeof type === "string" ? type : "";
  const allowedTypes = new Set(["Взятки", "Распасы", "Мизер", "Ручной ввод"]);
  wizardStep = 1;
  el.gameType.value = allowedTypes.has(requestedType) ? requestedType : "";
  resetMisereCards();
  syncTypeChoices();
  setWizardStep(el.gameType.value ? firstStepAfterType() : 1);
  renderRoundRows();
  el.recordModal.classList.add("open");
  el.recordModal.setAttribute("aria-hidden", "false");
}

function closeRecordWizard() {
  el.recordModal.classList.remove("open");
  el.recordModal.setAttribute("aria-hidden", "true");
  showMessage("");
}

function selectPossibleGame(event) {
  const card = event.target.closest("[data-record-type]");
  if (!card || !el.possibleGamesList?.contains(card)) return;
  openRecordWizard(card.dataset.recordType || "");
}

function isStandalonePwa() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  syncInstallAppButton();
}

function handleAppInstalled() {
  deferredInstallPrompt = null;
  syncInstallAppButton();
}

function syncInstallAppButton() {
  const available = Boolean(deferredInstallPrompt) && !isStandalonePwa();
  if (el.installAppFooter) el.installAppFooter.hidden = !available;
  if (el.installAppButton) el.installAppButton.hidden = !available;
}

async function installApp() {
  if (!deferredInstallPrompt || isStandalonePwa()) {
    syncInstallAppButton();
    return;
  }
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  syncInstallAppButton();
  promptEvent.prompt();
  try {
    await promptEvent.userChoice;
  } finally {
    syncInstallAppButton();
  }
}
function openColorSettings() {
  syncInstallAppButton();
  el.colorSettingsDrawer.classList.add("open");
  el.colorSettingsDrawer.setAttribute("aria-hidden", "false");
}

function toggleMobileMenu() {
  const open = !el.appHeader?.classList.contains("menu-open");
  setMobileMenuOpen(open);
}

function closeMobileMenu() {
  setMobileMenuOpen(false);
}

function setMobileMenuOpen(open) {
  if (!el.appHeader || !el.mobileMenuButton) return;
  el.appHeader.classList.toggle("menu-open", Boolean(open));
  el.mobileMenuButton.setAttribute("aria-expanded", open ? "true" : "false");
  el.mobileMenuButton.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const protocol = window.location.protocol;
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (protocol !== "https:" && !local) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
function closeColorSettings() {
  el.colorSettingsDrawer.classList.remove("open");
  el.colorSettingsDrawer.setAttribute("aria-hidden", "true");
}

function openConventionModal() {
  renderConventionPanel();
  el.conventionModal.classList.add("open");
  el.conventionModal.setAttribute("aria-hidden", "false");
}

function closeConventionModal() {
  el.conventionModal.classList.remove("open");
  el.conventionModal.setAttribute("aria-hidden", "true");
}
function openRulesModal() {
  el.rulesModal.classList.add("open");
  el.rulesModal.setAttribute("aria-hidden", "false");
}

function closeRulesModal() {
  el.rulesModal.classList.remove("open");
  el.rulesModal.setAttribute("aria-hidden", "true");
}

function selectType(event) {
  const button = event.target.closest(".type-choice");
  if (!button) return;
  el.gameType.value = button.dataset.type;
  resetMisereCards();
  syncTypeChoices();
  renderRoundRows();
  setWizardStep(firstStepAfterType());
}

function syncTypeChoices() {
  [...el.typeChoices.querySelectorAll(".type-choice")].forEach((item) => {
    item.classList.toggle("active", item.dataset.type === el.gameType.value);
  });
}

function nextStep() {
  if (!el.gameType.value) return;
  const steps = wizardSteps();
  const index = steps.indexOf(wizardStep);
  setWizardStep(steps[Math.min(steps.length - 1, index + 1)]);
}

function previousStep() {
  const steps = wizardSteps();
  const index = steps.indexOf(wizardStep);
  setWizardStep(steps[Math.max(0, index - 1)]);
}

function setWizardStep(step) {
  const steps = wizardSteps();
  wizardStep = steps.includes(step) ? step : steps[0];
  if (wizardStep === 3 && el.gameType.value === "Мизер") renderMisereReviewCards();
  document.querySelectorAll(".wizard-step").forEach((section) => {
    if (section.dataset.step === "round") {
      section.hidden = wizardStep !== trickWizardStep();
    } else {
      section.hidden = Number(section.dataset.step) !== wizardStep;
    }
  });
  [el.stepDot1, el.stepDot2, el.stepDot3].forEach((dot, index) => {
    const dotStep = index + 1;
    dot.hidden = !steps.includes(dotStep);
    dot.classList.toggle("active", dotStep === wizardStep);
  });
  const currentIndex = steps.indexOf(wizardStep);
  const isLastStep = currentIndex === steps.length - 1;
  el.prevStepButton.style.display = currentIndex === 0 ? "none" : "";
  el.nextStepButton.style.display = isLastStep ? "none" : "";
  el.addButton.style.display = el.gameType.value && isLastStep ? "" : "none";
  syncRecordTitle();
  if (wizardStep !== trickWizardStep()) showMessage("");
  updateTrickValidation();
}

function syncRecordTitle() {
  if (wizardStep === 2) {
    el.recordTitle.textContent = el.recordDetailsTitle.textContent || "Кто играет";
  } else if (wizardStep === trickWizardStep()) {
    el.recordTitle.textContent = el.roundStepTitle.textContent || "Висты и взятки";
  } else if (wizardStep === 3 && el.gameType.value === "Мизер") {
    el.recordTitle.textContent = "Карты мизера";
  } else {
    el.recordTitle.textContent = "Тип записи";
  }
}

function wizardSteps() {
  if (!el.gameType.value) return [1];
  if (el.gameType.value === "Ручной ввод") return [1, 2];
  if (el.gameType.value === "Распасы") return [1, 3];
  if (el.gameType.value === "Мизер") return [1, 2, 3, 4];
  return [1, 2, 3];
}

function trickWizardStep() {
  return el.gameType.value === "Мизер" ? 4 : 3;
}

function firstStepAfterType() {
  const steps = wizardSteps();
  return steps[1] || steps[0];
}

function toggleMisereCard(event) {
  const button = event.target.closest("[data-misere-card]");
  if (!button) return;
  button.classList.toggle("active");
  renderMisereReviewCards();
}

function toggleMisereReviewCard(event) {
  const button = event.target.closest("[data-misere-review-card]");
  if (!button) return;
  button.classList.toggle("crossed");
}

function resetMisereCards() {
  el.misereCardsPanel.querySelectorAll("[data-misere-card]").forEach((button) => {
    button.classList.remove("active");
  });
  if (el.misereReviewCards) el.misereReviewCards.innerHTML = "";
}

function selectedMisereCards() {
  return [...el.misereCardsPanel.querySelectorAll("[data-misere-card].active")]
    .map((button) => button.dataset.misereCard);
}

function renderMisereReviewCards() {
  if (!el.misereReviewCards) return;
  const cards = selectedMisereCards();
  const marked = new Set([...el.misereReviewCards.querySelectorAll("[data-misere-review-card].crossed")]
    .map((button) => button.dataset.misereReviewCard));
  const selected = new Set(cards);
  const suits = [
    { symbol: "♠", label: "♠️" },
    { symbol: "♣", label: "♣️" },
    { symbol: "♦", label: "♦️" },
    { symbol: "♥", label: "♥️" },
  ];
  const ranks = ["A", "K", "Q", "J", "10", "9", "8", "7"];
  el.misereReviewCards.innerHTML = suits.map(({ symbol, label }) => {
    const buttons = ranks.map((rank) => {
      const card = `${symbol} ${rank}`;
      const classes = [
        selected.has(card) ? "active" : "",
        marked.has(card) ? "crossed" : "",
      ].filter(Boolean).join(" ");
      return `<button type="button" data-misere-review-card="${escapeHtml(card)}" class="${classes}">${escapeHtml(rank)}</button>`;
    }).join("");
    return `
      <div class="misere-card-row">
        <span>${escapeHtml(label)}</span>
        <div class="misere-card-buttons">${buttons}</div>
      </div>
    `;
  }).join("");
}

function updateManualTargetState() {
  if (!el.manualTarget || !el.manualArea) return;
  const enabled = el.manualArea.value === "Висты";
  el.manualTarget.disabled = !enabled;
  el.manualTarget.closest("label")?.classList.toggle("disabled-field", !enabled);
}

function selectedMisereCardsText() {
  const cardsBySuit = new Map();
  selectedMisereCards().forEach((card) => {
    const [suit, rank] = card.split(" ");
    if (!cardsBySuit.has(suit)) cardsBySuit.set(suit, []);
    cardsBySuit.get(suit).push(rank);
  });
  return [...cardsBySuit.entries()]
    .map(([suit, ranks]) => `${suit} ${ranks.join(" ")}`)
    .join(", ");
}

function markedMisereCardsText() {
  const selected = new Set(selectedMisereCards());
  const cards = [...el.misereReviewCards.querySelectorAll("[data-misere-review-card].crossed")]
    .map((button) => button.dataset.misereReviewCard)
    .filter((card) => selected.has(card));
  return cards.join(", ");
}

el.roundRows.addEventListener("click", (event) => {
  const underThreeButton = event.target.closest("[data-under-three]");
  if (underThreeButton) {
    const index = Number(underThreeButton.dataset.underThree);
    const contract = clampNumber(el.contract.value, 6, 10, 6);
    setTrickValue(index, Math.max(0, contract - 3), true);
    return;
  }

  const roleButton = event.target.closest("[data-role-button]");
  if (roleButton && !roleButton.disabled) {
    const index = Number(roleButton.dataset.roleButton);
    const input = document.querySelector(`[data-role="${index}"]`);
    const group = document.querySelector(`[data-role-buttons="${index}"]`);
    input.value = roleButton.dataset.role;
    group.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button === roleButton));
    updateRoleSideEffects(index, input.value);
    applyDefaultWhistTricks();
    syncTrickPickerStates();
    updateTrickValidation();
    return;
  }

  const button = event.target.closest("[data-trick-button]");
  if (!button || button.disabled) return;
  setTrickValue(Number(button.dataset.trickButton), Number(button.dataset.value), true);
});

el.roundRows.addEventListener("change", (event) => {
  const role = event.target.closest("[data-role]");
  if (!role) return;
  const index = Number(role.dataset.role);
  updateRoleSideEffects(index, role.value);
  syncTrickPickerStates();
});

el.declarer.addEventListener("change", renderRoundRows);

function updateRoleSideEffects(index, role) {
  const restingPicker = restingTricksAllowed(role);
  const disabled = role === "Отдыхает" && !restingPicker;
  const picker = document.querySelector(`[data-picker="${index}"]`);
  if (picker) {
    const input = picker.querySelector(`[data-tricks="${index}"]`);
    picker.classList.toggle("resting-tricks", restingPicker);
    picker.querySelectorAll("button").forEach((button) => button.remove());
    picker.insertAdjacentHTML("afterbegin", trickButtonsMarkup(index, restingPicker ? 2 : 10, disabled));
    if (input) input.value = "0";
  }
  if (disabled) setTrickValue(index, 0, false);
  else updateTrickValidation();
}

function isPassOnlyContract(roles = getRoles()) {
  if (el.gameType.value !== "Взятки") return false;
  const declarer = Number(el.declarer.value || 0);
  const defenders = roles
    .map((role, index) => index === declarer || role === "Отдыхает" ? "" : role)
    .filter(Boolean);
  return defenders.length > 0 && defenders.every((role) => role === "Пас");
}

function syncTrickPickerStates() {
  if (el.gameType.value === "Ручной ввод") return;
  const roles = getRoles();
  const declarer = Number(el.declarer.value || 0);
  const passOnly = isPassOnlyContract(roles);
  roles.forEach((role, index) => {
    const picker = document.querySelector(`[data-picker="${index}"]`);
    if (!picker) return;
    const restingDisabled = role === "Отдыхает" && !restingTricksAllowed(role);
    const passOnlyDisabled = passOnly && index !== declarer && role === "Пас";
    const disabled = restingDisabled || passOnlyDisabled;
    picker.classList.toggle("tricks-skipped", passOnlyDisabled);
    picker.querySelectorAll("button").forEach((button) => {
      button.disabled = disabled;
    });
    if (disabled) setTrickValueSilently(index, 0);
  });
}

function addRecord() {
  try {
    showMessage("");
    const before = cloneState();
    const beforeTotals = calculateTotals();
    lastRecordOutcome = null;
    if (el.gameType.value === "Ручной ввод") addManual();
    else if (el.gameType.value === "Распасы") addRaspass();
    else if (el.gameType.value === "Мизер") addMisere();
    else addContract();
    redistributePoolOverflow();
    updateRaspassProgression(lastRecordOutcome);
    const afterTotals = calculateTotals();
    state.lastScoreDelta = scoreDelta(beforeTotals, afterTotals);
    state.lastChanged = buildLastChanged(before, state);
    appendLastHistoryDetails(before, state, state.lastScoreDelta);
    pushScoreSnapshot();
    markScoresStale();
    undoStack.push(before);
    redoStack = [];
    closeRecordWizard();
    refresh();
    saveAutosavedGame();
  } catch (error) {
    showMessage(error.message);
  }
}

function addContract() {
  const declarer = Number(el.declarer.value);
  const contract = Number(el.contract.value);
  const minimumContract = minimumContractForRaspassExit();
  if (contract < minimumContract) throw new Error(`После распасов доступна игра не ниже ${minimumContract}.`);
  const value = gameValue(contract);
  const tricks = getTricks();
  validateTrickSum(true);

  const declarerTricks = tricks[declarer];
  const roles = getRoles();
  const activeDefenders = [];
  const whisters = [];
  roles.forEach((role, index) => {
    if (index === declarer) return;
    if (role !== "Отдыхает") activeDefenders.push(index);
    if (role === "Вист") whisters.push(index);
  });

  if (declarerTricks >= contract) {
    applySuccessfulGameWrite(declarer, value);
    activeDefenders.forEach((index) => {
      if (roles[index] === "Вист") state.whists[index][declarer] += tricks[index] * whistPerTrick(contract);
      if (roles[index] === "Полвиста") state.whists[index][declarer] += ((10 - contract) * whistPerTrick(contract)) / 2;
    });
    applyRestingTalonWhists(declarer, contract, roles, tricks);

    applyWhistShortfallPenalty(contract, roles, whisters, tricks);
    pushHistory(`${contract} взяток: ${state.players[declarer]} сыграл.`);
    lastRecordOutcome = { type: "contract", contract, declarer, success: true, roles, tricks };
  } else {
    const under = contract - declarerTricks;
    state.mountain[declarer] += gamePenalty(contract) * under;
    const awards = defenderRemizWhistAwards(contract, under, roles, activeDefenders, whisters, tricks);
    awards.forEach((amount, index) => {
      if (amount) state.whists[index][declarer] += amount;
    });
    applyRestingTalonWhists(declarer, contract, roles, tricks);
    pushHistory(`${contract} взяток: ${state.players[declarer]} ремиз ${under}.`);
    lastRecordOutcome = { type: "contract", contract, declarer, success: false, roles, tricks };
  }
}

function applySuccessfulGameWrite(player, value) {
  if (currentConvention().gameWinWriteMode !== "mountain-first") {
    state.pool[player] += value;
    return;
  }
  const mountain = Math.max(0, Number(state.mountain[player] || 0));
  const writeOff = Math.min(mountain, value);
  if (writeOff > 0) state.mountain[player] = mountain - writeOff;
  const poolRemainder = value - writeOff;
  if (poolRemainder > 0) state.pool[player] += poolRemainder;
}

function applyRestingTalonWhists(declarer, contract, roles, tricks) {
  if (currentConvention().restingTalonPool !== "yes" || state.players.length < 4) return;
  roles.forEach((role, index) => {
    if (role !== "Отдыхает" || index === declarer) return;
    const talonTricks = clampNumber(tricks[index], 0, 2, 0);
    if (talonTricks) state.whists[index][declarer] += talonTricks * whistPerTrick(contract);
  });
}

function defenderRemizWhistAwards(contract, under, roles, activeDefenders, whisters, tricks) {
  const awards = state.players.map(() => 0);
  const perTrick = whistPerTrick(contract);
  activeDefenders.forEach((index) => {
    awards[index] += under * perTrick;
    if (roles[index] === "Вист") awards[index] += tricks[index] * perTrick;
  });

  const passers = activeDefenders.filter((index) => roles[index] === "Пас");
  if (currentConvention().declarerRemizWhistMode === "gentleman" && whisters.length === 1 && passers.length === 1) {
    const whister = whisters[0];
    const passer = passers[0];
    const shared = (awards[whister] + awards[passer]) / 2;
    awards[whister] = shared;
    awards[passer] = shared;
  }

  return awards;
}

function addMisere() {
  const declarer = Number(el.declarer.value);
  const tricks = getTricks();
  const cardsText = selectedMisereCardsText();
  const markedCards = markedMisereCardsText();
  const cardsSuffix = cardsText
    ? ` Карты: ${cardsText}.${markedCards ? ` Отмечены: ${markedCards}.` : ""}`
    : "";
  validateTrickSum(true);
  if (tricks[declarer] === 0) {
    applySuccessfulGameWrite(declarer, 10);
    pushHistory(`Мизер: ${state.players[declarer]} сыграл.${cardsSuffix}`);
    lastRecordOutcome = { type: "misere", success: true, roles: getRoles(), tricks };
  } else {
    state.mountain[declarer] += gamePenalty(10) * tricks[declarer];
    pushHistory(`Мизер: ${state.players[declarer]} взял ${tricks[declarer]}.${cardsSuffix}`);
    lastRecordOutcome = { type: "misere", success: false, roles: getRoles(), tricks };
  }
}

function addRaspass() {
  const tricks = getTricks();
  const roles = getRoles();
  const active = roles.map((role, index) => role !== "Отдыхает" ? index : -1).filter((index) => index >= 0);
  if (active.length < 3) throw new Error("На распасах должно быть минимум 3 активных игрока.");
  validateTrickSum(true);
  const contract = raspassContract();
  const price = raspassPrice();
  if (currentConvention().raspassScoringMode === "rostov-whist") {
    applyRostovRaspassWhists(active, tricks, price);
  } else {
    active.forEach((index) => state.mountain[index] += tricks[index] * price);
  }
  applyRaspassZeroTricksPool(active, tricks);
  applyRestingRaspassMountain(roles, tricks, price);
  pushHistory(`Распасы ${format(contract)}.`);
  lastRecordOutcome = { type: "raspass", success: false, roles, tricks };
}

function applyRostovRaspassWhists(active, tricks, price) {
  const minTricks = Math.min(...active.map((index) => Number(tricks[index] || 0)));
  const winners = active.filter((index) => Number(tricks[index] || 0) === minTricks);
  winners.forEach((winner) => {
    active.forEach((opponent) => {
      if (opponent === winner) return;
      const diff = Number(tricks[opponent] || 0) - minTricks;
      if (diff > 0) state.whists[winner][opponent] += diff * price;
    });
  });
}

function applyRaspassZeroTricksPool(active, tricks) {
  if (!currentConvention().raspassZeroTricksPool) return;
  const value = raspassPrice();
  active.forEach((index) => {
    if (Number(tricks[index] || 0) === 0) state.pool[index] += value;
  });
}

function applyRestingRaspassMountain(roles, tricks, price) {
  const convention = currentConvention();
  if (convention.raspassTalonMode === "closed" || convention.restingRaspassMountain !== "yes" || state.players.length < 4) return;
  roles.forEach((role, index) => {
    if (role !== "Отдыхает") return;
    const talonTricks = clampNumber(tricks[index], 0, 2, 0);
    if (talonTricks) state.mountain[index] += talonTricks * price;
  });
}

function addManual() {
  const player = Number(el.manualPlayer.value);
  const target = Number(el.manualTarget.value);
  const amount = Number(el.manualAmount.value || 0);
  const area = el.manualArea.value;
  if (area === "Гора") state.mountain[player] += amount;
  else if (area === "Пуля") state.pool[player] += amount;
  else {
    if (player === target) throw new Error("Висты пишутся на другого игрока.");
    state.whists[player][target] += amount;
  }
  const note = el.manualNote.value.trim();
  pushHistory(`Ручной ввод: ${state.players[player]} ${signed(amount)} ${area.toLowerCase()}${area === "Висты" ? ` на ${state.players[target]}` : ""}${note ? ` (${note})` : ""}`);
  lastRecordOutcome = { type: "manual", success: false };
  el.manualAmount.value = "0";
  el.manualNote.value = "";
}

function redistributePoolOverflow() {
  if (state.poolClosingMode !== "each") return;
  let guard = 0;
  while (guard < 100) {
    guard += 1;
    const source = state.pool.findIndex((value) => Number(value || 0) > state.poolTarget);
    if (source < 0) return;
    const excess = Number(state.pool[source] || 0) - state.poolTarget;
    state.pool[source] = state.poolTarget;
    const recipient = overflowRecipient(source);
    if (recipient < 0) return;
    state.pool[recipient] += excess;
  }
}

function overflowRecipient(source) {
  const candidates = state.players
    .map((_, index) => index)
    .filter((index) => index !== source && Number(state.pool[index] || 0) < state.poolTarget);
  if (!candidates.length) return -1;
  const maxPool = Math.max(...candidates.map((index) => Number(state.pool[index] || 0)));
  return candidates
    .filter((index) => Number(state.pool[index] || 0) === maxPool)
    .sort((a, b) => clockwiseDistance(source, a) - clockwiseDistance(source, b))[0];
}

function clockwiseDistance(from, to) {
  return (to - from + state.players.length) % state.players.length || state.players.length;
}

function requiredWhistTricks(contract) {
  const convention = currentConvention();
  if (contract === 6) return clampNumber(convention.minWhist6, 1, 4, 4);
  if (contract === 7) return clampNumber(convention.minWhist7, 1, 3, 2);
  if (contract === 8) return clampNumber(convention.minWhist8, 1, 2, 1);
  if (contract === 9) return clampNumber(convention.minWhist9, 0, 1, 1);
  if (contract === 10) return clampNumber(convention.minWhist10, 0, 1, 0);
  return 0;
}

function applyWhistShortfallPenalty(contract, roles, whisters, tricks) {
  const required = requiredWhistTricks(contract);
  if (!required || whisters.length === 0) return { penalized: [], shortfall: 0 };
  const mode = currentConvention().whistRequirementMode || "together";
  if (mode === "each") {
    const individualRequired = whisters.length > 1 ? Math.ceil(required / whisters.length) : required;
    const penalized = whisters.filter((index) => tricks[index] < individualRequired);
    penalized.forEach((index) => {
      state.mountain[index] += (individualRequired - tricks[index]) * whistPenalty(contract);
    });
    return { penalized, shortfall: sum(penalized.map((index) => individualRequired - tricks[index])) };
  }

  const whistTricks = sum(whisters.map((index) => tricks[index]));
  if (whistTricks >= required) return { penalized: [], shortfall: 0 };
  const shortfall = required - whistTricks;
  if (currentConvention().whistShortfallDistribution === "whisters") {
    return applyWhisterShortfallByDeficit(contract, whisters, tricks, required, shortfall);
  }
  const penalized = whistPenaltyPlayers(roles, whisters);
  const penalty = penalized.length ? (shortfall * whistPenalty(contract)) / penalized.length : 0;
  penalized.forEach((index) => state.mountain[index] += penalty);
  return { penalized, shortfall };
}

function applyWhisterShortfallByDeficit(contract, whisters, tricks, required, shortfall) {
  const expected = required / whisters.length;
  const deficits = whisters.map((index) => ({
    index,
    deficit: Math.max(0, expected - Number(tricks[index] || 0)),
  })).filter((item) => item.deficit > 0);
  const totalDeficit = sum(deficits.map((item) => item.deficit));
  if (!totalDeficit) return { penalized: [], shortfall };

  const totalPenalty = shortfall * whistPenalty(contract);
  deficits.forEach(({ index, deficit }) => {
    state.mountain[index] += totalPenalty * (deficit / totalDeficit);
  });
  return { penalized: deficits.map((item) => item.index), shortfall };
}

function whistPenaltyPlayers(roles, whisters) {
  const distribution = currentConvention().whistShortfallDistribution;
  const passers = roles
    .map((role, index) => role === "Пас" ? index : -1)
    .filter((index) => index >= 0);
  if (distribution === "passers" && passers.length) return passers;
  if (distribution === "whisters-passers") return [...whisters, ...passers];
  return whisters;
}

function raspassPrice() {
  return gameValue(raspassContract());
}

function raspassContract() {
  const sequence = progressionSequence(currentConvention().raspassProgression);
  return sequence[Math.min(state.raspassLevel || 0, sequence.length - 1)] || 6;
}

function progressionSequence(value) {
  if (value === "6-7-8") return [6, 7, 8];
  if (value === "6-7-7-8") return [6, 7, 7, 8];
  if (value === "6-7-8-9") return [6, 7, 8, 9];
  return [6];
}

function minimumContractForRaspassExit() {
  return currentConvention().raspassProgression === "none" ? 6 : raspassContract();
}

function updateRaspassProgression(outcome) {
  if (!outcome || outcome.type === "manual") return;
  const convention = currentConvention();
  const hasRaspassProgression = convention.raspassProgression !== "none";
  if (!hasRaspassProgression) return;

  if (outcome.type === "raspass") {
    advanceRaspassLevel();
    return;
  }
  if (raspassExitSatisfied(outcome)) {
    state.raspassLevel = 0;
    return;
  }
  if (convention.raspassProgressionStop === "cycle") {
    advanceRaspassLevel();
  }
}

function advanceRaspassLevel() {
  const sequence = progressionSequence(currentConvention().raspassProgression);
  const next = (state.raspassLevel || 0) + 1;
  if (next < sequence.length) state.raspassLevel = next;
  else state.raspassLevel = raspassProgressionWaitsForGame() ? sequence.length - 1 : 0;
}

function raspassProgressionWaitsForGame() {
  return currentConvention().raspassProgressionStop === "until-game";
}

function raspassExitSatisfied(outcome) {
  const convention = currentConvention();
  if (outcome.type === "misere") return Boolean(convention.misereExitsRaspass && outcome.success);
  if (outcome.type !== "contract" || !outcome.success) return false;
  if (outcome.contract < minimumContractForRaspassExit()) return false;
  const whisters = outcome.roles
    .map((role, index) => role === "Вист" ? index : -1)
    .filter((index) => index >= 0);
  const noPenalty = whistShortfallAmount(outcome.contract, whisters, outcome.tricks, convention.whistRequirementMode) === 0;
  if (convention.raspassExitCondition === "one-whister-no-penalty") return whisters.length >= 1 && noPenalty;
  if (convention.raspassExitCondition === "both-whist-together") return whisters.length >= 2 && noPenalty;
  if (convention.raspassExitCondition === "both-whist-each") return whisters.length >= 2 && whistShortfallAmount(outcome.contract, whisters, outcome.tricks, "each") === 0;
  if (convention.raspassExitCondition === "half-whist") return outcome.roles.includes("Полвиста");
  return true;
}

function whistShortfallAmount(contract, whisters, tricks, mode) {
  const required = requiredWhistTricks(contract);
  if (!required || whisters.length === 0) return 0;
  if (mode === "each") {
    const individualRequired = whisters.length > 1 ? Math.ceil(required / whisters.length) : required;
    return sum(whisters.map((index) => Math.max(0, individualRequired - tricks[index])));
  }
  return Math.max(0, required - sum(whisters.map((index) => tricks[index])));
}

function refresh() {
  applyTheme();
  renderConventionPanel();
  const actualTotals = calculateTotals();
  const totals = displayTotals(actualTotals);
  const closed = totals.filter((total) => total.closed).length;
  const actualClosed = actualTotals.filter((total) => total.closed).length;
  const fullyClosed = closed === state.players.length;
  const actuallyFullyClosed = actualClosed === state.players.length;
  const closedPool = displayedClosedPool(totals);
  const totalPoolTarget = fullPoolTarget();
  const poolProgress = totalPoolTarget ? Math.min(100, Math.round((closedPool / totalPoolTarget) * 100)) : 0;
  const closedBadgeParts = state.poolClosingMode === "total"
    ? [`Общая пуля ${format(closedPool)} / ${format(totalPoolTarget)}`, `${poolProgress}%`]
    : [`${closed} из ${state.players.length} закрыли`, `Пуля ${format(closedPool)} / ${format(totalPoolTarget)}`, `${poolProgress}%`];
  el.closedBadge.replaceChildren(...closedBadgeParts.map((part) => {
    const span = document.createElement("span");
    span.textContent = part;
    return span;
  }));
  const caption = `Пуля: ${state.convention} / ${state.players.length} игрока`;
  el.statusTitle.textContent = fullyClosed ? "Пуля закрыта" : `Игра до ${format(state.poolTarget)}`;
  el.gameCaption.textContent = caption;
  el.gameCaption.hidden = false;
  renderPoolSheet(totals);
  renderScoreTable(totals);
  renderPossibleGames();
  renderHistory();
  updateHistoryButtons();
  updateGameControls();
  updateScoreCalculationControls(actualTotals);
  updateAddPoolControls(actualTotals);
  if (actuallyFullyClosed && !wasFullyClosed) {
    launchCelebration();
    showMessage("Пуля закрыта. Можно добавить следующую пулю.");
  }
  wasFullyClosed = actuallyFullyClosed;
}

function renderPossibleGames() {
  if (!el.possibleGamesCard || !el.possibleGamesList) return;
  if (!gameStarted()) {
    el.possibleGamesCard.hidden = true;
    el.possibleGamesList.replaceChildren();
    return;
  }

  el.possibleGamesCard.hidden = false;
  el.possibleGamesList.replaceChildren(...buildPossibleGames().map(createPossibleGameCard));
}

function buildPossibleGames() {
  const convention = currentConvention();
  const hasRaspassProgression = convention.raspassProgression !== "none";
  const raspassExitIsActive = hasRaspassProgression && (state.raspassLevel || 0) > 0;
  const raspassProgression = hasRaspassProgression
    ? progressionSequence(convention.raspassProgression).map(format).join("-")
    : "без прогрессии";
  const availableContractMin = raspassExitIsActive ? minimumContractForRaspassExit() : 6;
  const cards = [
    {
      type: "Взятки",
      mark: "♠",
      title: "Игра",
      detail: `Контракты ${format(availableContractMin)}-10`,
      chips: [
        state.players.length === 3 ? "вист / пас" : "вист / пас / полвиста",
        convention.underThreeLoss ? "уход без трёх доступен" : "без ухода без трёх",
        raspassExitIsActive ? raspassExitConditionLabel(convention) : "обычная запись",
      ],
    },
    {
      type: "Распасы",
      mark: "♦",
      title: "Распасы",
      detail: `Сейчас ${format(raspassContract())}`,
      chips: [
        hasRaspassProgression ? `прогрессия ${raspassProgression}` : raspassProgression,
        raspassScoringLabel(convention),
        convention.raspassZeroTricksPool ? "за 0 взяток очки в пулю" : "без записи за 0 взяток",
      ],
    },
    {
      type: "Мизер",
      mark: "♣",
      title: "Мизер",
      detail: "Не взять ни одной",
      chips: [
        hasRaspassProgression ? (convention.misereExitsRaspass ? "выводит из распасов" : "не сбрасывает распасы") : "отдельная запись",
        "можно отметить карты",
      ],
    },
  ];

  if (convention.underThreeLoss) {
    cards.push({
      type: "Взятки",
      mark: "♥",
      title: "Уход без трёх",
      detail: "Быстрый ремиз",
      chips: ["кнопка у играющего", "контракт выбирается в записи"],
    });
  }

  return cards;
}

function raspassExitConditionLabel(convention) {
  if (convention.raspassExitCondition === "one-whister-no-penalty") return "выход: вист без штрафа";
  if (convention.raspassExitCondition === "both-whist-together") return "выход: оба вистуют без штрафа";
  if (convention.raspassExitCondition === "both-whist-each") return "выход: каждый вист без штрафа";
  if (convention.raspassExitCondition === "half-whist") return "выход: полвиста";
  return "выход: сыгранная игра";
}

function raspassScoringLabel(convention) {
  if (convention.raspassScoringMode === "rostov-whist") return "Ростов: висты минимуму";
  return "запись в гору";
}

function createPossibleGameCard(card) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "possible-game-card";
  button.dataset.recordType = card.type;
  button.dataset.mark = card.mark;

  const mark = document.createElement("span");
  mark.className = "possible-game-mark";
  mark.textContent = card.mark;

  const title = document.createElement("strong");
  title.textContent = card.title;

  const detail = document.createElement("span");
  detail.className = "possible-game-detail";
  detail.textContent = card.detail;

  const chips = document.createElement("span");
  chips.className = "possible-game-chips";
  card.chips.filter(Boolean).forEach((chipText) => {
    const chip = document.createElement("span");
    chip.textContent = chipText;
    chips.appendChild(chip);
  });

  button.append(mark, title, detail, chips);
  return button;
}

function displayTotals(actualTotals) {
  if (scoresVisible()) return actualTotals;
  return actualTotals.map((total) => ({
    ...total,
    pool: 0,
    mountain: 0,
    written: 0,
    against: 0,
    net: 0,
    closed: false,
  }));
}

function fullPoolTarget() {
  return state.poolClosingMode === "total"
    ? state.poolTarget
    : state.poolTarget * state.players.length;
}

function displayedClosedPool(totals) {
  const value = state.poolClosingMode === "total"
    ? sum(totals.map((total) => total.pool))
    : sum(totals.map((total) => Math.min(total.pool, state.poolTarget)));
  return Math.min(value, fullPoolTarget());
}

function scoresVisible() {
  return gameStarted() && (state.scoreCountingMode !== "manual" || state.scoresCalculated);
}

function markScoresStale() {
  if (state.scoreCountingMode === "manual") state.scoresCalculated = false;
}

function updateScoreCalculationControls(actualTotals) {
  const visible = gameStarted() && state.scoreCountingMode === "manual";
  el.calculateScoresButton.hidden = !visible;
  if (!visible) closeScoreConfirmation();
  el.calculateScoresButton.disabled = !gameStarted();
  el.calculateScoresButton.textContent = "Посчитать очки";
  el.calculateScoresButton.dataset.complete = actualTotals.every((total) => total.closed) ? "true" : "false";
}

function updateAddPoolControls(actualTotals) {
  const visible = gameStarted() && actualTotals.every((total) => total.closed);
  el.addPoolButton.hidden = !visible;
  if (!visible) closeAddPoolModal();
}

function openAddPoolModal() {
  const fallback = state.initialPoolTarget && state.initialPoolTarget < state.poolTarget
    ? state.poolTarget + state.initialPoolTarget
    : state.poolTarget * 2;
  el.addPoolHint.textContent = `Текущий размер: ${format(state.poolTarget)}`;
  el.newPoolTarget.min = String(state.poolTarget + 1);
  el.newPoolTarget.value = String(Math.max(state.poolTarget + 1, fallback));
  el.addPoolModal.classList.add("open");
  el.addPoolModal.setAttribute("aria-hidden", "false");
  el.newPoolTarget.focus();
}

function closeAddPoolModal() {
  el.addPoolModal.classList.remove("open");
  el.addPoolModal.setAttribute("aria-hidden", "true");
}

function addPoolTarget() {
  const nextTarget = clampNumber(el.newPoolTarget.value, state.poolTarget + 1, 10000, state.poolTarget + Number(state.initialPoolTarget || state.poolTarget));
  if (nextTarget <= state.poolTarget) {
    showMessage("Новый размер пули должен быть больше текущего.");
    return;
  }
  undoStack.push(cloneState());
  redoStack = [];
  state.poolTarget = nextTarget;
  if (!state.initialPoolTarget) state.initialPoolTarget = nextTarget;
  wasFullyClosed = false;
  state.lastChanged = null;
  pushHistory(`Добавлена пуля: до ${format(nextTarget)}`);
  closeAddPoolModal();
  refresh();
  saveAutosavedGame();
}

function requestScoreCalculation() {
  const actualTotals = calculateTotals();
  if (actualTotals.every((total) => total.closed)) {
    applyScoreCalculation();
    return;
  }
  openScoreConfirmation();
}

function openScoreConfirmation() {
  el.scoreConfirmModal.classList.add("open");
  el.scoreConfirmModal.setAttribute("aria-hidden", "false");
}

function closeScoreConfirmation() {
  el.scoreConfirmModal.classList.remove("open");
  el.scoreConfirmModal.setAttribute("aria-hidden", "true");
}

function confirmScoreCalculation() {
  closeScoreConfirmation();
  applyScoreCalculation();
}

function applyScoreCalculation() {
  state.scoresCalculated = true;
  refresh();
  saveAutosavedGame();
}

function gameStarted() {
  return document.body.classList.contains("game-started");
}

function updateGameControls() {
  const disabled = !gameStarted();
  el.openRecordButton.disabled = disabled;
  el.resetButton.disabled = disabled;
  el.reportButton.disabled = disabled;
  el.floatingRecordButton.disabled = disabled;
  if (el.floatingShareButton) {
    el.floatingShareButton.disabled = disabled;
    el.floatingShareButton.hidden = disabled;
    if (disabled) hideShareQrPopover();
  }
  el.saveButton.textContent = gameStarted() ? "Сохранить игру" : "Сохранить конвенцию";
}

function calculateTotals() {
  const avgPool = average(state.pool);
  const avgMountain = average(state.mountain);
  const convention = currentConvention();
  const poolUnit = Number(convention.poolUnit || 0);
  const mountainUnit = Number(convention.mountainUnit ?? convention.poolUnit ?? 0);
  const totalPoolClosed = state.poolClosingMode === "total" && sum(state.pool) >= fullPoolTarget();
  return state.players.map((name, index) => {
    const written = sum(state.whists[index]);
    const against = sum(state.whists.map((row) => row[index]));
    const net = written - against + (avgMountain - state.mountain[index]) * mountainUnit + (state.pool[index] - avgPool) * poolUnit;
    return {
      index,
      name,
      pool: state.pool[index],
      mountain: state.mountain[index],
      written,
      against,
      net,
      closed: state.poolClosingMode === "total" ? totalPoolClosed : state.pool[index] >= state.poolTarget,
    };
  });
}

function scoreDelta(beforeTotals, afterTotals) {
  const beforeByIndex = new Map(beforeTotals.map((total) => [total.index, total]));
  return afterTotals.map((total) => total.net - Number(beforeByIndex.get(total.index)?.net || 0));
}

function scoreDeltaFor(total) {
  if (!scoresVisible() || state.history.length === 0) return null;
  return Number(state.lastScoreDelta?.[total.index] || 0);
}

function scoreText(total) {
  const delta = scoreDeltaFor(total);
  return delta === null ? formatSigned(total.net) : `${formatSigned(total.net)} (${formatSigned(delta)})`;
}

function scoreDeltaClass(delta) {
  return delta >= 0 ? "positive" : "negative";
}

function createScoreLog() {
  return {
    pool: state.players.map((_, index) => [Number(state.pool[index] || 0)]),
    mountain: state.players.map((_, index) => [Number(state.mountain[index] || 0)]),
    whists: state.players.map((_, i) => state.players.map((__, j) => [Number((state.whists[i] || [])[j] || 0)])),
  };
}

function ensureScoreLog() {
  if (!state.scoreLog) state.scoreLog = createScoreLog();
  state.scoreLog.pool = state.players.map((_, index) => {
    const values = Array.isArray(state.scoreLog.pool?.[index]) ? state.scoreLog.pool[index] : [];
    return values.length ? values : [Number(state.pool[index] || 0)];
  });
  state.scoreLog.mountain = state.players.map((_, index) => {
    const values = Array.isArray(state.scoreLog.mountain?.[index]) ? state.scoreLog.mountain[index] : [];
    return values.length ? values : [Number(state.mountain[index] || 0)];
  });
  state.scoreLog.whists = state.players.map((_, i) => state.players.map((__, j) => {
    const values = Array.isArray(state.scoreLog.whists?.[i]?.[j]) ? state.scoreLog.whists[i][j] : [];
    return values.length ? values : [Number((state.whists[i] || [])[j] || 0)];
  }));
}

function pushScoreSnapshot() {
  ensureScoreLog();
  state.players.forEach((_, index) => {
    appendChangedValue(state.scoreLog.pool[index], state.pool[index]);
    appendChangedValue(state.scoreLog.mountain[index], state.mountain[index]);
  });
  state.players.forEach((_, i) => {
    state.players.forEach((__, j) => appendChangedValue(state.scoreLog.whists[i][j], state.whists[i][j]));
  });
}

function appendChangedValue(values, value) {
  const next = Number(value || 0);
  if (Number(values[values.length - 1] || 0) !== next) values.push(next);
}

function renderPoolSheet(totals) {
  ensureScoreLog();
  const svg = el.poolSheet;
  const sheetLineColor = state.lineColor || defaultLineColor();
  svg.style.setProperty("--line", sheetLineColor);
  svg.style.setProperty("--soft-line", sheetLineColor);
  svg.innerHTML = "";
  const g = CLASSIC_LAYOUT;
  const center = { x: g.center, y: g.center };
  const corners = [
    { x: g.cornerMin, y: g.cornerMin },
    { x: g.cornerMax, y: g.cornerMin },
    { x: g.cornerMax, y: g.cornerMax },
    { x: g.cornerMin, y: g.cornerMax },
  ];
  svg.appendChild(node("rect", { x: 20, y: 20, width: 960, height: 960, rx: 24, ry: 24, class: "sheet-bg" }));
  if (totals.length === 5) {
    drawFivePlayerSheet(svg, totals, center);
    applySheetTextBackdrops(svg);
    applySheetLineColorToSvg();
    return;
  }

  drawClassicFrame(svg);
  drawClassicSpokes(svg, corners, center);
  const slots = classicSlots(totals);
  slots.forEach((slot) => drawClassicSlot(svg, slot));

  const fullyClosed = totals.every((total) => total.closed);
  const poolKindLabel = state.poolClosingMode === "total" ? "общая" : "личная";
  svg.appendChild(node("circle", { cx: center.x, cy: center.y, r: g.centerRadius, class: fullyClosed ? "center-pool closed" : "center-pool" }));
  const centerValueOffset = -4;
  const centerLabelOffset = 34;
  svg.appendChild(textCentered(center.x, center.y + centerValueOffset, format(state.poolTarget), "sector-name center-value"));
  svg.appendChild(textCentered(center.x, center.y + centerLabelOffset, poolKindLabel, "sector-small center-label"));
  applySheetTextBackdrops(svg);
  applySheetLineColorToSvg();
}

function drawFivePlayerSheet(svg, totals, center) {
  const poolKindLabel = state.poolClosingMode === "total" ? "общая" : "личная";
  const outer = { x: 70, y: 35, width: 860, height: 930 };
  const inner = [
    { x: 500, y: 250 },
    { x: 735, y: 390 },
    { x: 650, y: 720 },
    { x: 350, y: 720 },
    { x: 265, y: 390 },
  ];

  svg.appendChild(node("polygon", { points: inner.map((point) => `${point.x},${point.y}`).join(" "), class: "sheet-border five-inner" }));

  [
    [70, 70, inner[0].x, inner[0].y],
    [500, 70, inner[0].x, inner[0].y],
    [930, 70, inner[0].x, inner[0].y],
    [930, 70, inner[1].x, inner[1].y],
    [930, 500, inner[1].x, inner[1].y],
    [930, 930, inner[2].x, inner[2].y],
    [500, 930, inner[2].x, inner[2].y],
    [70, 930, inner[3].x, inner[3].y],
    [70, 500, inner[4].x, inner[4].y],
    [70, 70, inner[4].x, inner[4].y],
    [500, center.y, inner[0].x, inner[0].y],
    [center.x, center.y, inner[1].x, inner[1].y],
    [center.x, center.y, inner[2].x, inner[2].y],
    [center.x, center.y, inner[3].x, inner[3].y],
    [center.x, center.y, inner[4].x, inner[4].y],
  ].forEach(([x1, y1, x2, y2]) => {
    svg.appendChild(node("line", { x1, y1, x2, y2, class: "sheet-soft five-guide" }));
  });

  const fullyClosed = totals.every((total) => total.closed);
  svg.appendChild(node("circle", { cx: center.x, cy: center.y, r: 68, class: fullyClosed ? "center-pool closed" : "center-pool" }));
  const centerValueOffset = -4;
  const centerLabelOffset = 36;
  svg.appendChild(textCentered(center.x, center.y + centerValueOffset, format(state.poolTarget), "sector-name center-value"));
  svg.appendChild(textCentered(center.x, center.y + centerLabelOffset, poolKindLabel, "sector-small center-label"));

  const configs = [
    { x: 500, y: 150, seat: "С", width: 400, height: 236, colWidth: 88, rowHeight: 68 },
    { x: 835, y: 500, seat: "В", rotate: -90, width: 380, height: 236, colWidth: 88, rowHeight: 68 },
    { x: 665, y: 825, seat: "Ю", width: 320, height: 236, colWidth: 72, rowHeight: 68 },
    { x: 335, y: 825, seat: "Ю-З", width: 320, height: 236, colWidth: 72, rowHeight: 68 },
    { x: 165, y: 500, seat: "С-З", rotate: 90, width: 380, height: 236, colWidth: 88, rowHeight: 68 },
  ];
  totals.forEach((total, index) => drawFivePlayerSlot(svg, total, configs[index]));
}

function drawFivePlayerSlot(svg, total, cfg) {
  const group = node("g", {});
  if (cfg.rotate) group.setAttribute("transform", `rotate(${cfg.rotate} ${cfg.x} ${cfg.y})`);
  svg.appendChild(group);
  const cardWidth = cfg.width || 280;
  const cardHeight = cfg.height || 220;
  group.appendChild(node("rect", { x: cfg.x - cardWidth / 2, y: cfg.y - cardHeight / 2, width: cardWidth, height: cardHeight, rx: 6, class: "five-player-card" }));
  group.appendChild(text(cfg.x, cfg.y - 66, `${cfg.seat} · ${total.name}`, "sector-name five-name", "middle"));
  drawScoreText(group, cfg.x, cfg.y - 10, total, cfg.y - 40);
  group.appendChild(sequenceText(cfg.x - 48, cfg.y - 20, "△", scoreHistory("mountain", total.index), "pool-track five-pool-track", "middle"));
  group.appendChild(sequenceText(cfg.x + 48, cfg.y - 20, "▶", scoreHistory("pool", total.index), "pool-track five-pool-track", "middle"));
  drawFiveWhistGrid(group, cfg.x, cfg.y + 78, total.index, cfg.colWidth || 62, cfg.rowHeight || 56);
}

function drawFiveWhistGrid(group, cx, cy, playerIndex, colWidth, rowHeight = 56) {
  const opponents = whistOpponents(playerIndex);
  const startX = cx - colWidth * 2;
  const startY = cy - rowHeight / 2;
  const hasWrittenWhists = opponents.some((opponent) => opponent.values.some((value) => value !== 0));
  group.appendChild(node("rect", { x: startX, y: startY, width: colWidth * 4, height: rowHeight, class: "whist-grid-box five-whist-grid" }));
  [1, 2, 3].forEach((col) => {
    group.appendChild(node("line", { x1: startX + col * colWidth, y1: startY, x2: startX + col * colWidth, y2: startY + rowHeight, class: "whist-grid-line" }));
  });
  opponents.forEach((opponent, col) => {
    const x = startX + col * colWidth + colWidth / 2;
    group.appendChild(text(x, startY - 10, fiveSeatLabel(opponent.index), "five-whist-label", "middle"));
    const textNode = whistCellText(x, cy, hasWrittenWhists ? opponent.values : [0], "whist-track five-whist-value");
    if (textNode) group.appendChild(textNode);
  });
}

function fiveSeatLabel(index) {
  return ["С", "В", "Ю", "Ю-З", "С-З"][index] || String(index + 1);
}

const CLASSIC_LAYOUT = {
  center: 500,
  outerMin: 110,
  outerMax: 890,
  sideMin: 200,
  sideMax: 800,
  innerMin: 250,
  innerMax: 750,
  guideMin: 70,
  guideMax: 930,
  cornerMin: 60,
  cornerMax: 940,
  centerRadius: 58,
  centerSafeRadius: 72,
  scoreGapFromSafeCircle: 46,
  scoreBlockWidth: 184,
  compactScoreBlockWidth: 92,
  scoreBlockHeight: 62,
  compactScoreBlockHeight: 62,
  scoreLineOffset: 2,
  compactScoreLineOffset: 2,
  labelBlockWidth: 124,
  labelBlockHeight: 44,
  labelDistance: 220,
  mountainDistance: 84,
};

function classicSeat(side) {
  if (side === "top") return { ux: 0, uy: -1, scoreAngle: 0, labelAngle: 0, flipScore: true };
  if (side === "right") return { ux: 1, uy: 0, scoreAngle: -90, labelAngle: -90 };
  if (side === "left") return { ux: -1, uy: 0, scoreAngle: 90, labelAngle: 90 };
  return { ux: 0, uy: 1, scoreAngle: 0, labelAngle: 0 };
}

function classicAxisPoint(seat, distance) {
  const c = CLASSIC_LAYOUT.center;
  return { x: c + seat.ux * distance, y: c + seat.uy * distance };
}

function classicScoreDistance(scoreBlockHeight = CLASSIC_LAYOUT.scoreBlockHeight) {
  const g = CLASSIC_LAYOUT;
  return g.centerSafeRadius + g.scoreGapFromSafeCircle + scoreBlockHeight / 2;
}

function classicLabelDistance() {
  return CLASSIC_LAYOUT.labelDistance;
}

function classicScoreMetrics(total = null) {
  const g = CLASSIC_LAYOUT;
  const hasDelta = total ? scoreDeltaFor(total) !== null : true;
  return {
    hasDelta,
    scoreBlockWidth: hasDelta ? g.scoreBlockWidth : g.compactScoreBlockWidth,
    scoreBlockHeight: hasDelta ? g.scoreBlockHeight : g.compactScoreBlockHeight,
  };
}

function classicSlotGeometry(side, metrics = classicScoreMetrics()) {
  const g = CLASSIC_LAYOUT;
  const seat = classicSeat(side);
  const score = classicAxisPoint(seat, classicScoreDistance(metrics.scoreBlockHeight));
  const label = classicAxisPoint(seat, classicLabelDistance(metrics.scoreBlockHeight));
  return {
    labelX: label.x,
    labelY: label.y,
    labelRotate: seat.labelAngle,
    scoreX: score.x,
    scoreY: score.y,
    scoreRotate: seat.scoreAngle,
    scoreBlockWidth: metrics.scoreBlockWidth,
    scoreBlockHeight: metrics.scoreBlockHeight,
    scoreLineOffset: metrics.hasDelta ? g.scoreLineOffset : g.compactScoreLineOffset,
  };
}
function drawClassicFrame(svg) {
  const g = CLASSIC_LAYOUT;
  [
    [g.outerMin, g.sideMax, g.outerMax, g.sideMax],
    [g.outerMin, g.sideMin, g.outerMax, g.sideMin],
    [g.sideMin, g.guideMin, g.sideMin, g.guideMax],
    [g.sideMax, g.guideMin, g.sideMax, g.guideMax],
    [g.innerMin, g.innerMin, g.innerMax, g.innerMin],
    [g.innerMin, g.innerMax, g.innerMax, g.innerMax],
    [g.innerMin, g.innerMin, g.innerMin, g.innerMax],
    [g.innerMax, g.innerMin, g.innerMax, g.innerMax],
  ].forEach(([x1, y1, x2, y2]) => {
    svg.appendChild(node("line", { x1, y1, x2, y2, class: "sheet-soft" }));
  });
}
function drawClassicSpokes(svg, corners, center) {
  corners.forEach((corner) => {
    svg.appendChild(node("line", { x1: center.x, y1: center.y, x2: corner.x, y2: corner.y, class: "sheet-spoke" }));
  });
}

function classicSlots(totals) {
  const emptyTop = totals.length === 3;
  const slots = [
    { side: "top", total: emptyTop ? null : totals[0] },
    { side: "right", total: emptyTop ? totals[0] : totals[1] },
    { side: "bottom", total: emptyTop ? totals[1] : totals[2] },
    { side: "left", total: emptyTop ? totals[2] : totals[3] },
  ];
  if (totals.length === 5) slots[0].extra = totals[4];
  return slots;
}

function drawClassicSlot(svg, slot) {
  if (!slot.total) {
    drawEmptySlot(svg, slot.side);
    return;
  }
  const cfg = slotConfig(slot.side);
  cfg.side = slot.side;
  const total = slot.total;
  Object.assign(cfg, classicSlotGeometry(slot.side, classicScoreMetrics(total)));

  const whistGroup = node("g", {});
  if (cfg.rotate) whistGroup.setAttribute("transform", `rotate(${cfg.rotate} ${cfg.cx} ${cfg.cy})`);
  svg.appendChild(whistGroup);
  drawWhistSummary(whistGroup, cfg, total);

  drawSlotLabel(svg, cfg, total.name);
  drawSlotScore(svg, cfg, total);
  drawPoolMountainTracks(svg, slot.side, total);

  if (slot.extra) {
    drawExtraPlayer(svg, slot.extra);
  }
}

function drawSlotLabel(svg, cfg, label) {
  const g = CLASSIC_LAYOUT;
  const group = node("g", { class: "classic-label-combo" });
  if (cfg.labelRotate) group.setAttribute("transform", `rotate(${cfg.labelRotate} ${cfg.labelX} ${cfg.labelY})`);
  group.appendChild(node("rect", {
    x: cfg.labelX - g.labelBlockWidth / 2,
    y: cfg.labelY - g.labelBlockHeight / 2,
    width: g.labelBlockWidth,
    height: g.labelBlockHeight,
    rx: 7,
    ry: 7,
    class: "label-block-backdrop",
  }));
  group.appendChild(text(cfg.labelX, cfg.labelY, label, "sector-name", "middle"));
  svg.appendChild(group);
}
function drawSlotScore(svg, cfg, total) {
  if (!gameStarted()) return;
  drawClassicScoreBlock(svg, cfg, total);
}

function drawClassicScoreBlock(svg, cfg, total) {
  const group = node("g", { class: "score-combo classic-score-combo" });
  if (cfg.scoreRotate) group.setAttribute("transform", `rotate(${cfg.scoreRotate} ${cfg.scoreX} ${cfg.scoreY})`);
  group.appendChild(node("rect", {
    x: cfg.scoreX - cfg.scoreBlockWidth / 2,
    y: cfg.scoreY - cfg.scoreBlockHeight / 2,
    width: cfg.scoreBlockWidth,
    height: cfg.scoreBlockHeight,
    rx: 7,
    ry: 7,
    class: "score-block-backdrop",
  }));
  const delta = scoreDeltaFor(total);
  const scoreLine = node("text", {
    x: cfg.scoreX,
    y: cfg.scoreY + cfg.scoreLineOffset,
    class: total.net >= 0 ? "sector-text score-line positive" : "sector-text score-line negative",
    "text-anchor": "middle",
    "dominant-baseline": "middle",
  });
  const main = node("tspan", { class: "score-main-svg" });
  main.textContent = formatSigned(total.net);
  scoreLine.appendChild(main);
  if (delta !== null) {
    const deltaSpan = node("tspan", { class: `score-delta-svg score-inline-delta ${scoreDeltaClass(delta)}`, dx: 8 });
    deltaSpan.textContent = `[${formatSigned(delta)}]`;
    scoreLine.appendChild(deltaSpan);
  }
  group.appendChild(scoreLine);
  svg.appendChild(group);
}
function slotConfig(side) {
  const g = CLASSIC_LAYOUT;
  const geometry = classicSlotGeometry(side);
  if (side === "top") {
    return {
      cx: g.center, cy: 130, whistY: 130, rotate: 0,
      ...geometry,
      emptyX: g.center, emptyY: 292,
    };
  }
  if (side === "right") {
    return {
      cx: g.outerMax, cy: g.center, whistY: g.center, rotate: -90,
      ...geometry,
      emptyX: 835, emptyY: g.center, emptyRotate: -90,
    };
  }
  if (side === "bottom") {
    return {
      cx: g.center, cy: 870, whistY: 870, rotate: 0,
      ...geometry,
      emptyX: g.center, emptyY: 785,
    };
  }
  return {
    cx: g.outerMin, cy: g.center, whistY: g.center, rotate: 90,
    ...geometry,
    emptyX: 165, emptyY: g.center, emptyRotate: 90,
  };
}
function drawPoolMountainTracks(svg, side, total) {
  if (!gameStarted()) return;
  const cfg = trackConfig(side);
  const group = node("g", {});
  const poolLine = drawPlayerTrackLine(group, cfg.pool, "▶", scoreHistory("pool", total.index));
  const mountainLine = drawPlayerTrackLine(group, cfg.mountain, "△", scoreHistory("mountain", total.index));
  svg.appendChild(group);
  centerPoolTrackInCorridor(svg, poolLine, side);
  centerSvgTextOnPoint(mountainLine, cfg.mountain.x, cfg.mountain.y);
  if (state.poolClosingMode === "each" && total.closed) {
    svg.appendChild(text(cfg.closed.x, cfg.closed.y, "закрыл", "closed-text", "middle"));
  }
}

function drawPlayerTrackLine(group, cfg, label, values) {
  const line = sequenceText(cfg.x, cfg.y, label, values, "pool-track sector-track", cfg.anchor || "start");
  if (cfg.rotate) line.setAttribute("transform", `rotate(${cfg.rotate} ${cfg.x} ${cfg.y})`);
  group.appendChild(line);
  return line;
}

function centerPoolTrackInCorridor(svg, line, side) {
  if (!line || typeof line.getBoundingClientRect !== "function" || typeof svg.createSVGPoint !== "function") return;
  const rect = line.getBoundingClientRect();
  if (!rect.width && !rect.height) return;
  const center = svgPoint(svg, rect.left + rect.width / 2, rect.top + rect.height / 2);
  const target = side === "right" ? 775 : side === "left" ? 225 : side === "bottom" ? 775 : 225;
  const dx = side === "left" || side === "right" ? target - center.x : 0;
  const dy = side === "top" || side === "bottom" ? target - center.y : 0;
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;
  const existing = line.getAttribute("transform") || "";
  line.setAttribute("transform", `translate(${formatSvgNumber(dx)} ${formatSvgNumber(dy)})${existing ? ` ${existing}` : ""}`);
}

function centerSvgTextOnPoint(textNode, targetX, targetY) {
  const parent = textNode?.parentNode;
  const svg = textNode?.ownerSVGElement;
  if (!parent || !svg || typeof textNode.getBoundingClientRect !== "function" || typeof svg.createSVGPoint !== "function") return;
  const matrix = parent.getScreenCTM?.();
  if (!matrix) return;
  const rect = textNode.getBoundingClientRect();
  if (!rect.width && !rect.height) return;
  const point = svg.createSVGPoint();
  point.x = rect.left + rect.width / 2;
  point.y = rect.top + rect.height / 2;
  const center = point.matrixTransform(matrix.inverse());
  const dx = targetX - center.x;
  const dy = targetY - center.y;
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;
  const existing = textNode.getAttribute("transform") || "";
  textNode.setAttribute("transform", `translate(${formatSvgNumber(dx)} ${formatSvgNumber(dy)})${existing ? ` ${existing}` : ""}`);
}

function svgPoint(svg, clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();
  return matrix ? point.matrixTransform(matrix.inverse()) : point;
}

function formatSvgNumber(value) {
  return Number(value.toFixed(3));
}

function trackConfig(side) {
  const g = CLASSIC_LAYOUT;
  if (side === "top") return {
    pool: { x: 270, y: 225, anchor: "start" },
    mountain: { x: g.center, y: g.center - g.mountainDistance, anchor: "middle" },
    closed: { x: 706, y: 326 },
  };
  if (side === "right") return {
    pool: { x: 775, y: 730, rotate: -90, anchor: "start" },
    mountain: { x: g.center + g.mountainDistance, y: g.center, rotate: -90, anchor: "middle" },
    closed: { x: 684, y: 706 },
  };
  if (side === "bottom") return {
    pool: { x: 270, y: 775, anchor: "start" },
    mountain: { x: g.center, y: g.center + g.mountainDistance, anchor: "middle" },
    closed: { x: 706, y: 668 },
  };
  return {
    pool: { x: 225, y: 270, rotate: 90, anchor: "start" },
    mountain: { x: g.center - g.mountainDistance, y: g.center, rotate: 90, anchor: "middle" },
    closed: { x: 316, y: 706 },
  };
}
function drawEmptySlot(svg, side) {
  const cfg = slotConfig(side);
  const group = node("g", {});
  if (cfg.emptyRotate) group.setAttribute("transform", `rotate(${cfg.emptyRotate} ${cfg.emptyX} ${cfg.emptyY})`);
  group.appendChild(whistVectorCell(cfg.emptyX, cfg.emptyY, "X", 46, 44, "whist-track missing-whist", null));
  svg.appendChild(group);
}

function drawExtraPlayer(svg, total) {
  const group = node("g", {});
  group.appendChild(text(500, 242, total.name, "sector-name", "middle"));
  drawScoreText(group, 500, 326, total, 278);
  group.appendChild(text(500, 360, `(П ${format(total.pool)} / Г ${format(total.mountain)} / В ${format(total.written)})`, "sector-small", "middle"));
  svg.appendChild(group);
}

function drawScoreText(group, x, y, total, deltaY = y - 40) {
  if (!gameStarted()) return;
  const scoreGroup = node("g", { class: "score-combo" });
  scoreGroup.appendChild(text(x, y, formatSigned(total.net), total.net >= 0 ? "sector-text positive" : "sector-text negative", "middle"));
  const delta = scoreDeltaFor(total);
  if (delta !== null) {
    scoreGroup.appendChild(text(x, deltaY, `[${formatSigned(delta)}]`, `score-delta-svg ${scoreDeltaClass(delta)}`, "middle"));
  }
  group.appendChild(scoreGroup);
}

function scoreHistory(area, index) {
  ensureScoreLog();
  if (!gameStarted()) return [];
  if (!scoresVisible()) return [0];
  return markLastChangedValues(
    (state.scoreLog[area]?.[index] || [0]).slice(-2).map((value) => Number(value || 0)),
    Boolean(state.lastChanged?.[area]?.[index]),
  );
}

function whistHistory(playerIndex, targetIndex) {
  ensureScoreLog();
  if (!gameStarted()) return [];
  if (!scoresVisible()) return [0];
  return markLastChangedValues(
    (state.scoreLog.whists?.[playerIndex]?.[targetIndex] || [0]).slice(-2).map((value) => Number(value || 0)),
    Boolean(state.lastChanged?.whists?.[playerIndex]?.[targetIndex]),
  );
}

function markLastChangedValues(values, changed) {
  if (!changed || values.length === 0) return values;
  return values.map((value, index) => index === values.length - 1 ? { value, changed: true } : value);
}

function sequenceText(x, y, label, values, className, anchor = "start", suffix = "") {
  const item = node("text", { x, y, class: className, "text-anchor": anchor, "dominant-baseline": "middle" });
  if (label) {
    const labelSpan = node("tspan", {});
    labelSpan.textContent = `${label} `;
    item.appendChild(labelSpan);
  }
  values.forEach((value, index) => {
    const changed = isChangedValue(value);
    const classes = [
      index < values.length - 1 ? "crossed" : "",
      changed ? "last-change" : "",
    ].filter(Boolean).join(" ");
    const part = node("tspan", classes ? { class: classes } : {});
    part.textContent = `${formatTrackValue(value)}${index < values.length - 1 ? ". " : suffix}`;
    item.appendChild(part);
  });
  return item;
}

function formatTrackValue(value) {
  if (value && typeof value === "object") return formatTrackValue(value.value);
  return typeof value === "string" ? value : format(value);
}

function drawWhistSummary(group, cfg, total) {
  const opponents = whistOpponents(total.index);
  const hasWrittenWhists = opponents.some((opponent) => opponent.values.some((value) => value !== 0));
  drawWhistGrid(group, cfg, opponents, hasWrittenWhists);
}

function whistOpponents(playerIndex) {
  return state.players
    .map((name, index) => ({ name, index, values: whistHistory(playerIndex, index) }))
    .filter((opponent) => opponent.index !== playerIndex);
}

function drawWhistGrid(group, cfg, opponents, hasWrittenWhists) {
  const colWidth = cfg.colWidth || 130;
  const rowHeight = cfg.rowHeight || 88;
  const startX = cfg.cx - colWidth * 1.5;
  const startY = cfg.whistY - rowHeight / 2;
  group.appendChild(node("rect", {
    x: startX,
    y: startY,
    width: colWidth * 3,
    height: rowHeight,
    class: "whist-grid-box",
  }));
  [1, 2].forEach((col) => {
    group.appendChild(node("line", {
      x1: startX + col * colWidth,
      y1: startY,
      x2: startX + col * colWidth,
      y2: startY + rowHeight,
      class: "whist-grid-line",
    }));
  });
  const columns = whistColumns(totalIndexFromOpponents(opponents), opponents);
  columns.forEach((column, col) => {
    const sideClass = cfg.side ? `whist-side-${cfg.side}` : "";
    const className = [
      column.missing ? "whist-track missing-whist" : "whist-track",
      sideClass,
    ].filter(Boolean).join(" ");
    const values = !gameStarted() ? (column.missing ? ["X"] : []) : column.missing ? ["X"] : hasWrittenWhists ? column.opponent.values : [0];
    const cellX = startX + col * colWidth + colWidth / 2;
    const cellY = startY + rowHeight / 2;
    const textNode = whistCellText(cellX, cellY, values, className);
    if (textNode) group.appendChild(textNode);
  });
}

function whistCellText(x, y, values, className) {
  if (!values.length) return null;
  const formatted = values.map(formatTrackValue);
  const isFivePlayerValue = className.includes("five-whist-value");
  const displayValue = formatted[0].toUpperCase();
  const height = isFivePlayerValue ? 46 : 44;
  if (formatted.length === 1 && displayValue === "X") {
    return whistVectorCell(x, y, displayValue, isFivePlayerValue ? 48 : 46, height, className, values[0]);
  }
  const textWidth = formatted.reduce((sum, value, index) => sum + value.length + (index < formatted.length - 1 ? 2 : 0), 0);
  const width = Math.max(isFivePlayerValue ? 48 : 46, textWidth * (isFivePlayerValue ? 14 : 17) + 14);
  return whistVectorSequenceCell(x, y, formatted, values, width, height, className);
}

function whistHtmlCell(x, y, value, width, height, className, rawValue) {
  const group = node("g", { class: "whist-cell-combo" });
  const object = node("foreignObject", {
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
    class: "whist-cell-object",
  });
  const box = document.createElement("div");
  box.className = ["whist-cell-html", className].filter(Boolean).join(" ");
  const span = document.createElement("span");
  if (isChangedValue(rawValue)) span.className = "last-change";
  span.textContent = value;
  box.appendChild(span);
  object.appendChild(box);
  group.appendChild(object);
  return group;
}

function whistVectorSequenceCell(x, y, formatted, values, width, height, className) {
  const isFivePlayerValue = className.includes("five-whist-value");
  const group = node("g", { class: "whist-vector-cell" });
  group.appendChild(node("rect", {
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
    rx: 7,
    ry: 7,
    class: "whist-cell-backdrop",
  }));
  const textNode = node("text", {
    x,
    y,
    class: ["whist-vector-text", isFivePlayerValue ? "five-whist-value" : ""].filter(Boolean).join(" "),
    "text-anchor": "middle",
    "dominant-baseline": "middle",
    "alignment-baseline": "middle",
    dy: isFivePlayerValue ? "0.08em" : "0.10em",
  });
  formatted.forEach((value, index) => {
    const classes = [
      index < formatted.length - 1 ? "crossed" : "",
      isChangedValue(values[index]) ? "last-change" : "",
    ].filter(Boolean).join(" ");
    const span = node("tspan", classes ? { class: classes } : {});
    span.textContent = `${value}${index < formatted.length - 1 ? ". " : ""}`;
    textNode.appendChild(span);
  });
  group.appendChild(textNode);
  return group;
}
function whistVectorCell(x, y, value, width, height, className, rawValue) {
  const isMissing = className.includes("missing-whist");
  const isLastChange = isChangedValue(rawValue);
  const isFivePlayerValue = className.includes("five-whist-value");
  const group = node("g", { class: "whist-vector-cell" });
  group.appendChild(node("rect", {
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
    rx: 7,
    ry: 7,
    class: "whist-cell-backdrop",
  }));
  const glyphClass = ["whist-vector-glyph", isMissing ? "missing-whist" : "", isLastChange ? "last-change" : ""].filter(Boolean).join(" ");
  if (value === "X") {
    const half = isFivePlayerValue ? 10 : 11;
    group.appendChild(node("line", { x1: x - half, y1: y - half, x2: x + half, y2: y + half, class: glyphClass }));
    group.appendChild(node("line", { x1: x + half, y1: y - half, x2: x - half, y2: y + half, class: glyphClass }));
    return group;
  }

  const textNode = node("text", {
    x,
    y,
    class: ["whist-vector-text", isFivePlayerValue ? "five-whist-value" : "", isLastChange ? "last-change" : ""].filter(Boolean).join(" "),
    "text-anchor": "middle",
    "dominant-baseline": "middle",
    "alignment-baseline": "middle",
    dy: isFivePlayerValue ? "0.08em" : "0.10em",
  });
  textNode.textContent = value;
  group.appendChild(textNode);
  return group;
}

function totalIndexFromOpponents(opponents) {
  const opponentIndexes = opponents.map((opponent) => opponent.index);
  return state.players.findIndex((_, index) => !opponentIndexes.includes(index));
}

function whistColumns(playerIndex, opponents) {
  const opponentByIndex = new Map(opponents.map((opponent) => [opponent.index, opponent]));
  const columnFromIndex = (index) => {
    if (index === null) return { missing: true };
    return { opponent: opponentByIndex.get(index) };
  };

  if (state.players.length === 3) {
    const columnsByPlayer = [
      [1, 2, null],
      [2, null, 0],
      [null, 0, 1],
    ];
    return columnsByPlayer[playerIndex].map(columnFromIndex);
  }

  if (state.players.length === 4) {
    const columnsByPlayer = [
      [1, 2, 3],
      [2, 3, 0],
      [3, 0, 1],
      [0, 1, 2],
    ];
    return columnsByPlayer[playerIndex].map(columnFromIndex);
  }

  return opponents.slice(0, 3).map((opponent) => ({ opponent }));
}

function wrappedSequenceText(x, y, label, values, className, maxChars, anchor = "start") {
  const item = node("text", { x, y, class: className, "text-anchor": anchor, "dominant-baseline": "middle" });
  let currentLength = 0;
  const chunks = [
    ...(label ? [{ text: `${label} `, crossed: false }] : []),
    ...values.map((value, index) => ({
      text: `${formatTrackValue(value)}${index < values.length - 1 ? ". " : ""}`,
      crossed: index < values.length - 1,
      last: isChangedValue(value),
    })),
  ];
  chunks.forEach((chunk, index) => {
    if (index > 0 && currentLength + chunk.text.length > maxChars) {
      const breakSpan = node("tspan", { x, dy: 20 });
      breakSpan.textContent = "";
      item.appendChild(breakSpan);
      currentLength = 0;
    }
    const className = [chunk.crossed ? "crossed" : "", chunk.last ? "last-change" : ""].filter(Boolean).join(" ");
    const attrs = className ? { class: className } : {};
    const span = node("tspan", attrs);
    span.textContent = chunk.text;
    item.appendChild(span);
    currentLength += chunk.text.length;
  });
  return item;
}

function isChangedValue(value) {
  return Boolean(value && typeof value === "object" && value.changed);
}

function renderScoreTable(totals) {
  const sortedTotals = totals.slice().sort((a, b) => {
    const scoreDelta = b.net - a.net;
    if (scoreDelta) return scoreDelta;
    return a.index - b.index;
  });
  el.scoreBody.innerHTML = sortedTotals.map((total) => `
    <tr>
      <td>${escapeHtml(total.name)}</td>
      <td>${format(total.pool)}</td>
      <td>${format(total.mountain)}</td>
      <td>${format(total.written)}</td>
      <td class="${total.net >= 0 ? "positive" : "negative"}">${scoreCellHtml(total)}</td>
    </tr>
  `).join("");
}

function scoreCellHtml(total) {
  const delta = scoreDeltaFor(total);
  if (delta === null) return format(total.net);
  return `${format(total.net)} <span class="score-delta ${scoreDeltaClass(delta)}">(${formatSigned(delta)})</span>`;
}

function renderHistory() {
  el.historyList.innerHTML = state.history.slice().reverse().map((item) => `<li>${historyItemHtml(item)}</li>`).join("");
}

function historyItemHtml(item) {
  const marker = "\n[[history-details]]\n";
  const text = String(item || "");
  if (!text.includes(marker)) return escapeHtml(text);
  const [summary, details] = text.split(marker);
  return `${escapeHtml(summary)}${details || ""}`;
}

function resetScores() {
  if (!confirm("Очистить все очки и журнал?")) return;
  undoStack.push(cloneState());
  redoStack = [];
  state.pool = state.players.map(() => 0);
  state.mountain = state.players.map(() => 0);
  state.whists = state.players.map(() => state.players.map(() => 0));
  state.scoreLog = createScoreLog();
  state.lastScoreDelta = state.players.map(() => 0);
  state.lastChanged = null;
  state.scoresCalculated = state.scoreCountingMode !== "manual";
  state.raspassLevel = 0;
  state.history = [];
  state.gameId = null;
  state.remoteUpdatedAt = null;
  detachRemoteGame();
  clearGameUrl();
  undoStack = [];
  redoStack = [];
  document.body.classList.remove("game-started");
  closeConventionModal();
  clearAutosavedGame();
  refresh();
}

function newGame() {
  if (currentGameNeedsResetWarning() && !confirm("Текущая партия ещё не завершена. Начать новую и сбросить журнал?")) return;
  state.convention = "Сочи";
  state.poolTarget = 20;
  state.initialPoolTarget = 20;
  state.raspassLevel = 0;
  state.themeColor = "#28733b";
  state.buttonTextColor = "#ffffff";
  state.headerButtonColor = "#ffffff";
  state.headerButtonTextColor = "#18202a";
  state.headerTextColor = "#ffffff";
  state.headerColor = "#28733b";
  state.backgroundColor = "#eef2f7";
  state.tableColor = "#ffffff";
  state.clothColor = "#ffffff";
  state.lineColor = "#3f454a";
  state.appearanceMode = "light";
  state.scoreCountingMode = "live";
  state.scoresCalculated = true;
  state.poolClosingMode = "each";
  state.players = ["Игрок 1", "Игрок 2", "Игрок 3"];
  state.pool = [0, 0, 0];
  state.mountain = [0, 0, 0];
  state.whists = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  state.scoreLog = createScoreLog();
  state.lastScoreDelta = state.players.map(() => 0);
  state.lastChanged = null;
  state.history = [];
  state.gameId = null;
  state.remoteUpdatedAt = null;
  detachRemoteGame();
  clearGameUrl();
  undoStack = [];
  redoStack = [];
  document.body.classList.remove("game-started");
  closeConventionModal();
  clearAutosavedGame();
  renderConventionOptions();
  el.convention.value = state.convention;
  el.poolTarget.value = String(state.poolTarget);
  el.themeColor.value = state.themeColor;
  el.buttonTextColor.value = state.buttonTextColor;
  el.headerButtonColor.value = state.headerButtonColor;
  el.headerButtonTextColor.value = state.headerButtonTextColor;
  el.headerTextColor.value = state.headerTextColor;
  el.headerColor.value = state.headerColor;
  el.backgroundColor.value = state.backgroundColor;
  el.tableColor.value = state.tableColor;
  el.clothColor.value = state.clothColor;
  el.lineColor.value = state.lineColor;
  el.scoreCountingMode.value = state.scoreCountingMode;
  el.poolClosingMode.value = state.poolClosingMode;
  el.playerCount.value = "3";
  applyTheme();
  renderSetupPlayers();
  hydrateSelectors();
  renderRoundRows();
  refresh();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function currentGameNeedsResetWarning() {
  if (!gameStarted()) return false;
  const hasEntries = state.history.length
    || sum(state.pool.map((value) => Math.abs(Number(value || 0))))
    || sum(state.mountain.map((value) => Math.abs(Number(value || 0))))
    || sum(state.whists.flat().map((value) => Math.abs(Number(value || 0))));
  const unfinished = !calculateTotals().every((total) => total.closed);
  return Boolean(hasEntries || unfinished);
}

function saveGame() {
  if (!gameStarted()) {
    saveConventionFile();
    return;
  }
  downloadJson("preferans.pref.json", state);
}

function saveConventionFile() {
  downloadJson("preferans-convention.pref-convention.json", {
    type: "preferans-convention",
    convention: currentConvention(),
  });
}

function downloadJson(filename, payload) {
  const data = JSON.stringify(payload, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function loadGame(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const loaded = JSON.parse(reader.result);
      if (isConventionFile(loaded)) {
        importConventionFile(loaded);
        event.target.value = "";
        return;
      }
      Object.assign(state, normalizeState(loaded));
      undoStack = [];
      redoStack = [];
      document.body.classList.add("game-started");
      if (state.gameId) {
        setGameUrl(state.gameId);
        subscribeRemoteGame(state.gameId);
      }
      closeConventionModal();
  renderConventionOptions();
      el.convention.value = state.convention;
      el.poolTarget.value = state.poolTarget;
      el.themeColor.value = state.themeColor;
      el.buttonTextColor.value = state.buttonTextColor;
      el.headerButtonColor.value = state.headerButtonColor;
      el.headerColor.value = state.headerColor;
      el.backgroundColor.value = state.backgroundColor;
      el.clothColor.value = state.clothColor;
      el.scoreCountingMode.value = state.scoreCountingMode;
      el.poolClosingMode.value = state.poolClosingMode;
      el.playerCount.value = state.players.length;
      applyTheme();
      renderSetupPlayers();
      hydrateSelectors();
      renderRoundRows();
      refresh();
      saveAutosavedGame();
    } catch (error) {
      showMessage("Не удалось загрузить файл.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function isConventionFile(source) {
  return source?.type === "preferans-convention" || (source?.convention && !source.players && !source.pool);
}

function importConventionFile(source) {
  if (gameStarted()) {
    showMessage("Конвенцию можно загрузить до старта новой партии.");
    return;
  }
  const convention = normalizeConventionConfig(source.convention || source);
  convention.name = uniqueConventionName(convention.name || "Своя конвенция");
  state.customConventions.push(convention);
  state.convention = convention.name;
  renderConventionOptions();
  el.convention.value = state.convention;
  renderConventionPanel();
  showMessage("Конвенция загружена.");
}

function setupRemoteSync() {
  const config = window.FIREBASE_CONFIG;
  const hasConfig = config && config.apiKey && !String(config.apiKey).includes("YOUR_");
  if (!hasConfig || !window.firebase?.initializeApp || !window.firebase?.firestore) return;
  try {
    if (!window.firebase.apps.length) window.firebase.initializeApp(config);
    remoteDb = window.firebase.firestore();
    remoteDb.settings({ ignoreUndefinedProperties: true });
    remoteAvailable = true;
  } catch (error) {
    remoteAvailable = false;
    remoteDb = null;
    console.warn("Firebase initialization failed", error);
  }
}

function normalizeGameId(value) {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9_-]{16,64}$/.test(id) ? id : null;
}

function getUrlGameId() {
  const params = new URLSearchParams(window.location.search);
  return normalizeGameId(params.get("game") || params.get("g") || window.location.hash.slice(1));
}

function generateGameToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function setGameUrl(gameId) {
  if (!gameId || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.set("game", gameId);
  window.history.replaceState({}, "", url);
}

function clearGameUrl() {
  if (!window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.delete("game");
  window.history.replaceState({}, "", (url.pathname + url.search + url.hash) || ".");
}

function remoteGameRef(gameId = state.gameId) {
  return remoteDb && gameId ? remoteDb.collection("games").doc(gameId) : null;
}

function detachRemoteGame() {
  if (typeof remoteUnsubscribe === "function") remoteUnsubscribe();
  remoteUnsubscribe = null;
}

function subscribeRemoteGame(gameId = state.gameId) {
  if (!remoteAvailable || !remoteDb || !gameId) return;
  detachRemoteGame();
  remoteUnsubscribe = remoteGameRef(gameId).onSnapshot((snapshot) => {
    if (!snapshot.exists) return;
    const remoteState = remoteStateFromSnapshot(snapshot.data() || {});
    if (!remoteState) return;
    const normalized = normalizeState(remoteState);
    if (normalized.remoteUpdatedAt && normalized.remoteUpdatedAt === state.remoteUpdatedAt) return;
    applyingRemoteState = true;
    applyRemoteGameState(remoteState, gameId);
    applyingRemoteState = false;
  }, (error) => {
    console.warn("Remote game subscription failed", error);
    showMessage("Не удалось подключиться к общей игре.");
  });
}

async function loadRemoteGame(gameId) {
  if (!remoteAvailable || !remoteDb) {
    showMessage("Firebase не подключён. Проверьте firebase-config.js и подключение к сети.");
    return;
  }
  try {
    const snapshot = await remoteGameRef(gameId).get();
    if (!snapshot.exists) {
      showMessage("Игра по ссылке не найдена. Возможно, ссылка создана до подключения Firebase.");
      return;
    }
    const remoteStateValue = remoteStateFromSnapshot(snapshot.data() || {});
    if (!remoteStateValue) {
      showMessage("Игра по ссылке повреждена или сохранена в старом формате.");
      return;
    }
    setGameUrl(gameId);
    applyingRemoteState = true;
    applyRemoteGameState(remoteStateValue, gameId);
    applyingRemoteState = false;
    subscribeRemoteGame(gameId);
  } catch (error) {
    console.warn("Remote game load failed", error);
    showMessage("Не удалось загрузить игру по ссылке. Проверьте Firestore и правила доступа.");
  }
}

function remoteGameState() {
  const snapshot = cloneState();
  const keys = [
    "convention",
    "poolTarget",
    "initialPoolTarget",
    "raspassLevel",
    "scoreCountingMode",
    "scoresCalculated",
    "poolClosingMode",
    "players",
    "pool",
    "mountain",
    "whists",
    "scoreLog",
    "lastScoreDelta",
    "lastChanged",
    "history",
    "customConventions",
    "gameId",
    "remoteUpdatedAt",
  ];
  return keys.reduce((result, key) => {
    result[key] = snapshot[key];
    return result;
  }, {});
}

function localUiState() {
  return {
    themeColor: state.themeColor,
    buttonTextColor: state.buttonTextColor,
    headerButtonColor: state.headerButtonColor,
    headerButtonTextColor: state.headerButtonTextColor,
    headerTextColor: state.headerTextColor,
    headerColor: state.headerColor,
    backgroundColor: state.backgroundColor,
    tableColor: state.tableColor,
    clothColor: state.clothColor,
    lineColor: state.lineColor,
    appearanceMode: state.appearanceMode,
  };
}

function applyRemoteGameState(remoteState, gameId) {
  const localUi = localUiState();
  const normalized = normalizeState(remoteState);
  Object.assign(state, normalized, localUi, { gameId });
  document.body.classList.add("game-started");
  restoreState(state);
}

function remoteStateFromSnapshot(data) {
  if (typeof data.stateJson === "string") {
    try {
      return JSON.parse(data.stateJson);
    } catch (error) {
      console.warn("Remote game state JSON parse failed", error);
      return null;
    }
  }
  return data.state || null;
}
function queueRemoteSave() {
  if (!remoteAvailable || !remoteDb || !state.gameId) return;
  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = window.setTimeout(saveRemoteGame, 150);
}

async function saveRemoteGame() {
  const ref = remoteGameRef();
  if (!ref) return;
  try {
    await ref.set({
      stateJson: JSON.stringify(firestoreSafeValue(remoteGameState())),
      stateFormat: "json-v1",
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      clientUpdatedAt: Number(state.remoteUpdatedAt) || Date.now(),
    }, { merge: true });
    subscribeRemoteGame(state.gameId);
  } catch (error) {
    console.warn("Remote game save failed", error);
    showMessage(remoteSaveErrorMessage(error));
  }
}

function firestoreSafeValue(value) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") return null;
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(firestoreSafeValue);
  if (typeof value === "object") {
    const output = {};
    Object.entries(value).forEach(([key, entry]) => {
      if (entry === undefined || typeof entry === "function" || typeof entry === "symbol") return;
      output[key] = firestoreSafeValue(entry);
    });
    return output;
  }
  return null;
}

function remoteSaveErrorMessage(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "");
  const suffix = code ? ` (${code})` : "";
  if (code.includes("permission-denied") || message.includes("Missing or insufficient permissions")) {
    return `Firestore запретил запись${suffix}. Проверьте и опубликуйте правила Firestore.`;
  }
  if (code.includes("unavailable") || code.includes("deadline-exceeded") || code.includes("network")) {
    return `Не удалось сохранить общую игру${suffix}: нет соединения с Firestore.`;
  }
  if (code.includes("invalid-argument") || message.includes("Unsupported field value")) {
    const detail = message ? ` ${message.slice(0, 140)}` : "";
    return `Не удалось сохранить общую игру${suffix}: Firestore отклонил данные партии.${detail}`;
  }
  return `Не удалось сохранить общую игру${suffix}. Проверьте Firestore, правила доступа и firebase-config.js.`;
}

function currentGameUrl() {
  if (state.gameId) setGameUrl(state.gameId);
  if (!state.gameId) return window.location.href;
  const base = window.location.protocol === "file:"
    ? "https://mathfewmatthews-dev.github.io/preferans-score/"
    : `${window.location.origin}${window.location.pathname}`;
  const url = new URL(base, window.location.href);
  url.search = "";
  url.hash = "";
  url.hash = state.gameId;
  return url.href;
}

function closeShareQrOnOutsideClick(event) {
  if (!el.shareQrPopover || el.shareQrPopover.hidden) return;
  const target = event.target;
  if (el.shareQrPopover.contains(target) || el.floatingShareButton?.contains(target)) return;
  hideShareQrPopover();
}

function hideShareQrPopover() {
  if (el.shareQrPopover) el.shareQrPopover.hidden = true;
}

function showShareQrPopover(url) {
  if (!el.shareQrPopover || !el.shareQrCode) return;
  el.shareQrCode.innerHTML = "";
  try {
    if (window.QrCreator?.render) {
      QrCreator.render({
        text: url,
        radius: 0,
        ecLevel: "M",
        fill: "#111827",
        background: "#ffffff",
        size: 280,
      }, el.shareQrCode);
      el.shareQrCode.querySelector("canvas, svg")?.classList.add("share-qr-svg");
    } else {
      el.shareQrCode.appendChild(createQrSvg(url));
    }
  } catch (error) {
    const note = document.createElement("p");
    note.className = "share-qr-error";
    note.textContent = error?.message === "QR input is too long" ? "QR не удалось построить: ссылка слишком длинная." : "QR не удалось построить.";
    el.shareQrCode.appendChild(note);
  }
  el.shareQrPopover.hidden = false;
}

function createQrSvg(value) {
  const matrix = createQrMatrix(value);
  const quiet = 4;
  const moduleSize = 10;
  const pixelSize = (matrix.length + quiet * 2) * moduleSize;
  let path = "";
  matrix.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (!dark) return;
      const px = (x + quiet) * moduleSize;
      const py = (y + quiet) * moduleSize;
      path += `M${px} ${py}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
    });
  });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${pixelSize} ${pixelSize}`);
  svg.setAttribute("width", "280");
  svg.setAttribute("height", "280");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "QR-код ссылки игры");
  svg.classList.add("share-qr-svg");
  svg.appendChild(node("rect", { x: 0, y: 0, width: pixelSize, height: pixelSize, class: "share-qr-bg" }));
  svg.appendChild(node("path", { d: path, class: "share-qr-modules" }));
  return svg;
}

function createQrMatrix(value) {
  const bytes = Array.from(new TextEncoder().encode(value));
  const version = bytes.length <= 78 ? 4 : 5;
  const size = 21 + (version - 1) * 4;
  const dataCodewords = version === 4 ? 80 : 108;
  const eccCodewords = version === 4 ? 20 : 26;
  const alignment = version === 4 ? 26 : 30;
  if (bytes.length > 106) throw new Error("QR input is too long");
  const bits = [];
  const pushBits = (number, length) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push(((number >>> i) & 1) === 1);
  };
  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  bytes.forEach((byte) => pushBits(byte, 8));
  const capacityBits = dataCodewords * 8;
  pushBits(0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8) bits.push(false);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | (bits[i + j] ? 1 : 0);
    data.push(byte);
  }
  for (let pad = 0; data.length < dataCodewords; pad += 1) data.push(pad % 2 === 0 ? 0xec : 0x11);
  const codewords = data.concat(qrReedSolomon(data, eccCodewords));
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));
  const set = (row, col, dark, reserve = true) => {
    if (row < 0 || col < 0 || row >= size || col >= size) return;
    matrix[row][col] = Boolean(dark);
    if (reserve) reserved[row][col] = true;
  };
  const drawFinder = (row, col) => {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const r = row + y;
        const c = col + x;
        const inFinder = x >= 0 && x <= 6 && y >= 0 && y <= 6;
        const dark = inFinder && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
        set(r, c, dark);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);
  for (let i = 8; i < size - 8; i += 1) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  drawAlignment(alignment, alignment, set);
  reserveFormatAreas(size, set);
  set(size - 8, 8, true);
  const dataBits = [];
  codewords.forEach((byte) => pushCodewordBits(byte, dataBits));
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vert = 0; vert < size; vert += 1) {
      const row = upward ? size - 1 - vert : vert;
      for (let offset = 0; offset < 2; offset += 1) {
        const col = right - offset;
        if (reserved[row][col]) continue;
        let dark = bitIndex < dataBits.length ? dataBits[bitIndex] : false;
        bitIndex += 1;
        if ((row + col) % 2 === 0) dark = !dark;
        set(row, col, dark, false);
      }
    }
    upward = !upward;
  }
  drawFormatBits(size, 1, 0, set);
  return matrix;
}

function drawAlignment(row, col, set) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      set(row + y, col + x, Math.max(Math.abs(x), Math.abs(y)) !== 1);
    }
  }
}

function reserveFormatAreas(size, set) {
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      set(8, i, false);
      set(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    set(size - 1 - i, 8, false);
    set(8, size - 1 - i, false);
  }
}

function drawFormatBits(size, errorLevelBits, mask, set) {
  const bits = qrFormatBits((errorLevelBits << 3) | mask);
  const bit = (i) => ((bits >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i += 1) set(8, i, bit(i));
  set(8, 7, bit(6));
  set(8, 8, bit(7));
  set(7, 8, bit(8));
  for (let i = 9; i < 15; i += 1) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, bit(i));
  set(size - 8, 8, true);
}

function qrFormatBits(data) {
  let remainder = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if (((remainder >>> i) & 1) !== 0) remainder ^= 0x537 << (i - 10);
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

function pushCodewordBits(byte, output) {
  for (let i = 7; i >= 0; i -= 1) output.push(((byte >>> i) & 1) !== 0);
}

function qrReedSolomon(data, degree) {
  let generator = [1];
  for (let i = 0; i < degree; i += 1) generator = qrPolyMultiply(generator, [1, qrGfPow(2, i)]);
  const result = Array(degree).fill(0);
  data.forEach((byte) => {
    const factor = byte ^ result.shift();
    result.push(0);
    for (let i = 0; i < degree; i += 1) result[i] ^= qrGfMultiply(generator[i + 1], factor);
  });
  return result;
}

function qrPolyMultiply(left, right) {
  const result = Array(left.length + right.length - 1).fill(0);
  left.forEach((a, i) => {
    right.forEach((b, j) => {
      result[i + j] ^= qrGfMultiply(a, b);
    });
  });
  return result;
}

function qrGfPow(value, power) {
  let result = 1;
  for (let i = 0; i < power; i += 1) result = qrGfMultiply(result, value);
  return result;
}

function qrGfMultiply(a, b) {
  let result = 0;
  for (let i = 0; i < 8; i += 1) {
    if ((b & 1) !== 0) result ^= a;
    const carry = (a & 0x80) !== 0;
    a = (a << 1) & 0xff;
    if (carry) a ^= 0x1d;
    b >>>= 1;
  }
  return result;
}
async function shareCurrentGame(event) {
  event?.stopPropagation();
  if (!gameStarted()) return;
  const url = currentGameUrl();
  const title = "Пуля: " + state.convention;
  showShareQrPopover(url);
  if (navigator.share && window.matchMedia?.("(max-width: 720px)")?.matches) {
    try {
      await navigator.share({ title, text: title, url });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  await copyText(url);
  showMessage("Ссылка скопирована в буфер");
  window.setTimeout(() => {
    if (el.message.textContent === "Ссылка скопирована в буфер") showMessage("");
  }, 5000);
}

async function copyReport() {
  const totals = calculateTotals();
  const lines = [
    `Пуля преферанса: ${state.convention}`,
    `Размер пули: ${format(state.poolTarget)}`,
    `Закрытие: ${state.poolClosingMode === "total" ? "общая пуля" : "каждый игрок"}`,
    "",
    "Игрок\tПуля\tГора\tИтог",
    ...totals.map((total) => `${total.name}\t${format(total.pool)}\t${format(total.mountain)}\t${format(total.net)}`),
    "",
    "Журнал:",
    ...state.history.map(historyItemPlainText),
  ];
  await copyText(lines.join("\n"));
  showMessage("Отчёт скопирован.");
  setTimeout(() => showMessage(""), 1800);
}

function historyItemPlainText(item) {
  const marker = "\n[[history-details]]\n";
  const textValue = String(item || "");
  if (!textValue.includes(marker)) return textValue;
  const [summary, details] = textValue.split(marker);
  const container = document.createElement("div");
  container.innerHTML = details || "";
  const detailLines = [...container.querySelectorAll(".history-details > div")]
    .map((node) => normalizePlainText(node.textContent))
    .filter(Boolean);
  const fallback = detailLines.length ? "" : normalizePlainText(container.textContent);
  return [
    summary,
    ...(detailLines.length ? detailLines : fallback ? [fallback] : []).map((line) => `  ${line}`),
  ].join("\n");
}

function normalizePlainText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch (error) {
      // Fall back for browser contexts that expose Clipboard API but deny write permission.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function normalizeState(source) {
  const players = Array.isArray(source.players) ? source.players : source.Players || state.players;
  const pool = Array.isArray(source.pool) ? source.pool : source.Pool || players.map(() => 0);
  const mountain = Array.isArray(source.mountain) ? source.mountain : source.Mountain || players.map(() => 0);
  const whists = Array.isArray(source.whists) ? source.whists : source.Whists || players.map(() => players.map(() => 0));
  const scoreCountingMode = source.scoreCountingMode === "manual" || source.ScoreCountingMode === "manual" ? "manual" : "live";
  const normalized = {
    convention: source.convention || source.Convention || "Сочи",
    poolTarget: Number(source.poolTarget || source.PoolTarget || 20),
    initialPoolTarget: Number(source.initialPoolTarget || source.InitialPoolTarget || source.poolTarget || source.PoolTarget || 20),
    raspassLevel: Number(source.raspassLevel || source.RaspassLevel || 0),
    themeColor: source.themeColor || source.ThemeColor || "#28733b",
    buttonTextColor: source.buttonTextColor || source.ButtonTextColor || "#ffffff",
    headerButtonColor: source.headerButtonColor || source.HeaderButtonColor || (source.appearanceMode === "dark" || source.AppearanceMode === "dark" ? "#1f2937" : "#ffffff"),
    headerButtonTextColor: source.headerButtonTextColor || source.HeaderButtonTextColor || (source.appearanceMode === "dark" || source.AppearanceMode === "dark" ? "#ffffff" : "#18202a"),
    headerTextColor: source.headerTextColor || source.HeaderTextColor || "#ffffff",
    headerColor: source.headerColor || source.HeaderColor || source.themeColor || source.ThemeColor || "#28733b",
    backgroundColor: source.backgroundColor || source.BackgroundColor || "#eef2f7",
    tableColor: source.tableColor || source.TableColor || (source.appearanceMode === "dark" || source.AppearanceMode === "dark" ? "#2b313a" : "#ffffff"),
    clothColor: source.clothColor || source.ClothColor || (source.appearanceMode === "dark" || source.AppearanceMode === "dark" ? "#20252c" : "#ffffff"),
    lineColor: source.lineColor || source.LineColor || defaultLineColor(source.appearanceMode === "dark" || source.AppearanceMode === "dark" ? "dark" : "light"),
    appearanceMode: source.appearanceMode === "dark" || source.AppearanceMode === "dark" ? "dark" : "light",
    scoreCountingMode,
    poolClosingMode: source.poolClosingMode === "total" || source.PoolClosingMode === "total" ? "total" : "each",
    scoresCalculated: typeof source.scoresCalculated === "boolean"
      ? source.scoresCalculated
      : typeof source.ScoresCalculated === "boolean"
        ? source.ScoresCalculated
        : scoreCountingMode === "live",
    players,
    pool,
    mountain,
    whists: players.map((_, i) => players.map((__, j) => Number((whists[i] || [])[j] || 0))),
    scoreLog: source.scoreLog || source.ScoreLog || null,
    lastScoreDelta: Array.isArray(source.lastScoreDelta)
      ? players.map((_, index) => Number(source.lastScoreDelta[index] || 0))
      : players.map(() => 0),
    lastChanged: normalizeLastChanged(source.lastChanged || source.LastChanged, players),
    history: Array.isArray(source.history) ? source.history : source.History || [],
    customConventions: Array.isArray(source.customConventions) ? source.customConventions.map(normalizeConventionConfig) : [],
    gameId: normalizeGameId(source.gameId || source.GameId),
    remoteUpdatedAt: Number(source.remoteUpdatedAt || source.RemoteUpdatedAt || 0) || null,
  };
  if (!normalized.scoreLog) {
    const previous = { ...state };
    Object.assign(state, normalized);
    normalized.scoreLog = createScoreLog();
    Object.assign(state, previous);
  }
  return normalized;
}

function cloneState() {
  return JSON.parse(JSON.stringify(state));
}

function restoreState(snapshot) {
  Object.assign(state, normalizeState(snapshot));
  ensureScoreLog();
  renderConventionOptions();
  el.convention.value = state.convention;
  el.poolTarget.value = state.poolTarget;
  el.themeColor.value = state.themeColor;
  el.buttonTextColor.value = state.buttonTextColor;
  el.headerButtonColor.value = state.headerButtonColor;
  el.headerButtonTextColor.value = state.headerButtonTextColor;
  el.headerTextColor.value = state.headerTextColor;
  el.headerColor.value = state.headerColor;
  el.backgroundColor.value = state.backgroundColor;
  el.tableColor.value = state.tableColor;
  el.clothColor.value = state.clothColor;
  el.lineColor.value = state.lineColor;
  el.scoreCountingMode.value = state.scoreCountingMode;
  el.poolClosingMode.value = state.poolClosingMode;
  el.playerCount.value = state.players.length;
  hydrateSelectors();
  renderSetupPlayers();
  renderRoundRows();
  refresh();
}

function undoRecord() {
  if (undoStack.length === 0) return;
  redoStack.push(cloneState());
  restoreState(undoStack.pop());
  markScoresStale();
  refresh();
  saveAutosavedGame();
}

function redoRecord() {
  if (redoStack.length === 0) return;
  undoStack.push(cloneState());
  restoreState(redoStack.pop());
  markScoresStale();
  refresh();
  saveAutosavedGame();
}

function updateHistoryButtons() {
  el.undoButton.disabled = undoStack.length === 0;
  el.redoButton.disabled = redoStack.length === 0;
}

function getTricks() {
  return state.players.map((_, index) => clampNumber(document.querySelector(`[data-tricks="${index}"]`).value, 0, 10, 0));
}

function getRoles() {
  return state.players.map((_, index) => document.querySelector(`[data-role="${index}"]`).value);
}

function setTrickValue(index, value, touched) {
  const input = document.querySelector(`[data-tricks="${index}"]`);
  const picker = document.querySelector(`[data-picker="${index}"]`);
  if (!input || !picker) return;
  input.value = String(value);
  if (touched) input.dataset.touched = "true";
  picker.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.value) === value);
  });
  autoFillRemainingTricks(index);
  updateTrickValidation();
}

function activeTrickIndices() {
  if (el.gameType.value === "Ручной ввод") return [];
  const roles = getRoles();
  if (isPassOnlyContract(roles)) return [Number(el.declarer.value || 0)];
  return state.players
    .map((_, index) => index)
    .filter((index) => roles[index] !== "Отдыхает");
}

function autoFillRemainingTricks(changedIndex) {
  if (el.gameType.value === "Ручной ввод") return;
  const active = activeTrickIndices();
  const untouched = active.filter((index) => {
    const input = document.querySelector(`[data-tricks="${index}"]`);
    return input && input.dataset.touched !== "true";
  });
  if (untouched.length !== 1) return;

  const target = untouched[0];
  if (target === changedIndex) return;
  const knownSum = sum(active.filter((index) => index !== target).map((index) => Number(document.querySelector(`[data-tricks="${index}"]`).value || 0)));
  const remaining = 10 - knownSum;
  if (remaining < 0 || remaining > 10) return;
  setTrickValueSilently(target, remaining);
}

function setTrickValueSilently(index, value) {
  const input = document.querySelector(`[data-tricks="${index}"]`);
  const picker = document.querySelector(`[data-picker="${index}"]`);
  if (!input || !picker) return;
  input.value = String(value);
  picker.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.value) === value);
  });
}

function updateTrickValidation() {
  if (!el.recordModal.classList.contains("open") || el.gameType.value === "Ручной ввод" || wizardStep !== trickWizardStep()) {
    showMessage("");
    return;
  }
  try {
    validateTrickSum(false);
    showMessage("");
  } catch (error) {
    showMessage(error.message);
  }
}

function validateTrickSum(strict) {
  if (el.gameType.value === "Ручной ввод") return true;
  if (isPassOnlyContract()) return true;
  const active = activeTrickIndices();
  const total = sum(active.map((index) => Number(document.querySelector(`[data-tricks="${index}"]`).value || 0)));
  if (total === 10) return true;

  const missingPlayers = active
    .filter((index) => Number(document.querySelector(`[data-tricks="${index}"]`).value || 0) === 0)
    .map((index) => state.players[index]);
  const hint = missingPlayers.length ? ` Проверьте: ${missingPlayers.join(", ")}.` : "";
  if (total < 10) throw new Error(`Не хватает ${format(10 - total)} взяток до 10.${hint}`);
  throw new Error(`Лишние ${format(total - 10)} взяток: сумма должна быть равна 10.`);
}

function gameValue(contract) {
  return FIXED_GAME_VALUES[Number(contract)] || 0;
}

function gamePenalty(contract) {
  return gameValue(contract) * currentConvention().gamePenaltyMultiplier;
}

function whistPerTrick(contract) {
  return gameValue(contract) * currentConvention().whistTrickMultiplier;
}

function whistPenalty(contract) {
  const convention = currentConvention();
  const responsibility = convention.whistResponsibility || "half";
  const base = gamePenalty(contract);
  return responsibility === "full" ? base : base / 2;
}

function pushHistory(textValue) {
  const time = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  state.history.push(`${time} | ${textValue}`);
}

function appendLastHistoryDetails(before, after, scoreDeltas = []) {
  if (!state.history.length) return;
  const details = playerHistoryDetails(before, after, lastRecordOutcome, scoreDeltas);
  if (!details.length) return;
  state.history[state.history.length - 1] += `\n[[history-details]]\n<div class="history-details">${details.join("")}</div>`;
}

function playerHistoryDetails(before, after, outcome, scoreDeltas = []) {
  const details = [];
  after.players.forEach((player, index) => {
    const parts = [];
    const role = outcome?.roles?.[index];
    const tricks = outcome?.tricks?.[index];
    const skipPassOnlyTricks = outcomePassOnlyContract(outcome) && role === "Пас";
    const poolDelta = Number(after.pool[index] || 0) - Number(before.pool[index] || 0);
    const mountainDelta = Number(after.mountain[index] || 0) - Number(before.mountain[index] || 0);
    const whistParts = [];

    if (role && !(after.players.length === 3 && role === "Отдыхает")) {
      parts.push(escapeHtml(roleLabel(role).toLowerCase()));
    }
    if (Array.isArray(outcome?.tricks) && role !== "Отдыхает" && !skipPassOnlyTricks) {
      parts.push(`взятки ${format(tricks)}`);
    } else if (Array.isArray(outcome?.tricks) && Number(tricks || 0) > 0) {
      parts.push(`взятки в прикупе ${format(tricks)}`);
    }
    if (poolDelta) parts.push(`Пуля ${signed(poolDelta)}`);
    if (mountainDelta) parts.push(`Гора ${signed(mountainDelta)}`);

    after.players.forEach((target, targetIndex) => {
      const whistDelta = Number(after.whists?.[index]?.[targetIndex] || 0) - Number(before.whists?.[index]?.[targetIndex] || 0);
      if (whistDelta) whistParts.push(`${signed(whistDelta)} на ${escapeHtml(target)}`);
    });
    if (whistParts.length) parts.push(`Висты ${whistParts.join(", ")}`);
    const scoreDelta = Number(scoreDeltas[index] || 0);
    if (scoreDelta) parts.push(`Итог ${signed(scoreDelta)}`);

    if (parts.length) {
      details.push(`<div><strong>${escapeHtml(player)}</strong>: ${parts.join("; ")}.</div>`);
    }
  });
  return details;
}

function outcomePassOnlyContract(outcome) {
  if (!outcome || outcome.type !== "contract" || !Array.isArray(outcome.roles)) return false;
  const declarer = Number(outcome.declarer ?? -1);
  const defenders = outcome.roles
    .map((role, index) => index === declarer || role === "Отдыхает" ? "" : role)
    .filter(Boolean);
  return defenders.length > 0 && defenders.every((role) => role === "Пас");
}

function buildLastChanged(before, after) {
  const pool = after.players.map((_, index) => Number(after.pool[index] || 0) !== Number(before.pool[index] || 0));
  const mountain = after.players.map((_, index) => Number(after.mountain[index] || 0) !== Number(before.mountain[index] || 0));
  const whists = after.players.map((_, i) => after.players.map((__, j) => (
    Number(after.whists?.[i]?.[j] || 0) !== Number(before.whists?.[i]?.[j] || 0)
  )));
  return { pool, mountain, whists };
}

function normalizeLastChanged(value, players) {
  if (!value) return null;
  return {
    pool: players.map((_, index) => Boolean(value.pool?.[index])),
    mountain: players.map((_, index) => Boolean(value.mountain?.[index])),
    whists: players.map((_, i) => players.map((__, j) => Boolean(value.whists?.[i]?.[j]))),
  };
}

function tricksText(tricks) {
  return state.players.map((player, index) => `${player}=${tricks[index]}`).join(", ");
}

function showMessage(message) {
  el.message.textContent = message;
}

function launchCelebration() {
  launchSuitFirework(100, true);
}

function launchSuitFirework(count, mixed = false) {
  const emojis = mixed ? ["🥳", "🎈", "🎊", "🎉", "✨", "♠️", "♥️", "♦️", "♣️", "🎴"] : ["♠️", "♥️", "♦️", "♣️"];
  const rect = el.poolSheet.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  for (let i = 0; i < Math.max(1, Math.round(count)); i += 1) {
    const item = document.createElement("span");
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 440;
    item.className = "confetti-emoji";
    item.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    item.style.left = `${originX}px`;
    item.style.top = `${originY}px`;
    item.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    item.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    item.style.setProperty("--rot", `${Math.round(Math.random() * 720 - 360)}deg`);
    item.style.animationDelay = `${Math.random() * 120}ms`;
    document.body.appendChild(item);
    window.setTimeout(() => item.remove(), 1600);
  }
}

function average(values) {
  return values.length ? sum(values) / values.length : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function format(value) {
  return Number(value || 0).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

function signed(value) {
  return value >= 0 ? `+${format(value)}` : format(value);
}

function formatSigned(value) {
  return value >= 0 ? `+${format(value)}` : format(value);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));
}

function node(tag, attrs) {
  const item = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => item.setAttribute(key, value));
  return item;
}

function text(x, y, value, className, anchor = "start") {
  const item = node("text", { x, y, class: className, "text-anchor": anchor });
  item.textContent = value;
  return item;
}

function textCentered(x, y, value, className) {
  const item = node("text", {
    x,
    y,
    class: className,
    "text-anchor": "middle",
    "dominant-baseline": "central",
    "alignment-baseline": "central",
  });
  item.textContent = value;
  return item;
}

function applySheetTextBackdrops(svg) {
  svg.querySelectorAll(".sheet-text-backdrop").forEach((item) => item.remove());
  svg.querySelectorAll(".score-combo:not(.classic-score-combo)").forEach((scoreGroup) => {
    insertSheetBackdrop(scoreGroup, scoreGroup, { paddingX: 8, paddingY: 6, minWidth: 0, minHeight: 0, radius: 7 });
  });
  svg.querySelectorAll("text").forEach((textNode) => {
    if (textNode.closest(".score-combo")) return;
    if (textNode.closest(".classic-label-combo")) return;
    if (textNode.closest(".whist-vector-cell")) return;
    if (textNode.classList.contains("center-label") || textNode.classList.contains("center-value")) return;
    const className = textNode.getAttribute("class") || "";
    if (/whist-cell-value/.test(className)) return;
    const isWhistValue = /(?:whist-track|missing-whist|five-whist-value)/.test(className);
    const isPoolTrack = /pool-track/.test(className);
    const shortValue = textNode.textContent.trim().length <= 2 && isWhistValue;
    insertSheetBackdrop(textNode, textNode.parentNode, {
      paddingX: shortValue ? 8 : isPoolTrack ? 3 : 6,
      paddingY: shortValue ? 8 : isPoolTrack ? 3 : 5,
      minWidth: shortValue ? 46 : 0,
      minHeight: shortValue ? 58 : 0,
      radius: 6,
      copyTransform: true,
    });
  });
}

function insertSheetBackdrop(target, parent, options = {}) {
  let box;
  try {
    box = target.getBBox();
  } catch (error) {
    return;
  }
  if (!parent || !Number.isFinite(box.width) || !Number.isFinite(box.height) || box.width <= 0 || box.height <= 0) return;
  if (target.nodeName.toLowerCase() === "text") target.classList.add("sheet-backed-text");
  const paddingX = options.paddingX ?? 6;
  const paddingY = options.paddingY ?? 5;
  const width = Math.max(box.width + paddingX * 2, options.minWidth || 0);
  const height = Math.max(box.height + paddingY * 2, options.minHeight || 0);
  const rect = node("rect", {
    x: box.x + box.width / 2 - width / 2,
    y: box.y + box.height / 2 - height / 2,
    width,
    height,
    rx: options.radius ?? 6,
    ry: options.radius ?? 6,
    class: "sheet-text-backdrop",
  });
  const transform = options.copyTransform ? target.getAttribute("transform") : "";
  if (transform) rect.setAttribute("transform", transform);
  if (parent === target) parent.insertBefore(rect, parent.firstChild);
  else parent.insertBefore(rect, target);
}

function keepInside(pos, marginX, marginY) {
  return {
    x: Math.min(930 - marginX, Math.max(70 + marginX, pos.x)),
    y: Math.min(650 - marginY, Math.max(70 + marginY, pos.y)),
  };
}

initialize();
