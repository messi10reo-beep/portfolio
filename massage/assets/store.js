/* =========================================================================
   凪 NAGI — localStorage 永続化レイヤ
   予約 / 問い合わせ を保存し、ダッシュボードで横断表示する。
   保存時に NagiAI で「カテゴリ」「AI要約/返信たたき台」を付与（人の確認前提）。
   ========================================================================= */
"use strict";

(function () {
  const K_BOOK = "nagi_bookings_v1";
  const K_INQ = "nagi_inquiries_v1";
  const K_SEEDED = "nagi_seeded_v1";
  const DAY = 86400000;

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); }
    catch (e) { return []; }
  }
  function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e4).toString(36);
  }

  // ---- 予約 ----
  function getBookings() { ensureSeed(); return read(K_BOOK).sort((a, b) => b.createdAt - a.createdAt); }
  function addBooking(input) {
    ensureSeed(); // 先にダミーデータを確定し、後のダッシュボード表示で上書きされないようにする
    const ai = window.NagiAI.classifyBooking(input.symptoms, input.note);
    const rec = Object.assign({}, input, {
      id: uid("bk"),
      category: ai.category,
      aiSummary: ai.summary,
      aiChecks: ai.checks,
      createdAt: Date.now(),
      status: "new"
    });
    const list = read(K_BOOK); list.push(rec); write(K_BOOK, list);
    return rec;
  }

  // ---- 問い合わせ ----
  function getInquiries() { ensureSeed(); return read(K_INQ).sort((a, b) => b.createdAt - a.createdAt); }
  function addInquiry(input) {
    ensureSeed(); // 先にダミーデータを確定し、後のダッシュボード表示で上書きされないようにする
    const ai = window.NagiAI.classifyInquiry(input.type, input.message);
    const rec = Object.assign({}, input, {
      id: uid("iq"),
      category: ai.category,
      aiSuggestedReply: ai.reply,
      aiChecks: ai.checks,
      createdAt: Date.now(),
      status: "new"
    });
    const list = read(K_INQ); list.push(rec); write(K_INQ, list);
    return rec;
  }

  // ---- ステータス更新（new → progress → done） ----
  function setStatus(kind, id, status) {
    const key = kind === "booking" ? K_BOOK : K_INQ;
    const list = read(key);
    const item = list.find((x) => x.id === id);
    if (item) { item.status = status; write(key, list); }
    return item;
  }

  // ---- 初期ダミーデータ投入 ----
  function ensureSeed() {
    if (localStorage.getItem(K_SEEDED)) return;
    const seed = window.NAGI_SEED || { bookings: [], inquiries: [] };
    const books = seed.bookings.map((b) => {
      const ai = window.NagiAI.classifyBooking(b.symptoms, b.note);
      return Object.assign({}, b, {
        id: uid("bk"), category: ai.category, aiSummary: ai.summary, aiChecks: ai.checks,
        createdAt: Date.now() - (b._ago || 0) * DAY
      });
    });
    const inqs = seed.inquiries.map((q) => {
      const ai = window.NagiAI.classifyInquiry(q.type, q.message);
      return Object.assign({}, q, {
        id: uid("iq"), category: ai.category, aiSuggestedReply: ai.reply, aiChecks: ai.checks,
        createdAt: Date.now() - (q._ago || 0) * DAY
      });
    });
    write(K_BOOK, books); write(K_INQ, inqs);
    localStorage.setItem(K_SEEDED, "1");
  }

  // ---- デモデータのリセット（再投入） ----
  function resetDemo() {
    localStorage.removeItem(K_BOOK);
    localStorage.removeItem(K_INQ);
    localStorage.removeItem(K_SEEDED);
    ensureSeed();
  }

  window.NagiStore = { getBookings, addBooking, getInquiries, addInquiry, setStatus, resetDemo };
})();
