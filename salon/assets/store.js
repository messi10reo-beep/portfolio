/* =========================================================================
   hair atelier hibi — 予約データ永続化レイヤ + AI事前整理（LLM API不要）
   予約フォームの送信内容を localStorage に保存し、管理画面で横断表示する。
   保存時に髪のお悩みを簡易分類し、スタイリスト向けの確認ポイントを付与。
   （最終確認・確定はスタッフが行う Human-in-the-loop 設計）
   ========================================================================= */
"use strict";

(function () {
  var K_BOOK = "hibi_bookings_v1";
  var K_SEEDED = "hibi_seeded_v1";
  var DAY = 86400000;

  /* ---- メニュー（予約フォームの選択肢 / 料金は税込） ---- */
  var MENUS = [
    { name: "カット", price: "¥5,500", minutes: 60 },
    { name: "カット＋カラー", price: "¥11,000〜", minutes: 120 },
    { name: "カット＋パーマ", price: "¥12,100〜", minutes: 130 },
    { name: "白髪染め", price: "¥6,050", minutes: 90 },
    { name: "イルミナ／ハイライト", price: "¥9,900〜", minutes: 150 },
    { name: "縮毛矯正", price: "¥13,200〜", minutes: 180 },
    { name: "トリートメント／ヘッドスパ", price: "¥3,850〜", minutes: 45 },
    { name: "その他・相談したい", price: "—", minutes: 60 }
  ];

  var STYLISTS = ["指名なし（お任せ）", "日比野 葵（店長）", "森 千尋", "新人スタイリスト"];

  /* ---- localStorage I/O ---- */
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); }
    catch (e) { return []; }
  }
  function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function uid() {
    return "bk-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e4).toString(36);
  }

  /* ---- 予約 ---- */
  function getBookings() {
    ensureSeed();
    return read(K_BOOK).sort(function (a, b) { return b.createdAt - a.createdAt; });
  }
  function addBooking(input) {
    ensureSeed();
    var ai = window.HibiAI.classify(input.menu, input.concern, input.note);
    var rec = Object.assign({}, input, {
      id: uid(),
      category: ai.category,
      aiSummary: ai.summary,
      aiChecks: ai.checks,
      createdAt: Date.now(),
      status: "new"
    });
    var list = read(K_BOOK); list.push(rec); write(K_BOOK, list);
    return rec;
  }
  function setStatus(id, status) {
    var list = read(K_BOOK);
    var item = list.find(function (x) { return x.id === id; });
    if (item) { item.status = status; write(K_BOOK, list); }
    return item;
  }

  /* ---- 初期デモデータ ---- */
  function seedRecord(b) {
    var ai = window.HibiAI.classify(b.menu, b.concern, b.note);
    return Object.assign({}, b, {
      id: uid(), category: ai.category, aiSummary: ai.summary, aiChecks: ai.checks,
      createdAt: Date.now() - (b._ago || 0) * DAY, status: b.status || "new"
    });
  }
  function ensureSeed() {
    if (localStorage.getItem(K_SEEDED)) return;
    var seed = (window.HIBI_SEED || []).map(seedRecord);
    write(K_BOOK, seed);
    localStorage.setItem(K_SEEDED, "1");
  }
  function resetDemo() {
    localStorage.removeItem(K_BOOK);
    localStorage.removeItem(K_SEEDED);
    ensureSeed();
  }

  window.HibiStore = {
    MENUS: MENUS, STYLISTS: STYLISTS,
    getBookings: getBookings, addBooking: addBooking, setStatus: setStatus, resetDemo: resetDemo
  };
})();
