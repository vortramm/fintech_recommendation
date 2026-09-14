/**
 * 소스별 전용 파서
 *
 * 수집기가 받은 JSON 응답을 이 파일의 함수에 넘겨 혜택 객체로 바꿉니다.
 * sources.json 의 `parser: "samsung-link"` 처럼 이름으로 연결합니다.
 *
 * 각 파서는 { structured, raw } 를 돌려줍니다.
 *   structured  가맹점 · 금액 · 조건까지 확실히 읽어낸 것 → 순위 계산에 들어갑니다.
 *   raw         값이 있어도 한도를 모르는 것(예: 한도 없는 "40%") → 공지로만 띄웁니다.
 *               모르는 한도를 0 으로 두면 순위가 통째로 뒤집히므로 계산에 넣지 않습니다.
 */

const won = (n) => Math.round(n).toLocaleString("ko-KR") + "원";

/* "5만원" "12,000원" "3천원" "1만" → 숫자 */
export function parseWon(text) {
  if (text == null) return null;
  const t = String(text).replace(/\s/g, "");
  let m = t.match(/([\d,.]+)\s*만/);
  if (m) return Math.round(parseFloat(m[1].replace(/,/g, "")) * 10000);
  m = t.match(/([\d,.]+)\s*천/);
  if (m) return Math.round(parseFloat(m[1].replace(/,/g, "")) * 1000);
  m = t.match(/([\d,]+)\s*원/);
  if (m) return parseInt(m[1].replace(/,/g, ""), 10);
  return null;
}

export function parsePercent(text) {
  const m = String(text == null ? "" : text).match(/([\d.]+)\s*%/);
  return m ? parseFloat(m[1]) / 100 : null;
}

/* "5만원 이상 결제 시" → 50000 · "4/5/8만원 이상" → 40000 (가장 낮은 문턱) */
export function parseMinAmount(text) {
  if (!text) return null;
  const t = String(text).replace(/\s/g, "");
  const multi = t.match(/([\d/]+)만원?이상/);
  if (multi && multi[1].includes("/")) {
    const lowest = multi[1].split("/").map(Number).filter(Boolean).sort((a, b) => a - b)[0];
    if (lowest) return lowest * 10000;
  }
  const m = t.match(/([\d,.]+\s*(?:만|천)?원?)이상/);
  return m ? parseWon(m[1]) : null;
}

/* "20260909" → "9.9" */
function shortDate(yyyymmdd) {
  const s = String(yyyymmdd || "");
  if (!/^\d{8}$/.test(s)) return null;
  return Number(s.slice(4, 6)) + "." + Number(s.slice(6, 8));
}
function period(start, end) {
  const a = shortDate(start), b = shortDate(end);
  return a && b ? a + "~" + b : null;
}
function expired(end, today) {
  const s = String(end || "");
  if (!/^\d{8}$/.test(s)) return false;
  return s < today;
}

/* 캠페인 제목에서 가맹점 이름만 남깁니다
   "[9/16 단 하루] 대웅제약몰 LINK Day| " → "대웅제약몰" */
export function cleanMerchantName(raw) {
  let s = String(raw || "").replace(/\|.*$/, "");
  s = s.replace(/\[[^\]]*\]/g, " ");
  s = s.replace(/LINK\s*Day|링크\s*데이|단\s*하루|기획전|이벤트|프로모션/gi, " ");
  s = s.replace(/\d+\s*[월/]\s*\d+\s*일?/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/* 설명 HTML 에서 글자만 남깁니다 */
export function stripHtml(raw) {
  return String(raw || "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* "일 한도 2만원" "최대 1만원" → 20000 / 10000 */
export function parseCap(text) {
  const t = stripHtml(text);
  const m = t.match(/(?:일|월|건당)?\s*한도\s*([\d,.]+\s*(?:만|천)?\s*원)/) ||
            t.match(/최대\s*([\d,.]+\s*(?:만|천)?\s*원)/);
  return m ? parseWon(m[1]) : null;
}

/* "기간 내 1일 1회" → "1일 1회" */
export function parseUsage(text) {
  const m = stripHtml(text).match(/기간\s*내\s*([^,.)]{1,12}회)/);
  return m ? m[1].trim() : null;
}

const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

/* ── 삼성카드 LINK ────────────────────────────────────────
   apis.samsungcard.com/svc-link/not-logged-in/link
   linkSvMaiEvnNm 캠페인명 · linkSvFvrDvCn 혜택값("40%" / "7,000원" / "최대 2만 모니머니") */
export function samsungLink(rows, src) {
  const structured = [], raw = [], now = today();

  for (const row of rows) {
    const name = cleanMerchantName(row.linkSvMaiEvnNm || row.cmpTitNm);
    const value = String(row.linkSvFvrDvCn || "").trim();
    if (!name || !value) continue;
    if (expired(row.linkSvFvrEnddt, now)) continue;

    const prd = period(row.linkSvFvrStrtdt, row.linkSvFvrEnddt);
    const isPoint = /모니머니|포인트|적립/.test(value);
    const pct = parsePercent(value);
    const won = parseWon(value);

    if (won) {
      /* "최대 1만원" 형태 — 받을 수 있는 최대 금액이므로 정액 상한으로 봅니다 */
      structured.push({
        scope: "merchant", merchantName: name, app: src.app,
        kind: "fixed", amount: won,
        benefitType: isPoint ? "적립" : "할인",
        condition: "삼성카드 앱에서 LINK 혜택 링크 후 결제",
        monthlyCap: prd || undefined,
        source: src.id
      });
    } else if (pct) {
      /* 퍼센트만 있고 한도를 모릅니다 — 계산에 넣지 않고 공지로 띄웁니다 */
      raw.push({
        app: src.app, source: src.id, sourceName: src.program || src.name,
        title: name + " " + value + (isPoint ? " 적립" : " 할인") + " (한도는 앱에서 확인)",
        url: src.url, period: prd, percent: pct * 100, won: null
      });
    }
  }
  return { structured, raw };
}

/* ── 우리카드 꾹 ─────────────────────────────────────────
   m.wooricard.com/.../retrieveBnfMainList.pwkjson
   mchNm 가맹점 · rqDcAm 할인금액 · rqDcRt 할인율 · bnfCndTxt "5만원 이상 결제 시" */
export function wooriKkook(rows, src) {
  const structured = [], raw = [], now = today();

  for (const row of rows) {
    const name = String(row.mchNm || "").trim();
    if (!name) continue;
    if (expired(row.svcCdEdt, now)) continue;

    const prd = period(row.svcCdSdt, row.svcCdEdt);
    const min = parseMinAmount(row.bnfCndTxt);
    const title = String(row.evntTitl || "").trim();
    const isPoint = /포인트|적립|머니/.test(title);
    const amount = Number(row.rqDcAm) || null;
    const rate = Number(row.rqDcRt) || null;
    const detail = row.useAdvCont;
    const cap = parseCap(title) || parseCap(detail);
    const usage = parseUsage(detail);
    const limits = [prd, usage].filter(Boolean).join(" · ") || undefined;

    if (amount) {
      structured.push({
        scope: "merchant", merchantName: name, app: src.app,
        kind: "fixed", amount,
        minAmount: min || undefined,
        benefitType: isPoint ? "적립" : "할인",
        condition: "우리카드 앱에서 '꾹' 혜택 담은 뒤 결제" + (row.bnfCndTxt ? " · " + String(row.bnfCndTxt).trim() : ""),
        monthlyCap: limits,
        source: src.id
      });
      continue;
    }

    if (rate) {
      /* 한도를 못 찾은 할인율은 계산에 넣지 않습니다 — 25% 무제한으로 잡히면 순위가 망가집니다 */
      if (!cap) {
        raw.push({
          app: src.app, source: src.id, sourceName: src.program || src.name,
          title: name + " " + rate + "% " + (isPoint ? "적립" : "할인") + " (한도는 앱에서 확인)",
          url: row.usplcUrlAd || src.url, period: prd, percent: rate, won: null
        });
        continue;
      }
      structured.push({
        scope: "merchant", merchantName: name, app: src.app,
        kind: "rate", rate: rate > 1 ? rate / 100 : rate,
        cap,
        minAmount: min || undefined,
        benefitType: isPoint ? "적립" : "할인",
        condition: "우리카드 앱에서 '꾹' 혜택 담은 뒤 결제" + (row.bnfCndTxt ? " · " + String(row.bnfCndTxt).trim() : ""),
        monthlyCap: limits,
        source: src.id
      });
      continue;
    }

    /* 금액도 율도 없으면 제목에 적힌 최대 금액만 공지로 */
    if (title) {
      raw.push({
        app: src.app, source: src.id, sourceName: src.program || src.name,
        title: name + " " + title + (row.bnfCndTxt ? " (" + String(row.bnfCndTxt).trim() + ")" : ""),
        url: row.usplcUrlAd || src.url, period: prd,
        percent: null, won: parseWon(title)
      });
    }
  }
  return { structured, raw };
}

/* 컬럼별 배열로 내려오는 응답을 행 객체로 바꿉니다
   { 이름: ["A","B"], 값: [1,2] } → [{이름:"A",값:1},{이름:"B",값:2}] */
export function zipColumns(obj) {
  const keys = Object.keys(obj).filter((k) => Array.isArray(obj[k]));
  if (!keys.length) return [];
  const n = Math.max(...keys.map((k) => obj[k].length));
  const rows = [];
  for (let i = 0; i < n; i++) {
    const row = {};
    for (const k of keys) row[k] = obj[k][i];
    rows.push(row);
  }
  return rows;
}

/* ── 신한 마이샵 · 쿠폰 목록 (MOBFM501R21) ───────────────
   가맹점(SSG_NM) · 할인금액(MCT_PLF_OFF_AT) · 할인율(MCT_PLF_OFF_RAT)
   · 최소결제(MCT_PLF_OFF_EF_MIN_TS_AT) · 기간(MCT_PLF_MO_STD~EDD) */
export function shinhanMyshopCoupon(body, src) {
  const grid = body && body.mbw_json && body.mbw_json.mbw_message && body.mbw_json.mbw_message.GRID1;
  if (!grid) return { structured: [], raw: [] };

  const structured = [], raw = [], now = today();
  for (const row of zipColumns(grid)) {
    const name = String(row.SSG_NM || "").replace(/\[[^\]]*\]/g, "").trim();
    if (!name) continue;
    if (expired(row.MCT_PLF_MO_EDD, now)) continue;

    const amount = parseInt(String(row.MCT_PLF_OFF_AT || "0").replace(/[^0-9]/g, ""), 10) || null;
    const rate = parseFloat(row.MCT_PLF_OFF_RAT || "0") || null;
    /* 최소금액이 1원 같은 값이면 사실상 제한이 없는 것이라 표시하지 않습니다 */
    const minRaw = parseInt(String(row.MCT_PLF_OFF_EF_MIN_TS_AT || "0").replace(/[^0-9]/g, ""), 10) || 0;
    const min = minRaw >= 100 ? minRaw : null;
    const prd = period(row.MCT_PLF_MO_STD, row.MCT_PLF_MO_EDD);
    const title = String(row.MCT_CRD_SV_RG_TT || "");
    const isPoint = /포인트|적립/.test(title);
    const condition = "신한 SOL페이에서 마이샵 '혜택 ON' 후 결제" + (min ? " · " + won(min) + " 이상" : "");

    if (amount) {
      structured.push({
        scope: "merchant", merchantName: name, app: src.app,
        kind: "fixed", amount, minAmount: min || undefined,
        benefitType: isPoint ? "적립" : "할인",
        condition, monthlyCap: prd || undefined, source: src.id
      });
    } else if (rate) {
      const cap = parseCap(title);
      if (cap) {
        structured.push({
          scope: "merchant", merchantName: name, app: src.app,
          kind: "rate", rate: rate > 1 ? rate / 100 : rate, cap,
          minAmount: min || undefined,
          benefitType: isPoint ? "적립" : "할인",
          condition, monthlyCap: prd || undefined, source: src.id
        });
      } else {
        raw.push({
          app: src.app, source: src.id, sourceName: src.program || src.name,
          title: name + " " + rate + "% " + (isPoint ? "적립" : "할인") + " (한도는 앱에서 확인)",
          url: src.url, period: prd, percent: rate, won: null
        });
      }
    }
  }
  return { structured, raw };
}

/* ── 신한 마이샵 · 추천 목록 (MOBFM501R81) ───────────────
   rcmCotList_N 아래 브랜드명(rcmCotFstXpoTt)과 혜택 표기(rcmCotSecXpoTt)가 짝으로 옵니다 */
export function shinhanMyshopList(body, src) {
  const msg = body && body.mbw_json && body.mbw_json.mbw_message;
  if (!msg) return { structured: [], raw: [] };

  const structured = [], raw = [];
  for (const key of Object.keys(msg)) {
    if (!/^rcmCotList/.test(key)) continue;
    const group = msg[key];
    const names = group.rcmCotFstXpoTt || [];
    const values = group.rcmCotSecXpoTt || [];
    for (let i = 0; i < names.length; i++) {
      const name = String(names[i] || "").trim();
      const value = String(values[i] || "").trim();
      if (!name || !value) continue;
      const isPoint = /포인트|적립/.test(value);
      const won_ = parseWon(value);
      const pct = parsePercent(value);
      if (won_) {
        structured.push({
          scope: "merchant", merchantName: name, app: src.app,
          kind: "fixed", amount: won_,
          benefitType: isPoint ? "적립" : "할인",
          condition: "신한 SOL페이에서 마이샵 '혜택 ON' 후 결제",
          source: src.id
        });
      } else if (pct) {
        raw.push({
          app: src.app, source: src.id, sourceName: src.program || src.name,
          title: name + " " + value + " (한도는 앱에서 확인)",
          url: src.url, period: null, percent: pct * 100, won: null
        });
      }
    }
  }
  return { structured, raw };
}

export const PARSERS = {
  "samsung-link": { match: "/svc-link/not-logged-in/link", path: "payload.listLinkSvOjInqrVO", run: samsungLink },
  "woori-kkook": { match: "retrieveBnfMainList", path: "bnfMainList", run: wooriKkook },
  /* 같은 모양의 카테고리 목록도 같은 파서로 읽습니다 */
  "woori-kkook-etc": { match: "selectEtcCtgrList", path: "bnfMainList", run: wooriKkook },
  /* 컬럼별 배열로 내려와 응답 전체를 넘깁니다 */
  "shinhan-myshop-coupon": { match: "MOBFM501R21", body: true, run: shinhanMyshopCoupon },
  "shinhan-myshop-list": { match: "MOBFM501R81", body: true, run: shinhanMyshopList }
};
