/**
 * ESBuild configuration for bundling Lambda functions.
 *
 * Each Lambda function is bundled separately with its dependencies,
 * optimized for cold start performance and minimal bundle size.
 */

import { build, context } from "esbuild";
import { readdirSync, statSync, existsSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isWatch = process.argv.includes("--watch");

/**
 * Recursively find all handler.ts files in the functions directory.
 */
function findHandlers(dir, handlers = []) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      findHandlers(filePath, handlers);
    } else if (file === "handler.ts") {
      handlers.push(filePath);
    }
  }

  return handlers;
}

/**
 * Build configuration for Lambda functions.
 */
const functionsDir = join(__dirname, "src", "functions");
const handlers = existsSync(functionsDir) ? findHandlers(functionsDir) : [];

const entryPoints = handlers.reduce((acc, handlerPath) => {
  // Convert path like src/functions/locations/get/handler.ts
  // to output like dist/functions/locations/get/handler.js
  const relativePath = relative(join(__dirname, "src"), handlerPath);
  const outputPath = relativePath.replace(/\.ts$/, "");
  acc[outputPath] = handlerPath;
  return acc;
}, {});

const buildOptions = {
  entryPoints,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outdir: join(__dirname, "dist"),
  outExtension: { ".js": ".mjs" },
  sourcemap: true,
  minify: true,
  treeShaking: true,
  metafile: true,

  // External packages that should not be bundled
  external: [
    // AWS SDK v3 is included in Lambda runtime
    "@aws-sdk/*",
  ],

  // Resolve aliases from tsconfig
  alias: {
    "@": join(__dirname, "src"),
    "@shared": join(__dirname, "src", "shared"),
    "@functions": join(__dirname, "src", "functions"),
  },

  // Banner for ESM compatibility
  banner: {
    js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`.trim(),
  },

  // Log level for debugging
  logLevel: "info",
};

async function main() {
  console.log(`Found ${Object.keys(entryPoints).length} Lambda handlers to build`);

  if (isWatch) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    const result = await build(buildOptions);

    // Log bundle sizes
    if (result.metafile) {
      const outputs = Object.entries(result.metafile.outputs);
      console.log("\nBundle sizes:");
      for (const [path, meta] of outputs) {
        if (path.endsWith(".mjs")) {
          const sizeKB = (meta.bytes / 1024).toFixed(2);
          console.log(`  ${path}: ${sizeKB} KB`);
        }
      }
    }

    console.log("\nBuild complete!");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
