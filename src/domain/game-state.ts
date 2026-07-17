export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface GameState extends Record<string, unknown> {
  convention: string;
  poolTarget: number;
  players: string[];
  pool: number[];
  mountain: number[];
  whists: number[][];
  history: string[];
  scoreLog: unknown;
  gameId: string | null;
}

export interface StateValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function validateGameState(value: unknown): StateValidationIssue[] {
  const issues: StateValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [{ path: "$", message: "Состояние должно быть объектом.", severity: "error" }];
  }
  const state = value as Partial<GameState>;
  const count = Array.isArray(state.players) ? state.players.length : 0;
  if (count < 3 || count > 5) issues.push({ path: "players", message: "Допустимо от 3 до 5 игроков.", severity: "error" });
  if (!finite(state.poolTarget) || state.poolTarget <= 0) issues.push({ path: "poolTarget", message: "Размер пули должен быть положительным числом.", severity: "error" });
  for (const key of ["pool", "mountain"] as const) {
    const values = state[key];
    if (!Array.isArray(values) || values.length !== count) {
      issues.push({ path: key, message: `Массив ${key} не соответствует составу игроков.`, severity: "error" });
    } else if (values.some((item) => !finite(item))) {
      issues.push({ path: key, message: `Массив ${key} содержит неконечное число.`, severity: "error" });
    }
  }
  if (!Array.isArray(state.whists) || state.whists.length !== count || state.whists.some((row) => !Array.isArray(row) || row.length !== count)) {
    issues.push({ path: "whists", message: "Матрица вистов должна быть квадратной.", severity: "error" });
  } else {
    state.whists.forEach((row, rowIndex) => row.forEach((item, columnIndex) => {
      if (!finite(item)) issues.push({ path: `whists.${rowIndex}.${columnIndex}`, message: "Висты должны быть конечным числом.", severity: "error" });
      if (rowIndex === columnIndex && item !== 0) issues.push({ path: `whists.${rowIndex}.${columnIndex}`, message: "Игрок не может писать висты на себя.", severity: "error" });
    }));
  }
  if (!Array.isArray(state.history) || state.history.some((item) => typeof item !== "string")) {
    issues.push({ path: "history", message: "Журнал должен быть массивом строк.", severity: "error" });
  }
  if (typeof state.convention !== "string" || !state.convention.trim()) issues.push({ path: "convention", message: "Не указана конвенция.", severity: "error" });
  return issues;
}

export function assertValidGameState(value: unknown): asserts value is GameState {
  const errors = validateGameState(value).filter((issue) => issue.severity === "error");
  if (errors.length) throw new Error(errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
}

export function cloneGameState<T>(value: T): T {
  return structuredClone(value);
}
