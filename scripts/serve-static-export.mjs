import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const root = resolve(process.cwd(), "out");
const port = Number(process.env.PORT ?? 4173);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

async function statOrMissing(file) {
  try {
    return await stat(file);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
}

async function findExportedFile(pathname) {
  const target = resolve(root, pathname.replace(/^[/\\]+/u, ""));
  if (target !== root && !target.startsWith(`${root}${sep}`)) return null;

  const targetStat = await statOrMissing(target);
  if (!targetStat) return null;
  const file = targetStat.isDirectory() ? join(target, "index.html") : target;
  const fileStat = await statOrMissing(file);
  return fileStat?.isFile() ? file : null;
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  let file;
  try {
    file = await findExportedFile(pathname);
  } catch (error) {
    console.error("Could not resolve static export request:", error);
    response.writeHead(500).end("Internal server error");
    return;
  }

  if (!file) {
    let notFoundPage;
    try {
      notFoundPage = await findExportedFile("/404.html");
    } catch (error) {
      console.error("Could not resolve the exported 404 page:", error);
      response.writeHead(500).end("Internal server error");
      return;
    }
    if (notFoundPage) {
      try {
        const body = await readFile(notFoundPage);
        response.writeHead(404, {
          "Content-Length": body.byteLength,
          "Content-Type": "text/html; charset=utf-8",
        }).end(request.method === "HEAD" ? undefined : body);
        return;
      } catch (error) {
        console.error("Could not serve the exported 404 page:", error);
        response.writeHead(500).end("Internal server error");
        return;
      }
    }
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }

  try {
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Length": body.byteLength,
      "Content-Type": contentTypes.get(extname(file).toLowerCase()) ?? "application/octet-stream",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    console.error(`Could not serve ${relative(root, file)}:`, error);
    response.writeHead(500).end("Internal server error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving static export from ${root} on http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
