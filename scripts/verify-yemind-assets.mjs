#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.argv[2] ?? ".");
const dataRoot = path.join(projectRoot, "src", "data");
const assetRoot = path.join(projectRoot, "assets");

const catalogs = [
  "marker-catalog.json",
  "clipart-catalog.json",
  "layout-catalog.local.json",
];

const missing = [];

for (const file of catalogs) {
  const catalogPath = path.join(dataRoot, file);
  if (!fs.existsSync(catalogPath)) {
    missing.push(path.relative(projectRoot, catalogPath));
    continue;
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

  if (file === "marker-catalog.json") {
    const sprite = path.join(assetRoot, catalog.image);
    if (!fs.existsSync(sprite)) {
      missing.push(path.relative(projectRoot, sprite));
    }
    continue;
  }

  for (const item of catalog.items ?? []) {
    const absolute = path.join(assetRoot, item.relativePath);
    if (!fs.existsSync(absolute)) {
      missing.push(path.relative(projectRoot, absolute));
    }
  }
}

for (const icon of [
  "yemind-icon-32.png",
  "yemind-icon-64.png",
  "yemind-icon-128.png",
]) {
  if (!fs.existsSync(path.join(projectRoot, icon))) {
    missing.push(icon);
  }
}

if (missing.length) {
  console.error("YeMind asset verification failed:");
  for (const item of [...new Set(missing)]) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log("YeMind fixed local assets are complete.");
