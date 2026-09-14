/* 결제처별 할인 앱 찾기 — 계산 · 렌더링 */
(function () {
  "use strict";

  var DB = window.DISCOUNT_DB;
  var FEED = window.DISCOUNT_FEED || null;   /* tools/collect.mjs 가 만든 자동 수집 결과 */
  var STORE_KEY = "pay-discount:owned-apps";

  /* 자동 수집으로 구조까지 읽어낸 혜택은 번들 데이터와 같은 자격으로 순위에 넣습니다. */
  var ALL_BENEFITS = DB.benefits.concat(
    (FEED && FEED.structured ? FEED.structured : []).map(function (b) {
      var copy = {};
      for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) copy[k] = b[k];
      copy.origin = "feed";
      return copy;
    })
  );

  /* ── 포맷 ─────────────────────────────────────────────── */
  function won(n) { return Math.round(n).toLocaleString("ko-KR") + "원"; }
  function num(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function pct(r) {
    var v = r * 100;
    var s = v >= 10 ? v.toFixed(1) : v.toFixed(2);
    return s.replace(/\.?0+$/, "") + "%";
  }
  function manwon(n) {
    if (n >= 10000) return (Math.round((n / 10000) * 10) / 10) + "만원";
    return num(n) + "원";
  }
  function axisLabel(n) {
    if (n === 0) return "0";
    if (n >= 10000) return (Math.round((n / 10000) * 10) / 10) + "만";
    return num(n);
  }
  function josaSuffix(word, pair) {
    var parts = pair.split("/");
    var code = word.charCodeAt(word.length - 1);
    var hasFinal = code >= 0xAC00 && code <= 0xD7A3 ? (code - 0xAC00) % 28 > 0 : false;
    return hasFinal ? parts[0] : parts[1];
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* 한글 초성 — "ㅋㄹ" 로도 크림이 검색되게 */
  var CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  function chosung(str) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      out += (c >= 0xAC00 && c <= 0xD7A3) ? CHO[Math.floor((c - 0xAC00) / 588)] : str[i];
    }
    return out;
  }
  function isChosungQuery(q) {
    return q.length > 0 && /^[ㄱ-ㅎ]+$/.test(q);
  }

  /* ── 혜택 한 건 계산 ──────────────────────────────────── */
  function evaluate(benefit, amount) {
    var res = {
      benefit: benefit,
      app: DB.apps[benefit.app],
      eligible: true,
      reason: "",
      discount: 0,
      rate: 0,
      capped: false,
      formula: ""
    };

    if (benefit.minAmount && amount < benefit.minAmount) {
      res.eligible = false;
      res.reason = "최소 결제금액 " + won(benefit.minAmount) + " 미달";
      return res;
    }

    var raw = 0;
    if (benefit.kind === "rate") {
      raw = Math.floor(amount * benefit.rate);
      res.formula = num(amount) + " × " + pct(benefit.rate) + " = " + won(raw);
    } else if (benefit.kind === "fixed") {
      raw = benefit.amount;
      res.formula = "정액 " + won(benefit.amount);
    } else if (benefit.kind === "tiered") {
      var tier = benefit.tiers.slice().sort(function (a, b) { return b.min - a.min; })
        .filter(function (t) { return amount >= t.min; })[0];
      if (!tier) {
        var lowest = benefit.tiers.reduce(function (a, b) { return a.min < b.min ? a : b; });
        res.eligible = false;
        res.reason = "최소 결제금액 " + won(lowest.min) + " 미달";
        return res;
      }
      raw = tier.amount;
      res.formula = won(tier.min) + " 이상 구간 → " + won(tier.amount);
    }

    var discount = raw;
    if (benefit.cap != null && discount > benefit.cap) {
      discount = benefit.cap;
      res.capped = true;
      res.formula += " → 한도 " + won(benefit.cap) + " 적용";
    }
    if (discount > amount) discount = amount;

    res.discount = discount;
    res.rate = amount > 0 ? discount / amount : 0;
    return res;
  }

  /* 금액을 모를 때 보여줄 최대 할인 규모 */
  function ceilingOf(b) {
    if (b.cap != null) return b.cap;
    if (b.kind === "fixed") return b.amount;
    if (b.kind === "tiered") {
      return b.tiers.reduce(function (m, t) { return Math.max(m, t.amount); }, 0);
    }
    return Infinity;
  }

  /* ── 결제처 해석 ──────────────────────────────────────── */
  function merchantById(id) {
    return DB.merchants.filter(function (m) { return m.id === id; })[0];
  }
  function categoryName(id) {
    return DB.categories[id] ? DB.categories[id].name : id;
  }

  function searchMerchants(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    var cho = isChosungQuery(q);
    var scored = [];
    DB.merchants.forEach(function (m) {
      var names = [m.name].concat(m.aliases || []);
      var best = -1;
      names.forEach(function (n) {
        var low = n.toLowerCase();
        var hit = cho ? (chosung(low).indexOf(q) === 0 ? 1 : chosung(low).indexOf(q) > 0 ? 2 : -1)
                      : (low === q ? 0 : low.indexOf(q) === 0 ? 1 : low.indexOf(q) > 0 ? 2 : -1);
        if (hit >= 0 && (best === -1 || hit < best)) best = hit;
      });
      if (best === -1 && !cho && categoryName(m.category).toLowerCase().indexOf(q) !== -1) best = 3;
      if (best >= 0) scored.push({ m: m, score: best });
    });
    scored.sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score;
      return a.m.name.localeCompare(b.m.name, "ko");
    });
    return scored.map(function (s) { return s.m; });
  }

  /* ── 혜택 모으기 · 순위 ───────────────────────────────── */
  function candidates(ctx) {
    return ALL_BENEFITS.filter(function (b) {
      if (b.funding === "prepaid") return false;               /* 현금성(머니 충전) 결제 제외 */
      if (b.scope === "merchant") return ctx.merchantId === b.merchant;
      return b.category === ctx.category;
    });
  }

  function rankAll(ctx, amount, owned) {
    var rows = candidates(ctx)
      .filter(function (b) { return !owned || owned.indexOf(b.app) !== -1; })
      .map(function (b) { return evaluate(b, amount); });

    var weight = function (r) { return r.benefit.benefitType === "할인" ? 0 : 1; };

    var eligible = rows.filter(function (r) { return r.eligible; }).sort(function (a, b) {
      if (b.discount !== a.discount) return b.discount - a.discount;
      if (weight(a) !== weight(b)) return weight(a) - weight(b);
      return a.app.name.localeCompare(b.app.name, "ko");
    });
    var blocked = rows.filter(function (r) { return !r.eligible; }).sort(function (a, b) {
      return (a.benefit.minAmount || 0) - (b.benefit.minAmount || 0);
    });
    return { eligible: eligible, blocked: blocked, total: rows.length };
  }

  function switchPoints(ctx, owned, maxAmount) {
    var step = Math.max(1000, Math.round(maxAmount / 300 / 1000) * 1000);
    var points = [], prev = null;
    for (var a = step; a <= maxAmount; a += step) {
      var top = rankAll(ctx, a, owned).eligible[0];
      var id = top ? top.benefit.app + ":" + top.benefit.condition : null;
      if (id && prev && id !== prev.id) points.push({ amount: a, from: prev.win, to: top });
      if (id) prev = { id: id, win: top };
    }
    return points;
  }

  /* ── 상태 ─────────────────────────────────────────────── */
  var state = {
    merchantId: null,
    custom: null,        /* { name, category } — 목록에 없는 결제처를 직접 입력한 경우 */
    pendingQuery: null,  /* 업종 선택을 기다리는 검색어 */
    amount: null,
    onlyOwned: false,
    owned: []
  };

  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && Array.isArray(saved.owned)) {
      state.owned = saved.owned;
      state.onlyOwned = !!saved.onlyOwned;
    }
  } catch (e) { /* 저장소를 못 읽어도 기본값으로 동작합니다 */ }

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ owned: state.owned, onlyOwned: state.onlyOwned }));
    } catch (e) { /* 무시 */ }
  }

  function ownedFilter() {
    return state.onlyOwned && state.owned.length ? state.owned : null;
  }

  function context() {
    if (state.merchantId) {
      var m = merchantById(state.merchantId);
      return { name: m.name, category: m.category, merchantId: m.id, custom: false };
    }
    if (state.custom) {
      return { name: state.custom.name, category: state.custom.category, merchantId: null, custom: true };
    }
    return null;
  }

  /* ── DOM ──────────────────────────────────────────────── */
  var $ = function (s) { return document.querySelector(s); };
  var el = {
    search: $("#merchant-search"),
    suggest: $("#merchant-suggest"),
    picked: $("#merchant-picked"),
    fallback: $("#category-fallback"),
    examples: $("#merchant-examples"),
    amount: $("#amount"),
    presets: $("#amount-presets"),
    onlyOwned: $("#only-owned"),
    appChips: $("#app-chips"),
    results: $("#results"),
    stampDate: $("#stamp-date"),
    stampCount: $("#stamp-count"),
    feedStatus: $("#feed-status")
  };

  /* 검색 드롭다운 */
  function renderSuggest(q, open) {
    if (!open || !q.trim()) { el.suggest.hidden = true; el.suggest.innerHTML = ""; return; }
    var list = searchMerchants(q).slice(0, 10);
    var html = list.map(function (m) {
      var n = candidates({ merchantId: m.id, category: m.category }).length;
      return '<li><button type="button" data-id="' + m.id + '">' +
        "<span>" + esc(m.name) + "</span>" +
        '<span class="cat">' + esc(categoryName(m.category)) + " · 혜택 " + n + "건</span>" +
        "</button></li>";
    }).join("");
    html += '<li><button type="button" class="custom" data-custom="1">' +
      '<span>“' + esc(q.trim()) + '” 직접 입력</span>' +
      '<span class="cat">업종을 고르면 비교됩니다</span></button></li>';
    el.suggest.innerHTML = html;
    el.suggest.hidden = false;
  }

  /* 고른 결제처 표시 */
  function renderPicked() {
    var ctx = context();
    if (!ctx) { el.picked.hidden = true; el.picked.innerHTML = ""; return; }
    el.picked.innerHTML =
      "<div>" +
        '<div class="picked-name">' + esc(ctx.name) + "</div>" +
        '<div class="picked-cat">' + esc(categoryName(ctx.category)) +
          (ctx.custom ? " · 직접 입력" : "") + "</div>" +
      "</div>" +
      '<button type="button" class="linkish" id="clear-merchant">바꾸기</button>';
    el.picked.hidden = false;
  }

  /* 업종 고르기 (목록에 없는 결제처) */
  function renderFallback() {
    if (!state.pendingQuery) { el.fallback.hidden = true; el.fallback.innerHTML = ""; return; }
    el.fallback.innerHTML =
      "<p><b>“" + esc(state.pendingQuery) + "”</b>" +
      josaSuffix(state.pendingQuery, "은/는") + " 아직 목록에 없어요. 업종을 고르면 그 업종 혜택으로 비교합니다.</p>" +
      '<div class="chips">' + Object.keys(DB.categories).map(function (c) {
        return '<button type="button" class="chip" data-cat="' + c + '">' +
          esc(DB.categories[c].name) + "</button>";
      }).join("") + "</div>";
    el.fallback.hidden = false;
  }

  function renderExamples() {
    var ids = ["kream", "coupang", "baemin", "starbucks", "netflix", "oliveyoung"];
    el.examples.innerHTML = ids.map(function (id) {
      var m = merchantById(id);
      return '<button type="button" class="chip" data-id="' + id + '">' + esc(m.name) + "</button>";
    }).join("");
  }

  function renderAppChips() {
    el.appChips.innerHTML = Object.keys(DB.apps).map(function (id) {
      return '<button type="button" class="chip" data-app="' + id + '" aria-pressed="' +
        (state.owned.indexOf(id) !== -1) + '">' +
        esc(DB.apps[id].name.replace(/\s*\(.*\)/, "")) + "</button>";
    }).join("");
  }

  /* ── 결과 조각 ────────────────────────────────────────── */
  function originTag(b) {
    return b.origin === "feed" ? '<span class="tag feed">자동 수집</span>' : "";
  }

  function scopeTag(b) {
    return b.scope === "merchant"
      ? '<span class="tag scope-merchant">가맹점 전용</span>'
      : '<span class="tag scope-category">' + esc(categoryName(b.category)) + " 업종</span>";
  }

  function metaTags(r) {
    var b = r.benefit;
    var t = [scopeTag(b), originTag(b),
      '<span class="tag type-' + b.benefitType + '">' + b.benefitType + "</span>"].filter(Boolean);
    if (r.capped) t.push('<span class="tag capped">한도 도달</span>');
    else if (b.cap != null) t.push('<span class="tag">한도 ' + won(b.cap) + "</span>");
    if (b.minAmount) t.push('<span class="tag">' + won(b.minAmount) + " 이상</span>");
    if (b.monthlyCap) t.push('<span class="tag">' + esc(b.monthlyCap) + "</span>");
    return '<div class="meta">' + t.join("") + "</div>";
  }

  function renderWinner(r, amount, runnerUp) {
    return '<section class="winner" aria-labelledby="winner-name">' +
      '<div class="winner-top">' +
        "<div>" +
          '<div class="winner-badge">가장 많이 깎이는 앱</div>' +
          '<div class="winner-name" id="winner-name">' + esc(r.app.name) + "</div>" +
        "</div>" +
        '<div class="winner-figure">' +
          '<div class="save">' + num(r.discount) + "<span>원</span></div>" +
          '<div class="rate">실질 ' + pct(r.rate) + " · " + esc(r.benefit.benefitType) +
            " · 낼 금액 " + won(amount - r.discount) + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="winner-body">' +
        '<div class="calc">' + esc(r.formula) + "</div>" +
        "<p>" + esc(r.benefit.condition) +
          (runnerUp ? " · 2위 " + esc(runnerUp.app.name) + "보다 " +
            won(r.discount - runnerUp.discount) + " 더 아낍니다." : "") + "</p>" +
        metaTags(r) +
        (r.benefit.note ? '<p class="gap">' + esc(r.benefit.note) + "</p>" : "") +
      "</div>" +
    "</section>";
  }

  function renderRow(r, rank, top) {
    var gap = top ? top.discount - r.discount : 0;
    return '<li class="rank-row">' +
      '<div class="rank">' + rank + "</div>" +
      '<div class="who">' +
        '<div class="app-name">' + esc(r.app.name) + "</div>" +
        '<div class="cond">' + esc(r.benefit.condition) + "</div>" +
        metaTags(r) +
      "</div>" +
      '<div class="figure">' +
        '<div class="amt">' + won(r.discount) + "</div>" +
        '<div class="rate">' + pct(r.rate) + (gap > 0 ? " · −" + num(gap) : "") + "</div>" +
      "</div>" +
    "</li>";
  }

  function renderBlocked(r) {
    return '<li class="rank-row out">' +
      '<div class="rank">–</div>' +
      '<div class="who">' +
        '<div class="app-name">' + esc(r.app.name) + "</div>" +
        '<div class="reason">' + esc(r.reason) + "</div>" +
        metaTags(r) +
      "</div>" +
      '<div class="figure"><div class="amt">조건 미충족</div></div>' +
    "</li>";
  }

  /* 금액을 아직 안 넣었을 때 — 혜택 목록만 */
  function renderPreview(ctx) {
    var list = candidates(ctx)
      .filter(function (b) { var o = ownedFilter(); return !o || o.indexOf(b.app) !== -1; })
      .sort(function (a, b) { return ceilingOf(b) - ceilingOf(a); });

    if (!list.length) {
      return '<div class="empty-state">이 업종에 등록된 혜택이 없습니다. ' +
        "<code>data/benefits.js</code> 에 추가해 주세요.</div>";
    }

    return '<section class="list-card">' +
      '<div class="section-title"><h2>' + esc(ctx.name) + "에서 쓸 수 있는 혜택 " + list.length + "건</h2>" +
      '<span class="hint">금액을 넣으면 실제 할인액으로 순위를 매깁니다</span></div>' +
      '<ul class="rank-list">' + list.map(function (b) {
        var head = b.kind === "rate" ? pct(b.rate)
          : b.kind === "fixed" ? won(b.amount) + " 정액"
          : "구간별 정액";
        var ceil = ceilingOf(b);
        return '<li class="rank-row preview">' +
          '<div class="rank">·</div>' +
          '<div class="who">' +
            '<div class="app-name">' + esc(DB.apps[b.app].name) + "</div>" +
            '<div class="cond">' + esc(b.condition) + "</div>" +
            metaTags({ benefit: b, capped: false }) +
          "</div>" +
          '<div class="figure">' +
            '<div class="amt">' + esc(head) + "</div>" +
            '<div class="rate">' + (ceil === Infinity ? "한도 없음" : "최대 " + won(ceil)) + "</div>" +
          "</div>" +
        "</li>";
      }).join("") + "</ul></section>";
  }

  /* 금액대별 할인액 그래프 */
  function renderChart(ctx, amount, series) {
    if (series.length < 2) return "";

    var W = 640, H = 240, padL = 58, padR = 16, padT = 26, padB = 34;
    var maxX = Math.max(100000, Math.ceil((amount * 2) / 50000) * 50000);
    var samples = 60;
    var colors = ["var(--accent)", "var(--ochre)", "var(--warn)"];

    var lines = series.map(function (b) {
      var pts = [];
      for (var i = 0; i <= samples; i++) {
        var x = (maxX / samples) * i;
        var ev = evaluate(b, x);
        pts.push({ x: x, y: ev.eligible ? ev.discount : 0 });
      }
      return { benefit: b, pts: pts };
    });

    var maxY = 0;
    lines.forEach(function (l) { l.pts.forEach(function (p) { if (p.y > maxY) maxY = p.y; }); });
    if (maxY <= 0) return "";
    maxY = Math.ceil(maxY / 1000) * 1000;

    var sx = function (v) { return padL + (v / maxX) * (W - padL - padR); };
    var sy = function (v) { return H - padB - (v / maxY) * (H - padT - padB); };

    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="결제금액에 따른 앱별 할인액 변화">';
    svg += '<text x="0" y="11" font-size="10" font-family="var(--f-body)" fill="var(--muted)">할인액(원)</text>';

    [0, maxY / 2, maxY].forEach(function (t) {
      svg += '<line x1="' + padL + '" y1="' + sy(t) + '" x2="' + (W - padR) + '" y2="' + sy(t) +
        '" stroke="var(--line)" stroke-width="1" fill="none"/>' +
        '<text x="' + (padL - 8) + '" y="' + (sy(t) + 4) + '" text-anchor="end" font-size="11" ' +
        'font-family="var(--f-mono)" fill="var(--muted)">' + num(t) + "</text>";
    });
    [0, maxX * 0.25, maxX * 0.5, maxX * 0.75, maxX].forEach(function (t) {
      svg += '<text x="' + sx(t) + '" y="' + (H - padB + 18) + '" text-anchor="middle" font-size="11" ' +
        'font-family="var(--f-mono)" fill="var(--muted)">' + axisLabel(Math.round(t)) + "</text>";
    });

    lines.forEach(function (l, i) {
      var d = l.pts.map(function (p, idx) {
        return (idx ? "L" : "M") + sx(p.x).toFixed(1) + " " + sy(p.y).toFixed(1);
      }).join(" ");
      svg += '<path d="' + d + '" fill="none" stroke="' + colors[i % colors.length] +
        '" stroke-width="2" stroke-linejoin="round"/>';
    });

    svg += '<line x1="' + sx(amount) + '" y1="' + padT + '" x2="' + sx(amount) + '" y2="' + (H - padB) +
      '" stroke="var(--ink-soft)" stroke-width="1" stroke-dasharray="4 3" fill="none"/>';
    lines.forEach(function (l, i) {
      var ev = evaluate(l.benefit, amount);
      if (!ev.eligible) return;
      svg += '<circle cx="' + sx(amount) + '" cy="' + sy(ev.discount) + '" r="4" fill="' +
        colors[i % colors.length] + '"/>';
    });
    svg += '<text x="' + sx(amount) + '" y="' + (padT - 4) + '" text-anchor="middle" font-size="11" ' +
      'font-family="var(--f-mono)" fill="var(--ink-soft)">' + manwon(amount) + "</text>";
    svg += '<text x="' + (W / 2) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="10" ' +
      'font-family="var(--f-body)" fill="var(--muted)">결제금액(만원)</text>';
    svg += "</svg>";

    var legend = lines.map(function (l, i) {
      return '<span><i style="background:' + colors[i % colors.length] + '"></i>' +
        esc(DB.apps[l.benefit.app].name) + "</span>";
    }).join("");

    var notes = switchPoints(ctx, ownedFilter(), maxX).slice(0, 3).map(function (p) {
      return "<li>" + esc(manwon(p.amount)) + " 이상부터는 <b>" + esc(p.to.app.name) + "</b>" +
        josaSuffix(p.to.app.name, "이/가") + " " + esc(p.from.app.name) + "보다 유리해집니다.</li>";
    }).join("");

    return '<section class="chart-card">' +
      '<div class="section-title"><h2>결제금액이 바뀌면</h2>' +
      '<span class="hint">할인 한도 때문에 금액대별로 1위가 달라집니다</span></div>' +
      '<div class="chart-wrap">' + svg + "</div>" +
      '<div class="legend">' + legend + "</div>" +
      (notes ? '<ul class="switch-notes">' + notes + "</ul>" : "") +
    "</section>";
  }

  /* 자동 수집한 공지 중 지금 보는 결제처와 이름이 겹치는 것 */
  function freshNotices(ctx) {
    if (!FEED || !FEED.raw || !FEED.raw.length) return "";
    var names = [ctx.name];
    var m = ctx.merchantId ? merchantById(ctx.merchantId) : null;
    if (m) names = names.concat(m.aliases || []);
    var hits = FEED.raw.filter(function (item) {
      var t = item.title.toLowerCase();
      return names.some(function (n) { return n && t.indexOf(n.toLowerCase()) !== -1; });
    }).slice(0, 8);
    if (!hits.length) return "";

    return '<section class="list-card">' +
      '<div class="section-title"><h2>요즘 뜬 혜택 공지</h2>' +
      '<span class="hint">자동 수집 · 금액 계산에는 넣지 않았습니다</span></div>' +
      '<ul class="notice-list">' + hits.map(function (i) {
        return "<li>" +
          '<a href="' + esc(i.url) + '" target="_blank" rel="noopener">' + esc(i.title) + "</a>" +
          '<span class="notice-meta">' + esc(DB.apps[i.app] ? DB.apps[i.app].name : i.sourceName) +
          (i.period ? " · " + esc(i.period) : "") + "</span>" +
        "</li>";
      }).join("") + "</ul></section>";
  }

  /* LINK · 마이샵 · 하나PICK · 꾹 처럼 앱에서 켜야 하는 개인화 혜택 */
  function personalPrograms(highlightApps) {
    var list = (FEED && FEED.personal) ? FEED.personal : [];
    if (!list.length) return "";
    var hi = highlightApps || [];
    return '<section class="list-card">' +
      '<div class="section-title"><h2>앱에서 직접 켜야 하는 혜택</h2>' +
      '<span class="hint">개인화 혜택이라 자동으로 가져올 수 없습니다</span></div>' +
      '<p class="program-why">삼성카드 LINK, 신한 마이샵, 하나PICK, 우리 꾹, 페이북 마이태그는 ' +
      "로그인해야 목록이 보이고 사람마다 내용이 달라서, 결제 전에 앱에서 한 번 켜 줘야 적용됩니다." +
      "며칠만 열리는 혜택도 대부분 여기에 뜹니다.</p>" +
      '<ul class="program-list">' + list.map(function (p) {
        var app = DB.apps[p.app];
        var on = hi.indexOf(p.app) !== -1;
        return '<li class="' + (on ? "on" : "") + '">' +
          '<span class="program-app">' + esc(app ? app.name.replace(/\s*\(.*\)/, "") : p.app) + "</span>" +
          '<span class="program-name">' + esc(p.program) + "</span>" +
          (p.url
            ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">열기</a>'
            : '<span class="program-todo">앱에서 확인</span>') +
        "</li>";
      }).join("") + "</ul></section>";
  }

  var FOOTNOTE = '<section class="note-card">' +
    "<b>계산 방식</b> · 할인율 × 결제금액을 구한 뒤 할인 한도와 최소 결제금액을 적용해 실제로 깎이는 " +
    "금액으로 줄을 세웁니다. 같은 금액이면 적립보다 즉시할인을 앞에 둡니다. 월 한도·선착순 여부는 " +
    "계산에 넣지 않고 표시만 하니 앱에서 남은 횟수를 확인하세요. " +
    "머니 충전·선불 잔액 같은 <b>현금성 결제 혜택은 비교에서 제외</b>하고 카드 결제만 다룹니다.<br>" +
    "<b>데이터</b> · 기본값은 <code>data/benefits.js</code>, 자동 수집분은 <code>data/feed.js</code> 에 " +
    "들어갑니다. 수집은 <code>tools/collect.mjs</code> 가 하고 GitHub Actions 가 하루 네 번 돌립니다." +
  "</section>";

  function renderEmpty() {
    return '<div class="hero-empty">' +
      "<h2>결제할 곳을 입력해 보세요</h2>" +
      "<p>등록된 결제처면 그 가맹점 전용 제휴까지, 없는 곳이면 업종을 골라 " +
      "그 업종에 걸린 카드사앱·핀테크앱 혜택을 비교합니다.</p>" +
      '<div class="steps">' +
        "<div><b>1</b> 결제처 입력 <span>이름·영문·초성 모두 검색됩니다</span></div>" +
        "<div><b>2</b> 결제 금액 입력 <span>한도와 최소금액까지 반영해 계산합니다</span></div>" +
        "<div><b>3</b> 순위 확인 <span>실제로 깎이는 금액 순으로 정렬됩니다</span></div>" +
      "</div>" +
    "</div>" + personalPrograms([]) + FOOTNOTE;
  }

  function renderResults() {
    var ctx = context();
    if (!ctx) { el.results.innerHTML = renderEmpty(); return; }

    var owned = ownedFilter();
    var amount = state.amount;
    var html = "";

    if (!amount) {
      html += '<div class="headline"><strong>' + esc(ctx.name) + "</strong> · " +
        esc(categoryName(ctx.category)) + (ctx.custom ? " (직접 입력)" : "") +
        " · 결제 금액을 넣으면 순위가 나옵니다</div>";
      html += renderPreview(ctx);
      html += freshNotices(ctx);
      html += personalPrograms(candidates(ctx).map(function (b) { return b.app; }));
      el.results.innerHTML = html + FOOTNOTE;
      return;
    }

    var ranked = rankAll(ctx, amount, owned);
    html += '<div class="headline"><strong>' + esc(ctx.name) + "</strong>에서 " +
      '<strong class="num">' + won(amount) + "</strong> 결제 시 · 비교한 혜택 " + ranked.total + "건" +
      (state.onlyOwned && state.owned.length ? " · 보유 앱만" : "") + "</div>";

    if (!ranked.eligible.length) {
      html += '<div class="empty-state">' +
        (ranked.total
          ? "이 금액에서는 조건을 채우는 혜택이 없습니다. 금액을 올리거나 보유 앱 필터를 풀어 보세요."
          : "등록된 혜택이 없습니다. <code>data/benefits.js</code> 에 추가해 주세요.") + "</div>";
    } else {
      var top = ranked.eligible[0];
      html += renderWinner(top, amount, ranked.eligible[1]);
      if (ranked.eligible.length > 1) {
        html += '<section class="list-card">' +
          '<div class="section-title"><h2>나머지 순위</h2><span class="hint">1위와의 차이</span></div>' +
          '<ul class="rank-list">' +
          ranked.eligible.slice(1).map(function (r, i) { return renderRow(r, i + 2, top); }).join("") +
          "</ul></section>";
      }
      html += renderChart(ctx, amount, ranked.eligible.slice(0, 3).map(function (r) { return r.benefit; }));
    }

    html += freshNotices(ctx);
    html += personalPrograms(ranked.eligible.map(function (r) { return r.benefit.app; }));

    if (ranked.blocked.length) {
      html += '<section class="list-card">' +
        '<div class="section-title"><h2>지금은 못 쓰는 혜택</h2>' +
        '<span class="hint">조건을 채우면 후보가 됩니다</span></div>' +
        '<ul class="rank-list">' + ranked.blocked.map(renderBlocked).join("") + "</ul></section>";
    }

    el.results.innerHTML = html + FOOTNOTE;
  }

  function render() {
    renderPicked();
    renderFallback();
    renderAppChips();
    el.onlyOwned.checked = state.onlyOwned;
    renderResults();
  }

  /* ── 이벤트 ───────────────────────────────────────────── */
  function pickMerchant(id) {
    state.merchantId = id;
    state.custom = null;
    state.pendingQuery = null;
    el.search.value = "";
    renderSuggest("", false);
    render();
  }

  el.search.addEventListener("input", function () { renderSuggest(el.search.value, true); });
  el.search.addEventListener("focus", function () { renderSuggest(el.search.value, true); });
  el.search.addEventListener("blur", function () {
    setTimeout(function () { renderSuggest("", false); }, 120);
  });
  el.search.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    var q = el.search.value.trim();
    if (!q) return;
    var hit = searchMerchants(q)[0];
    if (hit) { pickMerchant(hit.id); return; }
    state.merchantId = null;
    state.custom = null;
    state.pendingQuery = q;
    el.search.value = "";
    renderSuggest("", false);
    render();
  });

  el.suggest.addEventListener("mousedown", function (e) { e.preventDefault(); });
  el.suggest.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.id) { pickMerchant(btn.dataset.id); return; }
    if (btn.dataset.custom) {
      state.merchantId = null;
      state.custom = null;
      state.pendingQuery = el.search.value.trim();
      el.search.value = "";
      renderSuggest("", false);
      render();
    }
  });

  el.examples.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-id]");
    if (btn) pickMerchant(btn.dataset.id);
  });

  el.fallback.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-cat]");
    if (!btn) return;
    state.custom = { name: state.pendingQuery, category: btn.dataset.cat };
    state.pendingQuery = null;
    render();
  });

  el.picked.addEventListener("click", function (e) {
    if (!e.target.closest("#clear-merchant")) return;
    state.merchantId = null;
    state.custom = null;
    state.pendingQuery = null;
    render();
    el.search.focus();
  });

  el.amount.addEventListener("input", function () {
    var v = parseInt(el.amount.value.replace(/[^0-9]/g, "") || "0", 10);
    if (v > 100000000) v = 100000000;
    el.amount.value = v ? num(v) : "";
    state.amount = v || null;
    renderResults();
  });

  el.presets.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-amount]");
    if (!btn) return;
    state.amount = parseInt(btn.dataset.amount, 10);
    el.amount.value = num(state.amount);
    renderResults();
  });

  el.onlyOwned.addEventListener("change", function () {
    state.onlyOwned = el.onlyOwned.checked;
    persist();
    renderResults();
  });

  el.appChips.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-app]");
    if (!btn) return;
    var id = btn.dataset.app, i = state.owned.indexOf(id);
    if (i === -1) state.owned.push(id); else state.owned.splice(i, 1);
    persist();
    renderAppChips();
    renderResults();
  });

  /* 헤더에 표시할 자동 갱신 상태 */
  function feedStatusText() {
    if (!FEED || !FEED.collectedAt) {
      return '<span class="feed-dot idle"></span>자동 갱신 대기 중';
    }
    var mins = Math.round((Date.now() - new Date(FEED.collectedAt).getTime()) / 60000);
    var ago = mins < 60 ? mins + "분 전"
      : mins < 1440 ? Math.round(mins / 60) + "시간 전"
      : Math.round(mins / 1440) + "일 전";
    var ok = (FEED.sources || []).filter(function (s) { return s.status === "ok"; }).length;
    var all = (FEED.sources || []).length;
    var cls = !all ? "idle" : ok === all ? "ok" : ok ? "partial" : "fail";
    return '<span class="feed-dot ' + cls + '"></span>자동 갱신 ' + ago +
      (all ? " · 소스 " + ok + "/" + all : "") +
      (FEED.raw && FEED.raw.length ? " · 공지 " + FEED.raw.length + "건" : "");
  }

  /* ── 시작 ─────────────────────────────────────────────── */
  el.stampDate.textContent = DB.updatedAt;
  el.stampCount.textContent = "결제처 " + DB.merchants.length + "곳 · 혜택 " + ALL_BENEFITS.length + "건";
  el.feedStatus.innerHTML = feedStatusText();
  renderExamples();
  render();
})();
