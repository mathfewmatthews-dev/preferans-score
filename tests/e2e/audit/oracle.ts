import type { ConventionOracle, ContractRecord } from "./audit-types";

const values: Record<number, number> = { 6: 2, 7: 4, 8: 6, 9: 8, 10: 10 };

export const conventions: Record<string, ConventionOracle> = {
  "Сочи": { name: "Сочи", gamePenaltyMultiplier: 1, whistTrickMultiplier: 1, declarerRemizWhistMode: "gentleman", whistResponsibility: "half", gameWinWriteMode: "pool", raspassScoringMode: "mountain", raspassProgression: "6", raspassZeroTricksPool: false },
  "Питер": { name: "Питер", gamePenaltyMultiplier: 1, whistTrickMultiplier: 2, declarerRemizWhistMode: "greedy", whistResponsibility: "half", gameWinWriteMode: "pool", raspassScoringMode: "mountain", raspassProgression: "6-7-8", raspassZeroTricksPool: true },
  "Ростов": { name: "Ростов", gamePenaltyMultiplier: 1, whistTrickMultiplier: 1, declarerRemizWhistMode: "gentleman", whistResponsibility: "half", gameWinWriteMode: "mountain-first", raspassScoringMode: "rostov-whist", raspassProgression: "6", raspassZeroTricksPool: false }
};

export function gameValue(contract: number) { return values[contract] || 0; }

export function contractDelta(playerCount: number, convention: ConventionOracle, record: ContractRecord) {
  const pool = Array(playerCount).fill(0);
  const mountain = Array(playerCount).fill(0);
  const whists = Array.from({ length: playerCount }, () => Array(playerCount).fill(0));
  const value = gameValue(record.contract);
  const declarerTricks = record.tricks[record.declarer];
  const defenders = record.roles.map((role, index) => index !== record.declarer && role !== "Отдыхает" ? index : -1).filter(index => index >= 0);
  const whisters = defenders.filter(index => record.roles[index] === "Вист");
  if (declarerTricks >= record.contract) {
    pool[record.declarer] += value;
    defenders.forEach(index => {
      if (record.roles[index] === "Вист") whists[index][record.declarer] += record.tricks[index] * value * convention.whistTrickMultiplier;
      if (record.roles[index] === "Полвиста") whists[index][record.declarer] += ((10 - record.contract) * value * convention.whistTrickMultiplier) / 2;
    });
  } else {
    const under = record.contract - declarerTricks;
    mountain[record.declarer] += value * convention.gamePenaltyMultiplier * under;
    const awards = Array(playerCount).fill(0);
    defenders.forEach(index => {
      awards[index] += under * value * convention.whistTrickMultiplier;
      if (record.roles[index] === "Вист") awards[index] += record.tricks[index] * value * convention.whistTrickMultiplier;
    });
    const passers = defenders.filter(index => record.roles[index] === "Пас");
    if (convention.declarerRemizWhistMode === "gentleman" && whisters.length === 1 && passers.length === 1) {
      const shared = (awards[whisters[0]] + awards[passers[0]]) / 2;
      awards[whisters[0]] = shared;
      awards[passers[0]] = shared;
    }
    awards.forEach((amount, index) => { whists[index][record.declarer] += amount; });
  }
  return { pool, mountain, whists };
}

export function progressionValue(pattern: string, index: number) {
  const patterns: Record<string, { values: number[]; repeatFrom: number }> = {
    "6": { values: [6], repeatFrom: 0 }, "7": { values: [7], repeatFrom: 0 },
    "6-7": { values: [6, 7], repeatFrom: 1 }, "6-7-8": { values: [6, 7, 8], repeatFrom: 2 },
    "cycle-6-7-8": { values: [6, 7, 8], repeatFrom: 0 }, "6-7-7-8": { values: [6, 7, 7, 8], repeatFrom: 3 },
    "6-7-8-9": { values: [6, 7, 8, 9], repeatFrom: 3 }
  };
  const item = patterns[pattern] || patterns["6"];
  if (index < item.values.length) return item.values[index];
  return item.values[item.repeatFrom + ((index - item.repeatFrom) % (item.values.length - item.repeatFrom))];
}
