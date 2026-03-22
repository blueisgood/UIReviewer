#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const part = argv[index];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1] : "true";
    args[key] = value;
    if (value !== "true") index += 1;
  }
  return args;
}

function usage() {
  console.log(`
Usage:
  node scripts/import-from-pencil.js --title "Chip Rotation" --slug "chip-rotation-client-a-v1" --app-url "https://your-project.vercel.app/index.html"

Optional:
  --dir prototype-assets
  --config prototype-config.js

Workflow:
  1. In Pencil, export the selected frames into ./prototype-assets
  2. Run this command
  3. Copy the sharable link from the terminal output
`);
}

function main() {
  const args = parseArgs(process.argv);

  if (args.help || args.h) {
    usage();
    process.exit(0);
  }

  const title = args.title;
  const appUrl = args["app-url"] || args.appUrl;
  if (!title || !appUrl) {
    usage();
    process.exit(1);
  }

  const scriptPath = path.resolve(__dirname, "import-review-from-assets.js");
  const passArgs = [
    scriptPath,
    "--title",
    title,
    "--app-url",
    appUrl
  ];

  if (args.slug) {
    passArgs.push("--slug", args.slug);
  }
  if (args.dir) {
    passArgs.push("--dir", args.dir);
  }
  if (args.config) {
    passArgs.push("--config", args.config);
  }

  console.log("Importing exported Pencil screens into the review app...");
  const result = spawnSync(process.execPath, passArgs, {
    stdio: "inherit"
  });

  process.exit(result.status || 0);
}

main();
