/* =========================================================================
   nail salon luce — 予約データ永続化 + DM/LINE返信文ジェネレーター
   予約フォームの送信内容を localStorage に保存し、管理画面で横断管理する。
   DM/LINE で予約をさばく個人サロンが「このフォーム＋管理画面だけで完結」できる設計。
   外部送信なし・APIキー不要。
   ========================================================================= */
"use strict";

(function () {
  var K = "luce_bookings_v2", KS = "luce_seeded_v2", DAY = 86400000;

  var MENUS = [
    { name: "ワンカラー", price: "¥6,600", min: 60 },
    { name: "グラデーション", price: "¥7,700", min: 75 },
    { name: "フレンチ", price: "¥7,700", min: 75 },
    { name: "ニュアンスアート", price: "¥8,800", min: 90 },
    { name: "マグネットネイル", price: "¥9,900", min: 90 },
    { name: "フットネイル", price: "¥8,800", min: 80 },
    { name: "付け替え（オフ込み）", price: "¥+1,100", min: 90 },
    { name: "その他・相談したい", price: "—", min: 60 }
  ];
  var SOURCES = ["Instagram投稿", "Instagramリール", "TikTok", "Googleマップ", "友人の紹介", "その他"];

  function read() { try { return JSON.parse(localStorage.getItem(K) || "[]"); } catch (e) { return []; } }
  function write(v) { localStorage.setItem(K, JSON.stringify(v)); }
  function uid() { return "lc-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e4).toString(36); }

  function getBookings() { ensureSeed(); return read().sort(function (a, b) { return b.createdAt - a.createdAt; }); }
  function addBooking(input) {
    ensureSeed();
    var rec = Object.assign({}, input, { id: uid(), createdAt: Date.now(), status: "new" });
    var list = read(); list.push(rec); write(list);
    return rec;
  }
  function setStatus(id, status) {
    var list = read();
    var item = list.find(function (x) { return x.id === id; });
    if (item) { item.status = status; write(list); }
    return item;
  }
  function ensureSeed() {
    if (localStorage.getItem(KS)) return;
    var seed = (window.LUCE_SEED || []).map(function (b) {
      return Object.assign({}, b, { id: uid(), createdAt: Date.now() - (b._ago || 0) * DAY });
    });
    write(seed); localStorage.setItem(KS, "1");
  }
  function resetDemo() { localStorage.removeItem(K); localStorage.removeItem(KS); ensureSeed(); }

  /* ---- 日時整形 ---- */
  function fmtDate(v) {
    if (!v) return "";
    var d = new Date(v); if (isNaN(d.getTime())) return v;
    var w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    return (d.getMonth() + 1) + "月" + d.getDate() + "日(" + w + ") " +
      ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  /* ---- DM/LINE 返信文ジェネレーター（コピペ用） ---- */
  function buildReply(b, type) {
    var name = (b.name || "お客") + "様";
    var date = fmtDate(b.firstChoice) || "（日時調整中）";
    if (type === "remind") {
      return name + "\n明日のご予約のリマインドです🔔\n\n" + date + "／" + b.menu +
        "\n\nお気をつけてお越しください😊 ご変更があればこのままご返信くださいね。";
    }
    if (type === "thanks") {
      return name + "\n本日はご来店ありがとうございました🌸\n仕上がりはいかがでしたか？\n\n次回のご予約もこのままDM/LINEでお気軽にどうぞ💅 またお会いできるのを楽しみにしています！";
    }
    // confirm（確定）
    var lines = name + "\nご予約ありがとうございます🌷\n\n【ご予約内容】\n日時：" + date + "\nメニュー：" + b.menu;
    if (b.firstVisit) lines += "\n※ 初回のお客様：当日は少し早めにお越しいただけると安心です。";
    lines += "\n\n上記で確定いたしました✨ 当日お会いできるのを楽しみにしております💕\nご変更・ご相談はこのままご返信ください。";
    return lines;
  }

  window.LuceStore = {
    MENUS: MENUS, SOURCES: SOURCES,
    getBookings: getBookings, addBooking: addBooking, setStatus: setStatus,
    resetDemo: resetDemo, fmtDate: fmtDate, buildReply: buildReply
  };
})();
