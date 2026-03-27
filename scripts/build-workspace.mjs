#!/usr/bin/env node
import { readdirSync, readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";

const root = process.cwd();
const bases = ["packages", "apps"];
let found = false;

for (const base of bases) {
  const basePath = join(root, base);
  let entries = [];
  try {
    entries = readdirSync(basePath, { withFileTypes: true });
  } catch (e) {
    continue;
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const pkgPath = join(basePath, e.name, "package.json");
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (pkg.scripts && pkg.scripts.build) {
      found = true;
      console.log(`\n==> Building ${pkg.name} (${join(base, e.name)})`);
      const res = spawnSync("pnpm", ["--filter", pkg.name, "run", "build"], {
        stdio: "inherit",
      });
      if (res.status !== 0) process.exit(res.status || 1);
    }
  }
}

if (!found) {
  console.log('No workspace packages with a "build" script were found.');
  process.exit(0);
}
