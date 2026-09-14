#!/usr/bin/env node
/**
 * 혜택 수집기
 *
 * data/sources.json 을 읽어 카드사·핀테크의 공개 혜택 목록을 긁고,
 * data/feed.js (페이지가 <script> 로 읽음) 와 data/feed.json (기계용) 을 만듭니다.
 *
 *   npm run collect                        전체 수집
 *   node tools/collect.mjs --only samsung  id 에 samsung 이 들어간 소스만
 *   node tools/collect.mjs --dump          받은 JSON 응답을 tools/captures/ 에 저장
 *   node tools/collect.mjs --selftest      네트워크 없이 수집 로직 점검
 *
 * 수집 대상은 두 종류입니다.
 *   programs  LINK · 마이샵 · 하나PICK · 꾹 처럼 "공통 혜택 풀은 공개, 적용 대상은 개인화" 인 것.
 *             누구에게 열리는지는 로그인해야 알 수 있지만, 어떤 가맹점이 이번 달 목록에
 *             올라와 있는지는 공통이므로 그 부분만 가져옵니다.
 *   public    이벤트 · 쿠폰 목록처럼 통째로 공개된 것.
 *
 * 왜 헤드리스 브라우저인가:
 *   카드사 목록은 거의 전부 XHR 로 내려와 정적 HTML 에는 "총 0개" 만 남습니다.
 *   그래서 페이지를 실제로 띄우고, DOM 과 네트워크 응답(JSON)을 함께 봅니다.
 *
 * 수집 결과는 세 갈래입니다.
 *   structured  가맹점·할인율·한도까지 읽어낸 것. 순위 계산에 들어갑니다.
 *   raw         제목·기간·링크만 건진 것. "요즘 뜬 혜택"에 링크로만 띄웁니다.
 *   hints       혜택 목록처럼 보이는 JSON 응답의 생김새. 여기 보고 pick 매핑을 적어 주면
 *               다음 수집부터 그 소스가 structured 로 승격됩니다.
 */

import { chromium } from "playwright";
import { PARSERS } from "./parsers.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const args = process.argv.slice(2);
const argOf = (n, d) => (args.indexOf(n) === -1 ? d : args[args.indexOf(n) + 1]);
const ONLY = argOf("--only", null);
const TIMEOUT = parseInt(argOf("--timeout", "30000"), 10);
const DUMP = args.includes("--dump");
const SOURCES = argOf("--sources", "data/sources.json");
const SELFTEST = args.includes("--selftest");
const REPLAY = argOf("--replay", null);
const PROBE = argOf("--probe", null);

/* ── 텍스트에서 건질 값 ───────────────────────────────────── */
const MONEY = /(\d[\d,]*)\s*원/;
const PERCENT = /(\d+(?:\.\d+)?)\s*%/;
const PERIOD = /(\d{1,2})\s*[.\/월]\s*(\d{1,2})\s*일?\s*[~\-]\s*(\d{1,2})\s*[.\/월]\s*(\d{1,2})/;
const NOISE = /공지|약관|회사소개|채용|개인정보|고객센터|로그인|회원가입/;

function looksLikeBenefit(text, keywords) {
  if (!text) return false;
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 6 || t.length > 120) return false;
  if (NOISE.test(t)) return false;
  if (keywords && keywords.length && !keywords.some((k) => t.includes(k))) return false;
  return PERCENT.test(t) || MONEY.test(t) || /쿠폰|캐시백|적립|할인/.test(t);
}

function money(v) {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ── DOM 에서 긁기 ────────────────────────────────────────── */
function harvest() {
  const out = [];
  document.querySelectorAll("a[href], li, button").forEach((node) => {
    const text = (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    const link = node.closest("a[href]");
    const box = node.closest("li, article, div") || node;
    out.push({
      text,
      href: link ? link.href : null,
      around: (box.innerText || "").replace(/\s+/g, " ").trim().slice(0, 240)
    });
  });
  return out;
}

/* ── JSON 응답에서 뽑기 ───────────────────────────────────── */
const pluck = (obj, path) =>
  String(path || "").split(".").filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), obj);

const HINT_KEY = /mcht|merch|shop|store|brand|가맹|fvr|benef|혜택|disc|dc[A-Z]|cpn|coupon|amt|rate|evnt|event|prd|기간/;
const HINT_SKIP = /\/lottie\/|\/images\/|\.png|\.svg/i;

/* 전용 파서 > pick 매핑 > 힌트 순으로 처리합니다. */
function fromCaptures(captures, src) {
  const structured = [];
  const extraRaw = [];
  const hints = [];
  const seenHint = new Set();

  const parsers = []
    .concat(src.parser || [])
    .map((name) => PARSERS[name])
    .filter(Boolean);

  for (const cap of captures) {
    const parser = parsers.find((p) => cap.url.includes(p.match));
    if (parser) {
      const rows = pluck(cap.body, parser.path);
      if (Array.isArray(rows)) {
        const got = parser.run(rows, src);
        structured.push(...got.structured);
        extraRaw.push(...got.raw);
        continue;
      }
    }
    if (src.pick && (!src.pick.match || cap.url.includes(src.pick.match))) {
      const rows = pluck(cap.body, src.pick.path);
      if (Array.isArray(rows)) {
        const m = src.pick.map || {};
        for (const row of rows) {
          const name = m.merchantName ? pluck(row, m.merchantName) : null;
          if (!name) continue;
          const rate = m.rate ? Number(pluck(row, m.rate)) : null;
          const fixed = m.fixed ? money(pluck(row, m.fixed)) : null;
          if (!rate && !fixed) continue;
          structured.push({
            scope: "merchant",
            merchantName: String(name).trim(),
            app: src.app,
            kind: rate ? "rate" : "fixed",
            rate: rate ? (rate > 1 ? rate / 100 : rate) : undefined,
            amount: fixed || undefined,
            cap: m.cap ? money(pluck(row, m.cap)) : undefined,
            minAmount: m.minAmount ? money(pluck(row, m.minAmount)) : undefined,
            benefitType: m.benefitType ? String(pluck(row, m.benefitType)) : "할인",
            condition: (src.program ? src.program + " 혜택 켜고 결제" : src.name + " 쿠폰 적용"),
            monthlyCap: m.period ? String(pluck(row, m.period)) : undefined,
            source: src.id
          });
        }
        continue;
      }
    }

    /* 매핑이 없을 때: 혜택 목록처럼 생긴 배열을 찾아 힌트로 남깁니다 */
    if (HINT_SKIP.test(cap.url)) continue;
    const stack = [{ node: cap.body, path: "" }];
    while (stack.length) {
      const { node, path } = stack.pop();
      if (Array.isArray(node)) {
        if (node.length >= 3 && node[0] && typeof node[0] === "object" && !Array.isArray(node[0])) {
          const keys = Object.keys(node[0]);
          const key = cap.url.split("?")[0] + "#" + (path || "(root)");
          if (keys.length >= 3 && keys.some((k) => HINT_KEY.test(k)) && !seenHint.has(key)) {
            seenHint.add(key);
            hints.push({
              source: src.id, url: cap.url.split("?")[0], path: path || "(root)",
              rows: node.length, keys: keys.slice(0, 25),
              sample: JSON.stringify(node[0]).slice(0, 400)
            });
          }
        }
        continue;
      }
      if (node && typeof node === "object") {
        for (const k of Object.keys(node)) stack.push({ node: node[k], path: path ? path + "." + k : k });
      }
    }
  }
  return { structured, raw: extraRaw, hints };
}

/* ── 소스 한 곳 수집 ──────────────────────────────────────── */
async function collectSource(browser, src) {
  const row = { id: src.id, app: src.app, name: src.program || src.name, url: src.url,
                kind: src.program ? "program" : "public", status: "error", count: 0, structured: 0 };
  if (!src.url) { row.status = "no-url"; return { row, raw: [], structured: [], hints: [] }; }

  const ctx = await browser.newContext({ userAgent: UA, locale: "ko-KR", viewport: { width: 1280, height: 2200 } });
  const page = await ctx.newPage();
  const captures = [];

  page.on("response", async (res) => {
    try {
      if (res.request().resourceType() === "document") return;
      if (!/json/i.test(res.headers()["content-type"] || "")) return;
      const body = await res.json().catch(() => null);
      if (!body) return;
      const text = JSON.stringify(body);
      if (text.length < 80 || text.length > 2_000_000) return;
      captures.push({ url: res.url(), size: text.length, body });
    } catch { /* 응답 본문을 못 읽으면 넘어갑니다 */ }
  });

  try {
    const res = await page.goto(src.url, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    const code = res ? res.status() : 0;
    row.http = code;
    if (code >= 400) {
      row.status = code === 403 || code === 503 ? "blocked" : "http-" + code;
      return { row, raw: [], structured: [], hints: [] };
    }

    await page.waitForLoadState("networkidle", { timeout: TIMEOUT }).catch(() => {});
    await page.mouse.wheel(0, 6000).catch(() => {});
    await page.waitForTimeout(1500);

    /* 링크와 그 부모 li 가 같은 문구를 물고 오므로, 긴 쪽(기간이 덧붙은 것)을 버립니다 */
    const harvested = (await page.evaluate(harvest).catch(() => null)) || [];
    const hits = harvested
      .filter((h) => looksLikeBenefit(h.text, src.keywords))
      .sort((a, b) => a.text.length - b.text.length);

    const kept = [];
    const raw = [];
    for (const hit of hits) {
      const flat = hit.text.replace(/\s+/g, "");
      if (kept.some((k) => flat.includes(k) || k.includes(flat))) continue;
      kept.push(flat);
      const pc = hit.text.match(PERCENT);
      const mn = hit.text.match(MONEY);
      raw.push({
        app: src.app, source: src.id, sourceName: src.program || src.name,
        title: hit.text, url: hit.href || src.url,
        period: (hit.around.match(PERIOD) || [])[0] || null,
        percent: pc ? Number(pc[1]) : null,
        won: mn ? Number(mn[1].replace(/,/g, "")) : null
      });
      if (raw.length >= 60) break;
    }

    const picked = fromCaptures(captures, src);
    raw.push(...picked.raw);

    if (DUMP) {
      await mkdir(join(ROOT, "tools/captures"), { recursive: true });
      if (captures.length) {
        await writeFile(join(ROOT, "tools/captures", src.id + ".json"),
          JSON.stringify(captures.map((c) => ({ url: c.url, size: c.size, body: c.body })), null, 2));
      }
      /* 목록을 서버에서 그려 내려주는 곳은 JSON 이 없으므로 HTML 을 남깁니다 */
      const html = await page.content().catch(() => null);
      if (html) await writeFile(join(ROOT, "tools/captures", src.id + ".html"), html);
    }

    row.captures = captures.length;
    row.count = raw.length;
    row.structured = picked.structured.length;
    if (picked.structured.length || raw.length) row.status = "ok";
    else {
      const body = (await page.evaluate(() => document.body.innerText || "")).slice(0, 4000);
      row.status = /로그인|인증서|본인확인/.test(body) ? "login-required" : "empty";
    }
    return { row, raw, structured: picked.structured, hints: picked.hints };
  } catch (err) {
    row.error = String(err.message || err).split("\n")[0].slice(0, 160);
    return { row, raw: [], structured: [], hints: [] };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* ── 자체 점검 — 픽스처를 로컬 서버로 띄워 DOM · XHR 양쪽을 확인 ── */
async function selftest() {
  const files = {
    "/list.html": [200, "text/html; charset=utf-8", await readFile(join(ROOT, "tools/fixtures/sample-events.html"), "utf8")],
    "/xhr.html": [200, "text/html; charset=utf-8", await readFile(join(ROOT, "tools/fixtures/sample-xhr.html"), "utf8")],
    "/api/link.json": [200, "application/json; charset=utf-8", await readFile(join(ROOT, "tools/fixtures/api/link.json"), "utf8")]
  };
  const server = createServer((req, res) => {
    const hit = files[req.url.split("?")[0]];
    if (!hit) { res.writeHead(404); res.end(); return; }
    res.writeHead(hit[0], { "content-type": hit[1] });
    res.end(hit[2]);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });

  const dom = await collectSource(browser, {
    id: "selftest-dom", app: "test", name: "픽스처(DOM)", url: base + "/list.html",
    keywords: ["할인", "적립", "쿠폰", "캐시백"]
  });
  console.log("DOM 수집:", dom.row.status, "· 공지", dom.raw.length, "건");
  dom.raw.forEach((i) => console.log("   -", i.title, "|", i.period || "기간없음"));

  const xhr = await collectSource(browser, {
    id: "selftest-xhr", app: "samsung", program: "LINK", url: base + "/xhr.html",
    keywords: ["할인", "적립"],
    pick: { match: "/api/link.json", path: "data.benefitList",
            map: { merchantName: "mchtNm", rate: "dcRt", cap: "maxDcAmt", minAmount: "minPayAmt", period: "prd" } }
  });
  console.log("\nXHR 수집:", xhr.row.status, "· 구조화", xhr.structured.length, "건 (응답", xhr.row.captures, "개)");
  xhr.structured.forEach((b) =>
    console.log("   -", b.merchantName, (b.rate * 100).toFixed(1) + "%", "한도", b.cap, "최소", b.minAmount));

  const noPick = await collectSource(browser, {
    id: "selftest-hint", app: "test", name: "픽스처(힌트)", url: base + "/xhr.html", keywords: ["할인"]
  });
  console.log("\n매핑 없을 때 힌트:", noPick.hints.length, "건");
  noPick.hints.forEach((h) => console.log("   - path:", h.path, "| rows:", h.rows, "| keys:", h.keys.join(",")));

  await browser.close();
  server.close();

  const ok = dom.raw.length === 4 && xhr.structured.length === 3 && noPick.hints.length >= 1;
  console.log(ok ? "\n자체 점검 통과 — DOM · XHR · 힌트 세 경로 모두 동작합니다."
                 : "\n자체 점검 실패");
  process.exit(ok ? 0 : 1);
}

/* ── 실행 ─────────────────────────────────────────────────── */
/* 저장된 캡처로 파서만 다시 돌립니다 — 네트워크 없이 파서를 고칠 때 씁니다 */
async function replay(dir) {
  const reg = JSON.parse(await readFile(join(ROOT, "data/sources.json"), "utf8"));
  const all = [].concat(reg.programs, reg.public);
  const feedPath = join(ROOT, "data/feed.json");
  let feed;
  try { feed = JSON.parse(await readFile(feedPath, "utf8")); }
  catch { feed = { collectedAt: new Date().toISOString(), sources: [], raw: [] }; }

  const structured = [], addedRaw = [];
  const { readdir } = await import("node:fs/promises");
  for (const file of await readdir(dir)) {
    if (!file.endsWith(".json")) continue;
    const id = file.replace(/\.json$/, "");
    const src = all.find((s) => s.id === id);
    if (!src) { console.log("· " + id.padEnd(24) + "sources.json 에 없음 — 건너뜀"); continue; }
    const captures = JSON.parse(await readFile(join(dir, file), "utf8"));
    const got = fromCaptures(captures, { ...src, url: src.catalogUrl || src.url });
    structured.push(...got.structured);
    addedRaw.push(...got.raw);
    console.log("· " + id.padEnd(24) + "구조화 " + got.structured.length + " · 공지 " + got.raw.length);
  }

  feed.structured = structured;
  feed.raw = (feed.raw || []).filter((r) => !addedRaw.some((a) => a.title === r.title)).concat(addedRaw);
  feed.programs = reg.programs;
  for (const row of feed.sources || []) {
    const mine = structured.filter((b) => b.source === row.id).length;
    if (mine) { row.structured = mine; row.status = "ok"; }
  }

  const body = JSON.stringify(feed, null, 2);
  await writeFile(feedPath, body + "\n");
  await writeFile(join(ROOT, "data/feed.js"),
    "/* tools/collect.mjs 가 생성합니다. 직접 고치지 마세요. */\nwindow.DISCOUNT_FEED = " + body + ";\n");
  console.log("\n구조화 " + structured.length + "건 · 공지 " + feed.raw.length + "건 → data/feed.js");
}

/* 주소 하나만 열어 보고 혜택 목록 응답이 있는지 봅니다 — sources.json 을 고치기 전에 확인용 */
async function probe(url) {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || null;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    proxy: proxy ? { server: proxy, bypass: "localhost,127.0.0.1,::1" } : undefined,
    args: ["--no-sandbox"]
  });
  const { row, raw, hints } = await collectSource(browser, {
    id: "probe", app: argOf("--app", "probe"), name: "probe", url,
    keywords: ["할인", "적립", "쿠폰", "캐시백", "혜택"]
  });
  await browser.close();

  console.log("상태: " + row.status + " · JSON 응답 " + (row.captures || 0) + "개 · 공지 " + raw.length + "건\n");
  if (hints.length) {
    console.log("혜택 목록처럼 보이는 응답");
    hints.forEach((h, i) => {
      console.log(" " + (i + 1) + ") " + h.url);
      console.log("    path: " + h.path + " · " + h.rows + "행");
      console.log("    keys: " + h.keys.join(", "));
      console.log("    sample: " + h.sample.slice(0, 240));
    });
  } else {
    console.log("혜택 목록처럼 보이는 JSON 응답이 없습니다.");
    if (row.status === "login-required") console.log("→ 로그인 뒤에만 목록이 내려오는 화면입니다.");
  }
  raw.slice(0, 8).forEach((r) => console.log("  · " + r.title));
}

async function main() {
  if (SELFTEST) return selftest();
  if (REPLAY) return replay(REPLAY);
  if (PROBE) return probe(PROBE);

  const regPath = SOURCES.startsWith("/") ? SOURCES : join(ROOT, SOURCES);
  const reg = JSON.parse(await readFile(regPath, "utf8"));
  const targets = []
    .concat(reg.programs.filter((p) => p.collect).map((p) => ({ ...p, url: p.catalogUrl || p.url })))
    .concat(reg.public)
    .filter((s) => !ONLY || s.id.includes(ONLY));

  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || null;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    /* 프록시를 쓰더라도 로컬 주소는 직접 붙습니다 */
    proxy: proxy ? { server: proxy, bypass: "localhost,127.0.0.1,::1" } : undefined,
    args: ["--no-sandbox"]
  });

  const rows = [], raw = [], structured = [], hints = [];
  for (const src of targets) {
    process.stdout.write("· " + src.id.padEnd(24));
    const r = await collectSource(browser, src);
    rows.push(r.row);
    raw.push(...r.raw);
    structured.push(...r.structured);
    hints.push(...r.hints);
    console.log(r.row.status +
      (r.row.structured ? " · 구조화 " + r.row.structured : "") +
      (r.row.count ? " · 공지 " + r.row.count : "") +
      (r.row.error ? " — " + r.row.error : ""));
  }
  await browser.close();

  const feed = {
    collectedAt: new Date().toISOString(),
    sources: rows,
    programs: reg.programs,
    structured,
    raw,
    hints
  };

  const body = JSON.stringify(feed, null, 2);
  await writeFile(join(ROOT, "data/feed.json"), body + "\n");
  await writeFile(join(ROOT, "data/feed.js"),
    "/* tools/collect.mjs 가 생성합니다. 직접 고치지 마세요. */\nwindow.DISCOUNT_FEED = " + body + ";\n");

  const ok = rows.filter((r) => r.status === "ok").length;
  console.log("\n소스 " + rows.length + "곳 중 " + ok + "곳 성공 · 구조화 " + structured.length +
    "건 · 공지 " + raw.length + "건 · 힌트 " + hints.length + "건");
  if (hints.length) {
    console.log("\n혜택 목록처럼 보이는 응답 (pick 매핑 후보)");
    hints.slice(0, 12).forEach((h, i) => {
      console.log(" " + (i + 1) + ") [" + h.source + "] " + h.url);
      console.log("    path: " + h.path + " · " + h.rows + "행");
      console.log("    keys: " + h.keys.join(", "));
      console.log("    sample: " + h.sample.slice(0, 200));
    });
    console.log("\n이 내용을 data/sources.json 의 pick 에 옮기거나, 앱 캡처가 있다면");
    console.log("node tools/from-har.mjs capture.har --write <source-id> 를 쓰세요.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
