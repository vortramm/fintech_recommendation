#!/usr/bin/env node
/**
 * 이 폴더를 http 로 띄웁니다. 윈도우·맥·리눅스 어디서나 같은 명령으로 돕니다.
 *
 *   npm run serve            → http://localhost:8080
 *   npm run serve -- 3000    → 포트 지정
 *
 * index.html 을 그냥 더블클릭해도 동작하지만, 브라우저 설정에 따라 file:// 에서
 * 스크립트가 막히는 경우가 있어 이 쪽이 확실합니다.
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = parseInt(process.argv[2] || process.env.PORT || "8080", 10);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

createServer(async (req, res) => {
  let path = decodeURIComponent((req.url || "/").split("?")[0]);
  if (path === "/") path = "/index.html";
  /* 폴더 밖으로 나가는 경로는 막습니다 */
  const full = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ""));
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }

  try {
    const body = await readFile(full);
    res.writeHead(200, { "content-type": TYPES[extname(full)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("없는 파일입니다: " + path);
  }
}).listen(PORT, () => {
  console.log("http://localhost:" + PORT + " 에서 열렸습니다. 끄려면 Ctrl+C");
});
