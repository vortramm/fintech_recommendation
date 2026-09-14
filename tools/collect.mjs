#!/usr/bin/env node
/**
 * 혜택 수집기
 *
 * data/sources.json 의 public 목록을 헤드리스 브라우저로 열어 혜택·이벤트 공지를 긁고,
 * data/feed.js (페이지가 <script> 로 읽음) 와 data/feed.json (기계용) 을 만듭니다.
 *
 *   node tools/collect.mjs                 전체 수집
 *   node tools/collect.mjs --only payco    id 에 payco 가 들어간 소스만
 *   node tools/collect.mjs --timeout 45000 소스당 대기 시간(ms)
 *
 * 왜 단순 fetch 가 아니라 브라우저인가:
 *   카드사 페이지는 대부분 자바스크립트로 목록을 그리고, 일부는 서버가 봇 요청에 503 을
 *   돌려줍니다. 실제 브라우저로 열어야 내용이 나옵니다.
 *
 * 수집 결과는 두 갈래로 나눕니다.
 *   structured  가맹점·할인율·한도까지 정확히 뽑아낸 것. 순위 계산에 바로 들어갑니다.
 *   raw         제목·기간·링크만 건진 것. "요즘 뜬 혜택"에 원문 링크로만 띄웁니다.
 * 숫자를 잘못 읽어 순위를 망치는 것보다, 못 읽은 건 못 읽었다고 두는 편이 낫습니다.
 */

import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const ONLY = argOf("--only", null);
const SELFTEST = args.includes("--selftest");
const TIMEOUT = parseInt(argOf("--timeout", "30000"), 10);

/* 공지 제목에서 건질 만한 값 */
const MONEY = /(\d[\d,]*)\s*원/;
const PERCENT = /(\d+(?:\.\d+)?)\s*%/;
const PERIOD = /(\d{1,2})\s*[.\/월]\s*(\d{1,2})\s*[일]?\s*[~\-]\s*(\d{1,2})\s*[.\/월]\s*(\d{1,2})/;

function looksLikeBenefit(text, keywords) {
  if (!text) return false;
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 6 || t.length > 120) return false;
  if (!keywords.some((k) => t.includes(k))) return false;
  return PERCENT.test(t) || MONEY.test(t) || /쿠폰|캐시백|적립|할인/.test(t);
}

/* 페이지 안에서 실행 — 링크 텍스트를 긁어옵니다 */
function harvest() {
  const out = [];
  document.querySelectorAll("a[href]").forEach((a) => {
    const text = (a.innerText || a.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    const box = a.closest("li, article, div") || a;
    const around = (box.innerText || "").replace(/\s+/g, " ").trim().slice(0, 240);
    out.push({ text, href: a.href, around });
  });
  return out;
}

async function collectSource(browser, src) {
  const row = { id: src.id, app: src.app, name: src.name, url: src.url, status: "error", count: 0 };
  if (!src.url) { row.status = "no-url"; return { row, items: [] }; }

  const ctx = await browser.newContext({ userAgent: UA, locale: "ko-KR", viewport: { width: 1280, height: 2000 } });
  const page = await ctx.newPage();
  try {
    const res = await page.goto(src.url, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    const code = res ? res.status() : 0;
    if (code >= 400) {
      row.status = code === 403 || code === 503 ? "blocked" : "http-" + code;
      row.http = code;
      return { row, items: [] };
    }
    await page.waitForTimeout(2500);                       /* 목록이 그려질 시간 */
    await page.mouse.wheel(0, 4000).catch(() => {});       /* 무한스크롤 대비 */
    await page.waitForTimeout(1200);

    const seen = new Set();
    const items = [];
    for (const hit of await page.evaluate(harvest)) {
      if (!looksLikeBenefit(hit.text, src.keywords)) continue;
      const key = hit.text.slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      const period = (hit.around.match(PERIOD) || [])[0] || null;
      items.push({
        app: src.app,
        source: src.id,
        sourceName: src.name,
        title: hit.text,
        url: hit.href,
        period,
        percent: (hit.text.match(PERCENT) || [])[1] ? Number(RegExp.$1) : null,
        won: (hit.text.match(MONEY) || [])[1] ? Number(RegExp.$1.replace(/,/g, "")) : null
      });
      if (items.length >= 40) break;
    }
    row.status = items.length ? "ok" : "empty";
    row.http = code;
    row.count = items.length;
    return { row, items };
  } catch (err) {
    row.error = String(err.message || err).split("\n")[0].slice(0, 160);
    return { row, items: [] };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* 추출 규칙이 살아 있는지 로컬 픽스처로 확인합니다 — 네트워크 없이 돕니다. */
async function selftest() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  const { row, items } = await collectSource(browser, {
    id: "selftest", app: "test", name: "픽스처",
    url: "file://" + join(ROOT, "tools/fixtures/sample-events.html"),
    keywords: ["할인", "적립", "쿠폰", "캐시백"]
  });
  await browser.close();
  console.log("상태:", row.status, "· 추출", items.length, "건");
  items.forEach(function (i) {
    console.log("  -", i.title, "| 기간:", i.period || "없음",
      "| %:", i.percent === null ? "-" : i.percent, "| 원:", i.won === null ? "-" : i.won);
  });
  const okay = items.length === 4 && items.every((i) => !/공지|약관|회사소개/.test(i.title));
  console.log(okay ? "\n자체 점검 통과 — 혜택만 골라내고 공지·약관은 걸렀습니다." : "\n자체 점검 실패");
  process.exit(okay ? 0 : 1);
}

async function main() {
  if (SELFTEST) return selftest();
  const sources = JSON.parse(await readFile(join(ROOT, "data/sources.json"), "utf8"));
  const targets = sources.public.filter((s) => !ONLY || s.id.includes(ONLY));

  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || null;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    proxy: proxyUrl ? { server: proxyUrl } : undefined,
    args: ["--no-sandbox"]
  });

  const rows = [], raw = [];
  for (const src of targets) {
    process.stdout.write(`· ${src.id.padEnd(18)} `);
    const { row, items } = await collectSource(browser, src);
    rows.push(row);
    raw.push(...items);
    console.log(`${row.status}${row.count ? " (" + row.count + "건)" : ""}${row.error ? " — " + row.error : ""}`);
  }
  await browser.close();

  const feed = {
    collectedAt: new Date().toISOString(),
    sources: rows,
    personal: sources.personal,
    structured: [],   /* 소스별 전용 파서를 붙이면 여기에 쌓입니다 */
    raw
  };

  await writeFile(join(ROOT, "data/feed.json"), JSON.stringify(feed, null, 2) + "\n");
  await writeFile(join(ROOT, "data/feed.js"),
    "/* tools/collect.mjs 가 생성합니다. 직접 고치지 마세요. */\n" +
    "window.DISCOUNT_FEED = " + JSON.stringify(feed, null, 2) + ";\n");

  const ok = rows.filter((r) => r.status === "ok").length;
  console.log(`\n수집 완료 — 소스 ${rows.length}곳 중 ${ok}곳 성공, 공지 ${raw.length}건`);
  console.log("→ data/feed.js, data/feed.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
