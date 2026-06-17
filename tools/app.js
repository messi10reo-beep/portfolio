// data-tool — client-side CSV aggregation demo
// Security: no innerHTML anywhere. All DOM built via createElement/textContent.
(function () {
  "use strict";

  // ---- Guards against pathological input ----
  var MAX_BYTES = 5 * 1024 * 1024; // 5 MB cap
  var MAX_ROWS = 50000; // row cap
  var MAX_COLS = 200; // column cap
  var MAX_BARS = 30; // chart bar cap (top N by value)

  // ---- App state ----
  var state = {
    headers: [], // string[]
    rows: [], // string[][] (data rows only)
  };

  // ---- Element refs ----
  var els = {};
  function $(id) {
    return document.getElementById(id);
  }

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    els.fileInput = $("file-input");
    els.pasteArea = $("paste-area");
    els.parseBtn = $("parse-btn");
    els.sampleBtn = $("sample-btn");
    els.clearBtn = $("clear-btn");
    els.parseStatus = $("parse-status");
    els.configCard = $("config-card");
    els.resultCard = $("result-card");
    els.emptyState = $("empty-state");
    els.categoryCol = $("category-col");
    els.valueCol = $("value-col");
    els.aggMethod = $("agg-method");
    els.summaryGrid = $("summary-grid");
    els.skipNote = $("skip-note");
    els.chart = $("chart");
    els.resultTable = $("result-table");
    els.downloadBtn = $("download-btn");

    els.parseBtn.addEventListener("click", onParseClick);
    els.sampleBtn.addEventListener("click", onSampleClick);
    els.clearBtn.addEventListener("click", onClear);
    els.fileInput.addEventListener("change", onFileChange);
    els.categoryCol.addEventListener("change", recompute);
    els.valueCol.addEventListener("change", recompute);
    els.aggMethod.addEventListener("change", recompute);
    els.downloadBtn.addEventListener("click", onDownload);
  }

  // ================= CSV PARSING =================
  // RFC4180-style parser: handles quotes, embedded commas/newlines, escaped
  // double-quotes (""), CRLF/LF/CR, and a leading UTF-8 BOM.
  function parseCsv(text) {
    if (typeof text !== "string") return [];
    // Strip BOM
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    var rows = [];
    var field = "";
    var row = [];
    var inQuotes = false;
    var i = 0;
    var len = text.length;

    while (i < len) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"'; // escaped quote
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ",") {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (ch === "\n" || ch === "\r") {
        // End of record. Consume CRLF as one break.
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        if (ch === "\r" && text[i + 1] === "\n") i += 2;
        else i++;
        if (rows.length > MAX_ROWS + 1) break; // +1 for header
        continue;
      }
      field += ch;
      i++;
    }
    // Flush trailing field/row (file may not end with newline)
    if (field !== "" || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    // Drop fully-empty trailing rows
    return rows.filter(function (r) {
      return !(r.length === 1 && r[0].trim() === "");
    });
  }

  // ================= INPUT HANDLERS =================
  function onFileChange() {
    var file = els.fileInput.files && els.fileInput.files[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setStatus("ファイルが大きすぎます（上限5MB）。", "error");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var result = reader.result;
      els.pasteArea.value = typeof result === "string" ? result : "";
      loadFromText(els.pasteArea.value, file.name);
    };
    reader.onerror = function () {
      setStatus("ファイルを読み込めませんでした。", "error");
    };
    reader.readAsText(file);
  }

  function onParseClick() {
    var text = els.pasteArea.value;
    if (!text || text.trim() === "") {
      setStatus("CSVを貼り付けるか、ファイルを選択してください。", "error");
      return;
    }
    if (text.length > MAX_BYTES) {
      setStatus("入力が大きすぎます（上限5MB）。", "error");
      return;
    }
    loadFromText(text, "貼り付けデータ");
  }

  function onSampleClick() {
    var sample = buildSampleCsv();
    els.pasteArea.value = sample;
    loadFromText(sample, "サンプル売上データ");
  }

  function loadFromText(text, sourceName) {
    var table = parseCsv(text);
    if (table.length < 2) {
      setStatus("ヘッダ行とデータ行が必要です（2行以上）。", "error");
      hide(els.configCard);
      hide(els.resultCard);
      return;
    }
    var headers = table[0].map(function (h, idx) {
      var name = (h || "").trim();
      return name === "" ? "列" + (idx + 1) : name;
    });
    if (headers.length > MAX_COLS) {
      setStatus("列が多すぎます（上限" + MAX_COLS + "列）。", "error");
      return;
    }
    // Normalise row width to header width
    var dataRows = table.slice(1).map(function (r) {
      var out = r.slice(0, headers.length);
      while (out.length < headers.length) out.push("");
      return out;
    });

    state.headers = headers;
    state.rows = dataRows;

    populateColumnSelectors();
    show(els.configCard);
    hide(els.emptyState);
    recompute();
    setStatus(
      sourceName + " を読み込みました（" + dataRows.length + "行）。",
      "ok"
    );
  }

  function onClear() {
    els.pasteArea.value = "";
    els.fileInput.value = "";
    state.headers = [];
    state.rows = [];
    hide(els.configCard);
    hide(els.resultCard);
    show(els.emptyState);
    setStatus("", "");
  }

  function setStatus(msg, kind) {
    els.parseStatus.textContent = msg;
    els.parseStatus.className = "status" + (kind ? " " + kind : "");
  }

  // ================= COLUMN SELECTORS =================
  function populateColumnSelectors() {
    fillSelect(els.categoryCol, state.headers);
    fillSelect(els.valueCol, state.headers);

    // Smart defaults: first text-ish col as category, first numeric col as value
    var numericIdx = guessNumericColumn();
    var catIdx = guessCategoryColumn(numericIdx);
    els.categoryCol.value = String(catIdx);
    els.valueCol.value = String(numericIdx >= 0 ? numericIdx : 0);
  }

  function fillSelect(select, headers) {
    // clear
    while (select.firstChild) select.removeChild(select.firstChild);
    headers.forEach(function (h, idx) {
      var opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = h; // textContent — XSS-safe
      select.appendChild(opt);
    });
  }

  function guessNumericColumn() {
    for (var c = 0; c < state.headers.length; c++) {
      var hits = 0;
      var checked = 0;
      for (var r = 0; r < state.rows.length && checked < 20; r++) {
        var v = state.rows[r][c];
        if (v == null || v.trim() === "") continue;
        checked++;
        if (parseNumber(v) !== null) hits++;
      }
      if (checked > 0 && hits / checked >= 0.7) return c;
    }
    return -1;
  }

  function guessCategoryColumn(numericIdx) {
    for (var c = 0; c < state.headers.length; c++) {
      if (c === numericIdx) continue;
      return c;
    }
    return 0;
  }

  // Parse a numeric string: strips currency symbols, commas, spaces.
  // Returns a finite number or null.
  function parseNumber(raw) {
    if (raw == null) return null;
    var s = String(raw).trim();
    if (s === "") return null;
    s = s.replace(/[,\s¥$€£]/g, "");
    if (s === "" || !/^[-+]?\d*\.?\d+$/.test(s)) return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  // ================= AGGREGATION =================
  function recompute() {
    if (state.rows.length === 0) return;
    var catIdx = parseInt(els.categoryCol.value, 10) || 0;
    var valIdx = parseInt(els.valueCol.value, 10) || 0;
    var method = els.aggMethod.value;

    var groups = Object.create(null);
    var order = [];
    var skipped = 0;
    var validCount = 0;

    for (var r = 0; r < state.rows.length; r++) {
      var row = state.rows[r];
      var key = (row[catIdx] == null ? "" : row[catIdx]).trim();
      if (key === "") key = "（未分類）";

      var num = null;
      if (method !== "count") {
        num = parseNumber(row[valIdx]);
        if (num === null) {
          skipped++;
          continue; // skip non-numeric rows (not silently dropped — counted)
        }
      }
      validCount++;

      if (!(key in groups)) {
        groups[key] = { key: key, sum: 0, count: 0 };
        order.push(key);
      }
      groups[key].count += 1;
      if (num !== null) groups[key].sum += num;
    }

    var result = order.map(function (k) {
      var g = groups[k];
      var value;
      if (method === "sum") value = g.sum;
      else if (method === "avg") value = g.count ? g.sum / g.count : 0;
      else value = g.count; // count
      return { key: g.key, value: value, count: g.count };
    });

    var grandTotal = result.reduce(function (a, g) {
      return a + g.value;
    }, 0);

    // Sort descending by value for table + chart readability
    result.sort(function (a, b) {
      return b.value - a.value;
    });

    renderResults({
      result: result,
      method: method,
      grandTotal: grandTotal,
      validCount: validCount,
      skipped: skipped,
      categoryName: state.headers[catIdx],
      valueName: state.headers[valIdx],
    });

    // stash for CSV export
    state.lastResult = {
      result: result,
      method: method,
      categoryName: state.headers[catIdx],
      valueName: state.headers[valIdx],
      grandTotal: grandTotal,
    };

    show(els.resultCard);
  }

  // ================= RENDER =================
  function renderResults(ctx) {
    renderSummary(ctx);
    renderSkipNote(ctx.skipped);
    renderChart(ctx);
    renderTable(ctx);
  }

  var METHOD_LABEL = { sum: "合計", avg: "平均", count: "件数" };

  function renderSummary(ctx) {
    clear(els.summaryGrid);
    var totalLabel =
      ctx.method === "count"
        ? "総件数"
        : "総" + METHOD_LABEL[ctx.method] + "（" + ctx.valueName + "）";
    var cards = [
      { label: totalLabel, value: formatNumber(ctx.grandTotal) },
      { label: "有効レコード数", value: formatNumber(ctx.validCount) },
      { label: "カテゴリ数", value: formatNumber(ctx.result.length) },
    ];
    cards.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "summary-card";
      var label = document.createElement("div");
      label.className = "label";
      label.textContent = c.label;
      var value = document.createElement("div");
      value.className = "value";
      value.textContent = c.value;
      card.appendChild(label);
      card.appendChild(value);
      els.summaryGrid.appendChild(card);
    });
  }

  function renderSkipNote(skipped) {
    if (skipped > 0) {
      els.skipNote.textContent =
        "数値として解釈できなかった " +
        skipped +
        " 行をスキップしました（合計・平均の計算対象外）。";
      show(els.skipNote);
    } else {
      hide(els.skipNote);
    }
  }

  // Bar chart built entirely with SVG DOM nodes (no innerHTML, no library).
  function renderChart(ctx) {
    clear(els.chart);
    var data = ctx.result.slice(0, MAX_BARS);
    if (data.length === 0) {
      var p = document.createElement("p");
      p.className = "status";
      p.textContent = "表示できるデータがありません。";
      els.chart.appendChild(p);
      return;
    }

    var maxVal = data.reduce(function (m, d) {
      return Math.max(m, d.value);
    }, 0);
    if (maxVal <= 0) maxVal = 1;

    var rowH = 34;
    var gap = 10;
    var labelW = 150;
    var valueW = 96;
    var width = 720;
    var barAreaW = width - labelW - valueW;
    var height = data.length * (rowH + gap) + gap;

    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("preserveAspectRatio", "xMinYMin meet");

    data.forEach(function (d, idx) {
      var y = gap + idx * (rowH + gap);
      var barW = Math.max(2, (d.value / maxVal) * barAreaW);

      // category label (truncate long text safely via textContent)
      var label = svgText(NS, labelW - 12, y + rowH / 2 + 4, truncate(d.key, 14), "bar-label");
      label.setAttribute("text-anchor", "end");
      svg.appendChild(label);

      // track (full-width soft background)
      var track = document.createElementNS(NS, "rect");
      track.setAttribute("x", String(labelW));
      track.setAttribute("y", String(y));
      track.setAttribute("width", String(barAreaW));
      track.setAttribute("height", String(rowH));
      track.setAttribute("rx", "5");
      track.setAttribute("class", "bar-track");
      svg.appendChild(track);

      // value bar
      var bar = document.createElementNS(NS, "rect");
      bar.setAttribute("x", String(labelW));
      bar.setAttribute("y", String(y));
      bar.setAttribute("width", String(barW));
      bar.setAttribute("height", String(rowH));
      bar.setAttribute("rx", "5");
      bar.setAttribute("class", "bar-rect");
      var title = document.createElementNS(NS, "title");
      title.textContent = d.key + ": " + formatNumber(d.value);
      bar.appendChild(title);
      svg.appendChild(bar);

      // value text
      var valText = svgText(
        NS,
        labelW + barAreaW + 8,
        y + rowH / 2 + 4,
        formatNumber(d.value),
        "bar-value"
      );
      svg.appendChild(valText);
    });

    els.chart.appendChild(svg);

    if (ctx.result.length > MAX_BARS) {
      var note = document.createElement("p");
      note.className = "status";
      note.textContent =
        "上位 " + MAX_BARS + " カテゴリを表示中（全 " + ctx.result.length + " 件）。";
      els.chart.appendChild(note);
    }
  }

  function svgText(NS, x, y, text, cls) {
    var t = document.createElementNS(NS, "text");
    t.setAttribute("x", String(x));
    t.setAttribute("y", String(y));
    t.setAttribute("class", cls);
    t.textContent = text;
    return t;
  }

  function renderTable(ctx) {
    clear(els.resultTable);
    var thead = document.createElement("thead");
    var htr = document.createElement("tr");
    var valHeader = METHOD_LABEL[ctx.method] + "（" + ctx.valueName + "）";
    if (ctx.method === "count") valHeader = "件数";
    [ctx.categoryName, valHeader, "件数", "構成比"].forEach(function (h, i) {
      var th = document.createElement("th");
      th.textContent = h;
      if (i >= 1) th.className = "num";
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    els.resultTable.appendChild(thead);

    var tbody = document.createElement("tbody");
    var total = ctx.grandTotal || 0;
    ctx.result.forEach(function (d) {
      var tr = document.createElement("tr");
      appendCell(tr, d.key, false);
      appendCell(tr, formatNumber(d.value), true);
      appendCell(tr, formatNumber(d.count), true);
      var pct = total > 0 ? (d.value / total) * 100 : 0;
      appendCell(tr, pct.toFixed(1) + "%", true);
      tbody.appendChild(tr);
    });

    // total row
    var totalTr = document.createElement("tr");
    totalTr.className = "total-row";
    appendCell(totalTr, "合計", false);
    appendCell(totalTr, formatNumber(total), true);
    var totalCount = ctx.result.reduce(function (a, d) {
      return a + d.count;
    }, 0);
    appendCell(totalTr, formatNumber(totalCount), true);
    appendCell(totalTr, "100.0%", true);
    tbody.appendChild(totalTr);

    els.resultTable.appendChild(tbody);
  }

  function appendCell(tr, text, isNum) {
    var td = document.createElement("td");
    td.textContent = text; // XSS-safe
    if (isNum) td.className = "num";
    tr.appendChild(td);
  }

  // ================= CSV EXPORT =================
  function onDownload() {
    var r = state.lastResult;
    if (!r) return;
    var valHeader =
      r.method === "count" ? "件数" : METHOD_LABEL[r.method] + "_" + r.valueName;
    var lines = [];
    lines.push([r.categoryName, valHeader, "件数", "構成比(%)"]);
    var total = r.grandTotal || 0;
    r.result.forEach(function (d) {
      var pct = total > 0 ? (d.value / total) * 100 : 0;
      lines.push([d.key, String(d.value), String(d.count), pct.toFixed(1)]);
    });
    lines.push(["合計", String(total), "", "100.0"]);

    var csv = lines
      .map(function (cols) {
        return cols.map(csvEscape).join(",");
      })
      .join("\r\n");

    // BOM so Excel reads UTF-8 correctly
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "shukei_" + timestamp() + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // RFC4180 field escaping
  function csvEscape(field) {
    var s = String(field == null ? "" : field);
    if (/[",\r\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  // ================= HELPERS =================
  function formatNumber(n) {
    if (typeof n !== "number" || !isFinite(n)) return "0";
    var rounded = Math.round(n * 100) / 100;
    return rounded.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
  }

  function truncate(s, max) {
    s = String(s == null ? "" : s);
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  }

  function timestamp() {
    var d = new Date();
    function pad(x) {
      return x < 10 ? "0" + x : String(x);
    }
    return (
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      "_" +
      pad(d.getHours()) +
      pad(d.getMinutes())
    );
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  function show(node) {
    node.classList.remove("hidden");
  }
  function hide(node) {
    node.classList.add("hidden");
  }

  // ================= SAMPLE DATA =================
  // Generates ~50 rows of plausible cafe sales. Includes a couple of
  // intentionally malformed numeric values to demonstrate row-skip handling.
  function buildSampleCsv() {
    var products = [
      { name: "カフェラテ", cat: "ドリンク", price: 580 },
      { name: "アメリカーノ", cat: "ドリンク", price: 480 },
      { name: "カプチーノ", cat: "ドリンク", price: 560 },
      { name: "抹茶ラテ", cat: "ドリンク", price: 620 },
      { name: "チーズケーキ", cat: "フード", price: 680 },
      { name: "スコーン", cat: "フード", price: 420 },
      { name: "サンドイッチ", cat: "フード", price: 780 },
      { name: "ドリップバッグ", cat: "物販", price: 1200 },
      { name: "オリジナルマグ", cat: "物販", price: 1800 },
    ];
    var staff = ["佐藤", "鈴木", "田中", "高橋"];
    var rows = [["日付", "商品", "カテゴリ", "担当", "金額", "数量"]];
    // deterministic pseudo-random for reproducible demo
    var seed = 20260117;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }
    for (var i = 0; i < 50; i++) {
      var p = products[Math.floor(rnd() * products.length)];
      var qty = 1 + Math.floor(rnd() * 3);
      var day = 1 + Math.floor(rnd() * 28);
      var date = "2026-01-" + (day < 10 ? "0" + day : day);
      var person = staff[Math.floor(rnd() * staff.length)];
      var amount = String(p.price * qty);
      // inject 2 malformed amounts to show skip handling
      if (i === 12) amount = "N/A";
      if (i === 31) amount = "未確定";
      rows.push([date, p.name, p.cat, person, amount, String(qty)]);
    }
    return rows
      .map(function (cols) {
        return cols.map(csvEscape).join(",");
      })
      .join("\r\n");
  }
})();
