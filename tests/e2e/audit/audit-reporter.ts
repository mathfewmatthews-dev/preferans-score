import fs from "node:fs";
import path from "node:path";
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

interface Entry { title: string; category: string; status: string; duration: number; error?: string; artifacts: string[] }

export default class AuditReporter implements Reporter {
  private entries: Entry[] = [];
  private outputDir: string;
  constructor(options: { outputDir?: string } = {}) { this.outputDir = options.outputDir || "audit-results"; }
  onTestEnd(test: TestCase, result: TestResult) {
    const category = test.annotations.find(item => item.type === "auditCategory")?.description || "uncategorized";
    this.entries.push({
      title: test.titlePath().slice(1).join(" > "), category, status: result.status,
      duration: result.duration, error: result.error?.message,
      artifacts: result.attachments.map(item => item.path).filter((item): item is string => Boolean(item))
    });
  }
  onEnd(result: FullResult) {
    fs.mkdirSync(this.outputDir, { recursive: true });
    const report = { generatedAt: new Date().toISOString(), status: result.status, tests: this.entries };
    fs.writeFileSync(path.join(this.outputDir, "audit-report.json"), JSON.stringify(report, null, 2));
    const groups = new Map<string, Entry[]>();
    this.entries.forEach(entry => groups.set(entry.category, [...(groups.get(entry.category) || []), entry]));
    const lines = ["# Preferans Score audit", "", `Status: **${result.status}**`, `Generated: ${report.generatedAt}`, ""];
    const orderedCategories = ["calculations", "progressions", "record-wizard", "possible-games", "history", "persistence", "appearance", "sync", "uncategorized"];
    for (const category of orderedCategories) {
      const entries = groups.get(category) || [];
      if (!entries.length) continue;
      lines.push(`## ${category}`, "");
      for (const entry of entries) {
        const label = entry.status === "passed" ? "PASS" : entry.status === "skipped" ? "SKIP" : "FAIL";
        lines.push(`- ${label}: ${entry.title} (${entry.duration} ms)`);
        if (entry.error) lines.push(`  - ${entry.error.replace(/\x1b\[[0-9;]*m/g, "").split("\n")[0]}`);
        if (entry.artifacts.length) lines.push(`  - Artifacts: ${entry.artifacts.join(", ")}`);
      }
      lines.push("");
    }
    fs.writeFileSync(path.join(this.outputDir, "audit-report.md"), lines.join("\n"));
  }
}
