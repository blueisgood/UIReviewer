#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseBrowserConfig(configPath) {
  const source = fs.readFileSync(configPath, "utf8");
  const urlMatch = source.match(/supabaseUrl:\s*"([^"]+)"/);
  const keyMatch = source.match(/supabaseAnonKey:\s*"([^"]+)"/);
  if (!urlMatch || !keyMatch) {
    throw new Error("Could not read Supabase config from prototype-config.js");
  }
  return {
    supabaseUrl: urlMatch[1],
    supabaseKey: keyMatch[1]
  };
}

function listImages(dirPath) {
  return fs
    .readdirSync(dirPath)
    .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => path.join(dirPath, file));
}

async function uploadFile({ supabaseUrl, supabaseKey, reviewSlug, filePath }) {
  const fileName = path.basename(filePath).replace(/\s+/g, "-");
  const uploadPath = `${reviewSlug}/${Date.now()}-${fileName}`;
  const buffer = fs.readFileSync(filePath);
  const contentType = fileName.endsWith(".png")
    ? "image/png"
    : fileName.match(/\.jpe?g$/i)
      ? "image/jpeg"
      : "image/webp";

  const endpoint = `${supabaseUrl}/storage/v1/object/review-assets/${uploadPath}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
      "Content-Type": contentType,
      "x-upsert": "true"
    },
    body: buffer
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed for ${fileName}: ${response.status} ${text}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/review-assets/${uploadPath}`;
}

async function upsertReviewConfig({ supabaseUrl, supabaseKey, payload }) {
  const endpoint = `${supabaseUrl}/rest/v1/prototype_review_configs?on_conflict=review_slug`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Config save failed: ${response.status} ${text}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  const title = args.title || "Prototype Review";
  const reviewSlug = slugify(args.slug || title);
  const assetDir = path.resolve(cwd, args.dir || "prototype-assets");
  const configPath = path.resolve(cwd, args.config || "prototype-config.js");
  const appUrl = args["app-url"] || args.appUrl || "http://localhost:3000/index.html";

  if (!fs.existsSync(assetDir)) {
    throw new Error(`Asset directory not found: ${assetDir}`);
  }

  const imagePaths = listImages(assetDir);
  if (!imagePaths.length) {
    throw new Error(`No images found in ${assetDir}`);
  }

  const { supabaseUrl, supabaseKey } = parseBrowserConfig(configPath);

  console.log(`Uploading ${imagePaths.length} screens for "${title}"...`);
  const uploadedUrls = [];
  for (const imagePath of imagePaths) {
    const url = await uploadFile({ supabaseUrl, supabaseKey, reviewSlug, filePath: imagePath });
    uploadedUrls.push(url);
    console.log(`Uploaded: ${path.basename(imagePath)}`);
  }

  const totalPages = uploadedUrls.length + 2;
  const screens = [
    {
      title: "Intro",
      subtitle: `Page 1 of ${totalPages}`,
      type: "intro",
      image: uploadedUrls[0],
      hotspot: null
    }
  ];

  uploadedUrls.forEach((url, index) => {
    screens.push({
      title: `Step ${index + 1}`,
      subtitle: `Page ${index + 2} of ${totalPages}`,
      image: url,
      hotspot: null
    });
  });

  screens.push({
    title: "Submit",
    subtitle: `Page ${totalPages} of ${totalPages}`,
    type: "submit",
    image: uploadedUrls[uploadedUrls.length - 1],
    hotspot: null
  });

  await upsertReviewConfig({
    supabaseUrl,
    supabaseKey,
    payload: {
      review_slug: reviewSlug,
      title,
      screens,
      updated_at: new Date().toISOString()
    }
  });

  const shareUrl = new URL(appUrl);
  shareUrl.searchParams.set("review", reviewSlug);

  console.log("");
  console.log("Review created.");
  console.log(`Slug: ${reviewSlug}`);
  console.log(`Link: ${shareUrl.toString()}`);
  console.log("");
  console.log("Next step: open the link and set click areas in edit mode if needed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
