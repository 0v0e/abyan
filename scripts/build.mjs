import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptsDirectory, "..");
const outputDirectory = join(projectDirectory, "dist");
const clientDirectory = join(outputDirectory, "client");
const serverDirectory = join(outputDirectory, "server");

if (dirname(outputDirectory) !== projectDirectory) {
  throw new Error("Refusing to clean an output directory outside the project.");
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(clientDirectory, { recursive: true });
await mkdir(serverDirectory, { recursive: true });

const sourceFiles = ["index.html", "styles.css", "script.js"];
const binaryFiles = ["og.png"];

await Promise.all(
  [...sourceFiles, ...binaryFiles].map((fileName) =>
    cp(join(projectDirectory, fileName), join(clientDirectory, fileName)),
  ),
);

const [html, css, script] = await Promise.all(
  sourceFiles.map((fileName) => readFile(join(projectDirectory, fileName), "utf8")),
);
const socialImage = await readFile(join(projectDirectory, "og.png"));

const workerSource = `const assets = new Map(${JSON.stringify([
  ["/", ["text/html; charset=utf-8", html]],
  ["/index.html", ["text/html; charset=utf-8", html]],
  ["/styles.css", ["text/css; charset=utf-8", css]],
  ["/script.js", ["text/javascript; charset=utf-8", script]],
])});
const binaryAssets = new Map(${JSON.stringify([
  ["/og.png", ["image/png", socialImage.toString("base64")]],
])});

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const asset = assets.get(url.pathname);
    const binaryAsset = binaryAssets.get(url.pathname);

    if (!asset && !binaryAsset) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const [contentType, source] = asset ?? binaryAsset;
    const body = binaryAsset
      ? Uint8Array.from(atob(source), (character) => character.charCodeAt(0))
      : source;

    return new Response(request.method === "HEAD" ? null : body, {
      headers: {
        "content-type": contentType,
        "cache-control": url.pathname === "/" || url.pathname === "/index.html"
          ? "public, max-age=0, must-revalidate"
          : "public, max-age=31536000, immutable",
        "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
        "referrer-policy": "strict-origin-when-cross-origin",
        "x-content-type-options": "nosniff",
      },
    });
  },
};
`;

await writeFile(join(serverDirectory, "index.js"), workerSource, "utf8");
