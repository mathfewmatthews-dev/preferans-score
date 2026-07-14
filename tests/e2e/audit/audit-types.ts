export type AuditCategory =
  | "calculations"
  | "progressions"
  | "record-wizard"
  | "possible-games"
  | "history"
  | "persistence"
  | "appearance"
  | "sync";

export interface ConventionOracle {
  name: string;
  gamePenaltyMultiplier: number;
  whistTrickMultiplier: number;
  declarerRemizWhistMode: "gentleman" | "greedy";
  whistResponsibility: "half" | "full";
  gameWinWriteMode: "pool" | "mountain-first";
  raspassScoringMode: "mountain" | "rostov-whist";
  raspassProgression: string;
  raspassZeroTricksPool: boolean;
}

export interface ActualSnapshot {
  convention: string;
  players: string[];
  pool: number[];
  mountain: number[];
  whists: number[][];
  history: string[];
  raspassLevel: number;
  scoresCalculated?: boolean;
  customConventions: Array<Record<string, unknown>>;
}

export interface ContractRecord {
  contract: number;
  declarer: number;
  roles: string[];
  tricks: number[];
}
