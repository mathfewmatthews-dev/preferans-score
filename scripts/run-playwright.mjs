import { spawn } from "node:child_process";
import process from "node:process";

const cliArgs = process.argv.slice(2);
const firebase = cliArgs.includes("--firebase");
const testArgs = cliArgs.filter(arg => arg !== "--firebase");
const viteCli = new URL("../node_modules/vite/bin/vite.js", import.meta.url);
const playwrightCli = new URL("../node_modules/@playwright/test/cli.js", import.meta.url);

const server = spawn(process.execPath, [viteCli.pathname.slice(1), "--host", "127.0.0.1", "--port", "5173"], {
  cwd: process.cwd(), stdio: "inherit", windowsHide: true
});

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:5173/");
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Vite did not become ready on http://127.0.0.1:5173");
}

function stopServer() {
  if (!server.killed) server.kill("SIGTERM");
}

let exitCode = 1;
try {
  await waitForServer();
  exitCode = await new Promise((resolve, reject) => {
    const tests = spawn(process.execPath, [playwrightCli.pathname.slice(1), "test", ...testArgs], {
      cwd: process.cwd(), stdio: "inherit", windowsHide: true,
      env: { ...process.env, PLAYWRIGHT_EXTERNAL_SERVER: "1", ...(firebase ? { PREFERANS_FIREBASE_E2E: "1" } : {}) }
    });
    tests.on("error", reject);
    tests.on("exit", code => resolve(code ?? 1));
  });
} finally {
  stopServer();
  await Promise.race([
    new Promise(resolve => server.once("exit", resolve)),
    new Promise(resolve => setTimeout(resolve, 3_000))
  ]);
}
process.exit(exitCode);
