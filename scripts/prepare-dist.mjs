import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const files = [
  "sw.js", "firebase-config.js", "qr-creator.js", "logo.svg", "social-preview.png",
  "game-preview.png", "Pwa.svg", "manifest.webmanifest", "CNAME", "404.html",
];

for (const file of files) await copyIfPresent(path.join(root, file), path.join(dist, file));
for (const directory of ["icons", "fonts"]) await copyIfPresent(path.join(root, directory), path.join(dist, directory));

const indexPath = path.join(dist, "index.html");
let index = await fs.readFile(indexPath, "utf8");
index = index.replace(/(?:\.\/|\/)?assets\/manifest-[^"']+\.webmanifest/g, "/manifest.webmanifest");
await fs.writeFile(indexPath, index);

const builtAssets = (await fs.readdir(path.join(dist, "assets"))).map((name) => `assets/${name}`);
const swPath = path.join(dist, "sw.js");
let sw = await fs.readFile(swPath, "utf8");
sw = sw.replace("const BUILD_ASSETS = [];", `const BUILD_ASSETS = ${JSON.stringify(builtAssets)};`);
sw = sw.replace(/\s+"styles\.css",\r?\n\s+"app\.js",/, "");
await fs.writeFile(swPath, sw);

async function copyIfPresent(source, target) {
  try {
    const stat = await fs.stat(source);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (stat.isDirectory()) await fs.cp(source, target, { recursive: true });
    else await fs.copyFile(source, target);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
