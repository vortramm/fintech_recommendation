/* 결제처별 할인 앱 찾기 — 계산 · 렌더링 */
(function () {
  "use strict";

  var DB = window.DISCOUNT_DB;
  var STORE_KEY = "pay-discount:owned-apps";

  /* ── 포맷 ─────────────────────────────────────────────── */
  function won(n) { return Math.round(n).toLocaleString("ko-KR") + "원"; }
  function num(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function pct(r) {
    var v = r * 100;
    var s = v >= 10 ? v.toFixed(1) : v.toFixed(2);
    return s.replace(/\.?0+$/, "") + "%";
  }
  function manwon(n) {
    if (n >= 10000) {
      var v = n / 10000;
      return (Math.round(v * 10) / 10) + "만원";
    }
    return num(n) + "원";
  }
  /* 축 라벨: 단위를 "만"으로 통일합니다 */
  function axisLabel(n) {
    if (n === 0) return "0";
    if (n >= 10000) return (Math.round((n / 10000) * 10) / 10) + "만";
    return num(n);
  }
  /* 받침에 맞는 조사 — josa("토스", "이/가") → "토스가" */
  function josa(word, pair) {
    var parts = pair.split("/");
    var code = word.charCodeAt(word.length - 1);
    var hasFinal = code >= 0xAC00 && code <= 0xD7A3 ? (code - 0xAC00) % 28 > 0 : false;
    return word + (hasFinal ? parts[0] : parts[1]);
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
      var tier = benefit.tiers
        .slice()
        .sort(function (a, b) { return b.min - a.min; })
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

  /* ── 순위 ─────────────────────────────────────────────── */
  function rankAll(merchantId, amount, ownedFilter) {
    var rows = DB.benefits
      .filter(function (b) { return b.merchant === merchantId; })
      .filter(function (b) { return !ownedFilter || ownedFilter.indexOf(b.app) !== -1; })
      .map(function (b) { return evaluate(b, amount); });

    var typeWeight = function (r) { return r.benefit.benefitType === "할인" ? 0 : 1; };

    var eligible = rows.filter(function (r) { return r.eligible; }).sort(function (a, b) {
      if (b.discount !== a.discount) return b.discount - a.discount;
      if (typeWeight(a) !== typeWeight(b)) return typeWeight(a) - typeWeight(b);
      return a.app.name.localeCompare(b.app.name, "ko");
    });

    var blocked = rows.filter(function (r) { return !r.eligible; }).sort(function (a, b) {
      return (a.benefit.minAmount || 0) - (b.benefit.minAmount || 0);
    });

    return { eligible: eligible, blocked: blocked, total: rows.length };
  }

  function bestAt(merchantId, amount, ownedFilter) {
    return rankAll(merchantId, amount, ownedFilter).eligible[0] || null;
  }

  /* ── 금액에 따른 1위 변경 지점 ────────────────────────── */
  function switchPoints(merchantId, ownedFilter, maxAmount) {
    var step = Math.max(1000, Math.round(maxAmount / 300 / 1000) * 1000);
    var points = [];
    var prev = null;
    for (var a = step; a <= maxAmount; a += step) {
      var win = bestAt(merchantId, a, ownedFilter);
      var id = win ? win.benefit.app + ":" + win.benefit.condition : null;
      if (id && prev && id !== prev.id) {
        points.push({ amount: a, from: prev.win, to: win });
      }
      if (id) prev = { id: id, win: win };
    }
    return points;
  }

  /* ── 상태 ─────────────────────────────────────────────── */
  var state = {
    merchant: "11st",
    amount: 50000,
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

  function merchantById(id) {
    return DB.merchants.filter(function (m) { return m.id === id; })[0];
  }

  /* ── DOM ──────────────────────────────────────────────── */
  var $ = function (sel) { return document.querySelector(sel); };
  var el = {
    search: $("#merchant-search"),
    suggest: $("#merchant-suggest"),
    popular: $("#merchant-popular"),
    amount: $("#amount"),
    presets: $("#amount-presets"),
    onlyOwned: $("#only-owned"),
    appChips: $("#app-chips"),
    results: $("#results"),
    stampDate: $("#stamp-date")
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* 결제처 검색 */
  function matchMerchants(q) {
    q = q.trim().toLowerCase();
    if (!q) return DB.merchants.slice(0, 8);
    return DB.merchants.filter(function (m) {
      var hay = [m.name, m.category].concat(m.aliases || []).join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function renderSuggest(q, open) {
    if (!open) { el.suggest.hidden = true; el.suggest.innerHTML = ""; return; }
    var list = matchMerchants(q);
    if (!list.length) {
      el.suggest.innerHTML = '<li class="empty">"' + esc(q) + '" 에 등록된 결제처가 없어요. 데이터 파일에 추가할 수 있습니다.</li>';
    } else {
      el.suggest.innerHTML = list.map(function (m) {
        var count = DB.benefits.filter(function (b) { return b.merchant === m.id; }).length;
        return '<li><button type="button" data-id="' + m.id + '">' +
          "<span>" + esc(m.name) + "</span>" +
          '<span class="cat">' + esc(m.category) + " · 혜택 " + count + "건</span>" +
          "</button></li>";
      }).join("");
    }
    el.suggest.hidden = false;
  }

  function renderPopular() {
    var ids = ["11st", "coupang", "baemin", "starbucks", "oliveyoung", "gs25", "emart", "musinsa"];
    el.popular.innerHTML = ids.map(function (id) {
      var m = merchantById(id);
      return '<button type="button" class="chip" data-id="' + id + '" aria-pressed="' +
        (state.merchant === id) + '">' + esc(m.name) + "</button>";
    }).join("");
  }

  function renderAppChips() {
    el.appChips.innerHTML = Object.keys(DB.apps).map(function (id) {
      var a = DB.apps[id];
      return '<button type="button" class="chip" data-app="' + id + '" aria-pressed="' +
        (state.owned.indexOf(id) !== -1) + '">' + esc(a.name.replace(/\s*\(.*\)/, "")) + "</button>";
    }).join("");
  }

  /* 결과 */
  function metaTags(r) {
    var b = r.benefit;
    var tags = ['<span class="tag type-' + b.benefitType + '">' + b.benefitType + "</span>"];
    if (r.capped) tags.push('<span class="tag capped">한도 도달</span>');
    if (b.cap != null && !r.capped) tags.push('<span class="tag">한도 ' + won(b.cap) + "</span>");
    if (b.minAmount) tags.push('<span class="tag">' + won(b.minAmount) + " 이상</span>");
    if (b.monthlyCap) tags.push('<span class="tag">' + esc(b.monthlyCap) + "</span>");
    return '<div class="meta">' + tags.join("") + "</div>";
  }

  function renderWinner(r, amount, runnerUp) {
    var gap = runnerUp ? r.discount - runnerUp.discount : 0;
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
          (runnerUp ? " · 2위 " + esc(runnerUp.app.name) + "보다 " + won(gap) + " 더 아낍니다." : "") +
        "</p>" +
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
      "</div>" +
      '<div class="figure"><div class="amt">조건 미충족</div></div>' +
    "</li>";
  }

  /* 금액대별 할인액 그래프 */
  function renderChart(merchantId, amount, series) {
    if (series.length < 2) return "";

    var W = 640, H = 240, padL = 58, padR = 16, padT = 16, padB = 34;
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
    lines.forEach(function (l) {
      l.pts.forEach(function (p) { if (p.y > maxY) maxY = p.y; });
    });
    if (maxY <= 0) return "";
    maxY = Math.ceil(maxY / 1000) * 1000;

    var sx = function (v) { return padL + (v / maxX) * (W - padL - padR); };
    var sy = function (v) { return H - padB - (v / maxY) * (H - padT - padB); };

    var xTicks = [0, maxX * 0.25, maxX * 0.5, maxX * 0.75, maxX];
    var yTicks = [0, maxY / 2, maxY];

    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="결제금액에 따른 앱별 할인액 변화">';
    svg += '<text x="0" y="11" font-size="10" font-family="var(--f-body)" fill="var(--muted)">할인액(원)</text>';

    yTicks.forEach(function (t) {
      svg += '<line x1="' + padL + '" y1="' + sy(t) + '" x2="' + (W - padR) + '" y2="' + sy(t) +
        '" stroke="var(--line)" stroke-width="1" fill="none"/>' +
        '<text x="' + (padL - 8) + '" y="' + (sy(t) + 4) + '" text-anchor="end" font-size="11" ' +
        'font-family="var(--f-mono)" fill="var(--muted)">' + num(t) + "</text>";
    });
    xTicks.forEach(function (t) {
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

    var notes = switchPoints(merchantId, ownedFilter(), maxX).slice(0, 3).map(function (p) {
      return "<li>" + esc(manwon(p.amount)) + " 이상부터는 <b>" + esc(p.to.app.name) +
        "</b>" + esc(josa(p.to.app.name, "이/가").slice(p.to.app.name.length)) +
        " " + esc(p.from.app.name) + "보다 유리해집니다.</li>";
    }).join("");

    return '<section class="chart-card">' +
      '<div class="section-title"><h2>결제금액이 바뀌면</h2>' +
      '<span class="hint">할인 한도 때문에 금액대별로 1위가 달라집니다</span></div>' +
      '<div class="chart-wrap">' + svg + "</div>" +
      '<div class="legend">' + legend + "</div>" +
      (notes ? '<ul class="switch-notes">' + notes + "</ul>" : "") +
    "</section>";
  }

  function renderResults() {
    var m = merchantById(state.merchant);
    var amount = state.amount;
    var ranked = rankAll(state.merchant, amount, ownedFilter());
    var html = "";

    html += '<div class="headline"><strong>' + esc(m.name) + "</strong>에서 " +
      '<strong class="num">' + won(amount) + "</strong> 결제 시 · 등록된 혜택 " + ranked.total + "건" +
      (state.onlyOwned && state.owned.length ? " · 보유 앱만 보는 중" : "") + "</div>";

    if (!ranked.eligible.length) {
      html += '<div class="empty-state">' +
        (ranked.total
          ? "이 금액에서는 조건을 채우는 혜택이 없습니다. 금액을 올리거나 보유 앱 필터를 풀어 보세요."
          : "등록된 혜택이 없습니다. <code>data/benefits.js</code> 에 추가해 주세요.") +
        "</div>";
    } else {
      var top = ranked.eligible[0];
      html += renderWinner(top, amount, ranked.eligible[1]);

      if (ranked.eligible.length > 1) {
        html += '<section class="list-card">' +
          '<div class="section-title"><h2>나머지 순위</h2>' +
          '<span class="hint">1위와의 차이</span></div>' +
          '<ul class="rank-list">' +
          ranked.eligible.slice(1).map(function (r, i) { return renderRow(r, i + 2, top); }).join("") +
          "</ul></section>";
      }

      html += renderChart(state.merchant, amount,
        ranked.eligible.slice(0, 3).map(function (r) { return r.benefit; }));
    }

    if (ranked.blocked.length) {
      html += '<section class="list-card">' +
        '<div class="section-title"><h2>지금은 못 쓰는 혜택</h2>' +
        '<span class="hint">조건을 채우면 후보가 됩니다</span></div>' +
        '<ul class="rank-list">' + ranked.blocked.map(renderBlocked).join("") + "</ul></section>";
    }

    html += '<section class="note-card">' +
      "<b>계산 방식</b> · 할인율 × 결제금액을 구한 뒤 할인 한도와 최소 결제금액을 적용해 " +
      "실제로 깎이는 금액으로 줄을 세웁니다. 같은 금액이면 적립보다 즉시할인을 앞에 둡니다. " +
      "월 한도·선착순 여부는 계산에 넣지 않고 표시만 하니 앱에서 남은 횟수를 확인하세요.<br>" +
      "<b>데이터</b> · " + esc(DB.source) + " 값은 <code>data/benefits.js</code> 한 파일에 모여 있습니다." +
    "</section>";

    el.results.innerHTML = html;
  }

  function render() {
    renderPopular();
    renderAppChips();
    el.onlyOwned.checked = state.onlyOwned;
    renderResults();
  }

  /* ── 이벤트 ───────────────────────────────────────────── */
  el.search.addEventListener("input", function () { renderSuggest(el.search.value, true); });
  el.search.addEventListener("focus", function () { renderSuggest(el.search.value, true); });
  el.search.addEventListener("blur", function () {
    setTimeout(function () { renderSuggest("", false); }, 120);
  });
  el.suggest.addEventListener("mousedown", function (e) { e.preventDefault(); });
  el.suggest.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-id]");
    if (!btn) return;
    state.merchant = btn.dataset.id;
    el.search.value = "";
    renderSuggest("", false);
    render();
  });

  el.popular.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-id]");
    if (!btn) return;
    state.merchant = btn.dataset.id;
    render();
  });

  el.amount.addEventListener("input", function () {
    var digits = el.amount.value.replace(/[^0-9]/g, "");
    var v = parseInt(digits || "0", 10);
    if (v > 100000000) v = 100000000;
    el.amount.value = v ? num(v) : "";
    state.amount = v;
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
    var id = btn.dataset.app;
    var i = state.owned.indexOf(id);
    if (i === -1) state.owned.push(id); else state.owned.splice(i, 1);
    persist();
    renderAppChips();
    renderResults();
  });

  /* ── 시작 ─────────────────────────────────────────────── */
  el.amount.value = num(state.amount);
  el.stampDate.textContent = DB.updatedAt;
  render();
})();
