#!/usr/bin/env node
/**
 * 앱에서 본 혜택을 직접 등록하기
 *
 * 카드사·핀테크 앱의 공유 문구를 그대로 붙여넣으면 혜택으로 만들어 data/manual.js 에 넣습니다.
 * 로그인 벽이나 앱 전용이라 자동 수집이 안 되는 것들을 여기에 모읍니다.
 *
 *   node tools/add-benefit.mjs "토스에서 11번가 3.5% 적립 쿠폰을 확인해보세요"
 *   node tools/add-benefit.mjs "$(pbpaste)"        여러 줄을 붙여넣으면 줄마다 등록합니다
 *   node tools/add-benefit.mjs "..." --cap 10000 --min 20000 --until 2026-09-30
 *   node tools/add-benefit.mjs --list          등록된 것 보기
 *   node tools/add-benefit.mjs --remove 3      3번 지우기
 *
 * 옵션
 *   --app <id>        앱을 못 알아볼 때 (toss, kakaopay, samsung ...)
 *   --merchant <id>   결제처를 못 알아볼 때 (11st, kream ...)
 *   --cap <원>        할인·적립 한도. 비워 두면 "한도 미확인"으로 표시됩니다
 *   --min <원>        최소 결제금액
 *   --until <날짜>    종료일 (YYYY-MM-DD). 지나면 자동으로 빠집니다
 *   --url <주소>      혜택 원문 링크
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STORE = join(ROOT, "data/manual.json");
const SCRIPT = join(ROOT, "data/manual.js");

const args = process.argv.slice(2);
const argOf = (n, d) => (args.indexOf(n) === -1 ? d : args[args.indexOf(n) + 1]);
const text = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== undefined
  ? !String(args[args.indexOf(a) - 1]).startsWith("--") : !a.startsWith("--"));

async function loadDb() {
  const src = await readFile(join(ROOT, "data/benefits.js"), "utf8");
  const g = {};
  new Function("window", src)(g);
  return g.DISCOUNT_DB;
}
async function loadStore() {
  if (!existsSync(STORE)) return [];
  return JSON.parse(await readFile(STORE, "utf8"));
}
async function saveStore(list) {
  await writeFile(STORE, JSON.stringify(list, null, 2) + "\n");
  await writeFile(SCRIPT,
    "/* tools/add-benefit.mjs 가 생성합니다. 앱에서 보고 직접 등록한 혜택입니다. */\n" +
    "window.DISCOUNT_MANUAL = " + JSON.stringify({ updatedAt: new Date().toISOString(), benefits: list }, null, 2) + ";\n");
}

/* 공유 문구는 앱 이름 대신 프로그램 이름으로 적히는 경우가 많습니다 */
const APP_ALIASES = {
  bccard:   ["페이북", "마이태그", "BC카드", "비씨카드"],
  shinhan:  ["마이샵", "SOL페이", "쏠페이", "신한플레이", "신한카드", "신한"],
  samsung:  ["LINK", "링크", "모니모", "삼성카드"],
  woori:    ["꾹", "우리WON", "우리원", "우리카드"],
  hana:     ["하나PICK", "하나픽", "하나페이", "하나카드", "원큐"],
  kbpay:    ["KB Pay", "KB페이", "국민카드", "KB국민"],
  hyundai:  ["현대카드", "M포인트"],
  lotte:    ["디지로카", "롯데카드"],
  nhpay:    ["NH페이", "농협카드", "NH카드"],
  toss:     ["토스페이", "토스"],
  kakaopay: ["카카오페이"],
  naverpay: ["네이버페이", "네이버 페이"],
  payco:    ["페이코", "PAYCO"],
  ssgpay:   ["SSG페이", "쓱페이"],
  smilepay: ["스마일페이", "스마일캐시"]
};

function findApp(db, text) {
  const explicit = argOf("--app", null);
  if (explicit) return explicit;
  const low = text.toLowerCase();
  const candidates = [];
  for (const id of Object.keys(db.apps)) {
    const names = [db.apps[id].name.replace(/\s*\(.*\)/, "")].concat(APP_ALIASES[id] || []);
    for (const n of names) {
      if (low.includes(String(n).toLowerCase())) candidates.push({ id, len: String(n).length });
    }
  }
  if (!candidates.length) return null;
  /* 가장 긴 이름이 걸린 쪽을 씁니다 ("신한카드" 가 "신한" 보다 우선) */
  candidates.sort((a, b) => b.len - a.len);
  return candidates[0].id;
}

function findMerchant(db, text) {
  const explicit = argOf("--merchant", null);
  if (explicit) return db.merchants.find((m) => m.id === explicit) || null;
  const all = db.merchants.slice().sort((a, b) => b.name.length - a.name.length);
  for (const m of all) {
    for (const n of [m.name].concat(m.aliases || [])) {
      if (String(n).length >= 2 && text.toLowerCase().includes(String(n).toLowerCase())) return m;
    }
  }
  return null;
}

function parseValue(text) {
  const pct = text.match(/([\d.]+)\s*%/);
  /* 3.5 / 100 이 0.035000000000000003 이 되지 않도록 자릿수를 정리합니다 */
  if (pct) return { kind: "rate", rate: Number((parseFloat(pct[1]) / 100).toFixed(6)) };
  const won = text.match(/([\d,]+)\s*원/);
  if (won) return { kind: "fixed", amount: parseInt(won[1].replace(/,/g, ""), 10) };
  const man = text.match(/([\d.]+)\s*만\s*원?/);
  if (man) return { kind: "fixed", amount: Math.round(parseFloat(man[1]) * 10000) };
  return null;
}

function buildEntry(db, text, app, merchant, value) {
  const cap = argOf("--cap", null);
  return {
    scope: "merchant",
    merchant: merchant.id,
    merchantName: merchant.name,
    app,
    ...value,
    cap: cap ? parseInt(cap, 10) : undefined,
    minAmount: argOf("--min", null) ? parseInt(argOf("--min"), 10) : undefined,
    benefitType: /적립|캐시백|포인트/.test(text) ? "적립" : "할인",
    condition: db.apps[app].name.replace(/\s*\(.*\)/, "") + " 앱에서 쿠폰 받고 결제",
    until: argOf("--until", null) || undefined,
    url: argOf("--url", null) || undefined,
    note: text.trim(),
    addedAt: new Date().toISOString().slice(0, 10),
    source: "manual"
  };
}

async function main() {
  const db = await loadDb();
  const list = await loadStore();

  if (args.includes("--list")) {
    if (!list.length) return console.log("등록된 혜택이 없습니다.");
    list.forEach((b, i) => {
      const v = b.kind === "rate" ? Number((b.rate * 100).toFixed(2)) + "%" : b.amount.toLocaleString("ko-KR") + "원";
      console.log(`${i}. [${db.apps[b.app] ? db.apps[b.app].name : b.app}] ${b.merchantName} ${v} ${b.benefitType}` +
        (b.cap ? ` · 한도 ${b.cap.toLocaleString("ko-KR")}원` : " · 한도 미확인") +
        (b.until ? ` · ~${b.until}` : ""));
    });
    return;
  }

  if (args.includes("--remove")) {
    const i = parseInt(argOf("--remove", "-1"), 10);
    if (!(i >= 0 && i < list.length)) { console.error("번호가 올바르지 않습니다. --list 로 확인하세요."); process.exit(1); }
    const [gone] = list.splice(i, 1);
    await saveStore(list);
    return console.log(`지웠습니다: ${gone.merchantName} (${gone.app})`);
  }

  if (!text) {
    console.error('사용법: node tools/add-benefit.mjs "토스에서 11번가 3.5% 적립 쿠폰을 확인해보세요"');
    process.exit(1);
  }

  /* 여러 줄을 붙여넣으면 줄마다 하나씩 등록합니다 */
  const lines = text.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 4);
  if (lines.length > 1) {
    let added = 0;
    for (const line of lines) {
      const a = findApp(db, line), m = findMerchant(db, line), v = parseValue(line);
      if (!a || !m || !v) { console.log(`건너뜀: ${line.slice(0, 50)} (앱·결제처·값 중 못 찾은 것이 있습니다)`); continue; }
      list.push(buildEntry(db, line, a, m, v));
      added++;
      const vv = v.kind === "rate" ? Number((v.rate * 100).toFixed(2)) + "%" : v.amount.toLocaleString("ko-KR") + "원";
      console.log(`등록 — [${db.apps[a].name}] ${m.name} ${vv}`);
    }
    if (added) await saveStore(list);
    console.log(`\n${added}건 등록했습니다.`);
    return;
  }

  const app = findApp(db, text);
  const merchant = findMerchant(db, text);
  const value = parseValue(text);

  if (!app) { console.error("어느 앱인지 못 알아봤습니다. --app <id> 로 알려주세요."); process.exit(1); }
  if (!merchant) { console.error("어느 결제처인지 못 알아봤습니다. --merchant <id> 로 알려주세요."); process.exit(1); }
  if (!value) { console.error("할인율이나 금액을 못 찾았습니다. (예: 3.5% / 2,000원)"); process.exit(1); }

  const entry = buildEntry(db, text, app, merchant, value);
  list.push(entry);
  await saveStore(list);

  const v = entry.kind === "rate" ? Number((entry.rate * 100).toFixed(2)) + "%" : entry.amount.toLocaleString("ko-KR") + "원";
  console.log(`등록했습니다 — [${db.apps[app].name}] ${merchant.name} ${v} ${entry.benefitType}`);
  if (entry.kind === "rate" && !entry.cap) {
    console.log("한도를 모르면 금액이 커질수록 과대평가됩니다. 화면에는 '한도 미확인'으로 표시하고,");
    console.log("한도를 알면 --cap 10000 처럼 다시 등록해 주세요.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
