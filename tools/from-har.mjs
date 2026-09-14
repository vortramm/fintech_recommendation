#!/usr/bin/env node
/**
 * HAR → sources.json 매핑 만들기
 *
 * 앱이나 모바일 웹에서 혜택 화면을 한 번 띄우고 트래픽을 HAR 로 저장한 뒤 이 도구에 넘기면,
 * 혜택 목록처럼 생긴 JSON 응답을 찾아 data/sources.json 에 넣을 pick 매핑을 만들어 줍니다.
 *
 *   node tools/from-har.mjs capture.har                      후보만 출력
 *   node tools/from-har.mjs capture.har --write samsung-link  1순위 후보를 그 소스에 반영
 *   node tools/from-har.mjs --selftest                        픽스처로 동작 점검
 *
 * HAR 만드는 법은 docs/find-app-endpoints.md 를 보세요.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const SELFTEST = args.includes("--selftest");
const WRITE = args.indexOf("--write") === -1 ? null : args[args.indexOf("--write") + 1];
const HAR = args.find((a) => !a.startsWith("--") && a !== WRITE);

/* 필드 이름으로 역할을 추측합니다 — 카드사 API 가 쓰는 약어들을 모아 둔 것 */
const GUESS = {
  merchantName: /mcht|merch|shop|store|brand|partner|affl|가맹|제휴|상호|브랜드/i,
  rate: /(dc|disc|save|point|accm).*(rt|rate)$|^rt$|^rate$|율/i,
  cap: /max|limit|ceil|한도|최대/i,
  minAmount: /min.*(amt|amount|pay)|최소|이상/i,
  fixed: /(dc|disc|save).*(amt|amount)|할인금액|정액/i,
  period: /prd|period|term|start|end|기간|일자/i,
  title: /(benf|bnf|evt|event|title|nm|name)/i
};

const looksBenefity = (json) =>
  /할인|적립|캐시백|쿠폰|혜택|가맹|discount|cashback|benefit|mcht/i.test(json);

function findArrays(node, path, out) {
  if (Array.isArray(node)) {
    if (node.length >= 2 && node[0] && typeof node[0] === "object" && !Array.isArray(node[0])) {
      out.push({ path: path || "(root)", rows: node.length, sample: node[0] });
    }
    return out;
  }
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) findArrays(node[k], path ? path + "." + k : k, out);
  }
  return out;
}

function guessMap(sample) {
  const keys = Object.keys(sample);
  const map = {};
  for (const role of Object.keys(GUESS)) {
    const hit = keys.find((k) => GUESS[role].test(k));
    if (hit) map[role] = hit;
  }
  /* 이름과 값이 모두 있어야 쓸 만한 매핑입니다 */
  if (!map.merchantName) return null;
  if (!map.rate && !map.fixed) return null;
  if (map.rate && map.fixed) delete map.fixed;
  delete map.title;
  return map;
}

function scoreCandidate(c) {
  let s = Math.min(c.rows, 50);
  if (c.map.cap) s += 15;
  if (c.map.minAmount) s += 15;
  if (c.map.period) s += 10;
  if (looksBenefity(JSON.stringify(c.sample))) s += 30;
  return s;
}

function analyze(har) {
  const candidates = [];
  for (const entry of (har.log && har.log.entries) || []) {
    const res = entry.response || {};
    const content = res.content || {};
    const mime = content.mimeType || "";
    if (!/json/i.test(mime)) continue;
    let body = content.text;
    if (!body) continue;
    if (content.encoding === "base64") body = Buffer.from(body, "base64").toString("utf8");
    if (!looksBenefity(body)) continue;
    let parsed;
    try { parsed = JSON.parse(body); } catch { continue; }

    for (const arr of findArrays(parsed, "", [])) {
      const map = guessMap(arr.sample);
      if (!map) continue;
      const url = (entry.request && entry.request.url) || "";
      candidates.push({
        url,
        match: url.split("?")[0].split("/").slice(-2).join("/"),
        path: arr.path,
        rows: arr.rows,
        map,
        sample: arr.sample
      });
    }
  }
  return candidates.map((c) => ({ ...c, score: scoreCandidate(c) })).sort((a, b) => b.score - a.score);
}

function render(c, i) {
  return [
    `${i + 1}. ${c.url}`,
    `   path: ${c.path} (${c.rows}행)  score: ${c.score}`,
    `   pick: ${JSON.stringify({ match: "/" + c.match, path: c.path, map: c.map })}`,
    `   sample: ${JSON.stringify(c.sample).slice(0, 220)}`
  ].join("\n");
}

async function selftest() {
  const har = JSON.parse(await readFile(join(ROOT, "tools/fixtures/sample-capture.har"), "utf8"));
  const found = analyze(har);
  found.slice(0, 3).forEach((c, i) => console.log(render(c, i)));
  const top = found[0];
  const ok = top && top.path === "data.benefitList" &&
    top.map.merchantName === "mchtNm" && top.map.rate === "dcRt" &&
    top.map.cap === "maxDcAmt" && top.map.minAmount === "minPayAmt";
  console.log(ok
    ? "\n자체 점검 통과 — 혜택 목록 응답을 찾아 매핑까지 추측했습니다."
    : "\n자체 점검 실패");
  process.exit(ok ? 0 : 1);
}

async function main() {
  if (SELFTEST) return selftest();
  if (!HAR) {
    console.error("사용법: node tools/from-har.mjs <capture.har> [--write <source-id>]");
    process.exit(1);
  }
  const har = JSON.parse(await readFile(HAR, "utf8"));
  const found = analyze(har);
  if (!found.length) {
    console.log("혜택 목록처럼 보이는 JSON 응답을 못 찾았습니다.");
    console.log("· 앱이 인증서 피닝으로 캡처를 막았거나, 목록이 로그인 뒤에만 내려오는 경우입니다.");
    console.log("· docs/find-app-endpoints.md 의 다음 단계를 보세요.");
    return;
  }
  console.log(`후보 ${found.length}건 (점수순)\n`);
  found.slice(0, 8).forEach((c, i) => console.log(render(c, i) + "\n"));

  if (!WRITE) {
    console.log("반영하려면: node tools/from-har.mjs " + HAR + " --write <source-id>");
    return;
  }

  const path = join(ROOT, "data/sources.json");
  const reg = JSON.parse(await readFile(path, "utf8"));
  const target = [].concat(reg.programs, reg.public).find((s) => s.id === WRITE);
  if (!target) {
    console.error(`data/sources.json 에 id "${WRITE}" 가 없습니다.`);
    process.exit(1);
  }
  const top = found[0];
  target.pick = { match: "/" + top.match, path: top.path, map: top.map };
  target.catalogUrl = target.catalogUrl || top.url;
  target.collect = true;
  await writeFile(path, JSON.stringify(reg, null, 2) + "\n");
  console.log(`\n"${WRITE}" 에 pick 매핑을 넣었습니다. 이제 npm run collect 를 돌리면 반영됩니다.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
