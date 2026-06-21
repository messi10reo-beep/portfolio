// ============================================================
// store.js — 和食 結 -yui- 予約データ永続化レイヤ
// 予約フォームの送信内容を localStorage に保存し、予約台帳(管理画面)で
// 日付ごとに横断表示する。外部送信なし・APIキー不要。
// innerHTML 不使用（呼び出し側も textContent / createElement のみ）。
// ============================================================
(function () {
  "use strict";

  var K = "yui_reservations_v1", KS = "yui_seeded_v1", DAY = 86400000;
  var SEATS = ["カウンター", "テーブル席", "個室"];
  var COURSES = ["季節のおまかせコース", "結コース", "アラカルト・飲みのみ", "ご相談"];

  function read() { try { return JSON.parse(localStorage.getItem(K) || "[]"); } catch (e) { return []; } }
  function write(v) { localStorage.setItem(K, JSON.stringify(v)); }
  function uid() { return "yui-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e4).toString(36); }

  function ensureSeed() {
    if (localStorage.getItem(KS)) return;
    var seed = (window.YUI_SEED || []).map(function (b) {
      return Object.assign({}, b, { id: uid(), createdAt: Date.now() - (b._ago || 0) * DAY });
    });
    write(seed); localStorage.setItem(KS, "1");
  }
  function getReservations() {
    ensureSeed();
    // 来店日時の昇順（台帳は予定順が見やすい）
    return read().sort(function (a, b) { return new Date(a.datetime) - new Date(b.datetime); });
  }
  function addReservation(input) {
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
  function resetDemo() { localStorage.removeItem(K); localStorage.removeItem(KS); ensureSeed(); }

  /* ---- 整形ヘルパ ---- */
  function partySize(g) { if (!g) return 0; if (String(g).indexOf("+") !== -1) return parseInt(g, 10) || 0; return parseInt(g, 10) || 0; }
  function dateKey(v) { var d = new Date(v); if (isNaN(d)) return "—"; return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function dateLabel(v) {
    var d = new Date(v); if (isNaN(d)) return "—";
    var w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    return (d.getMonth() + 1) + "月" + d.getDate() + "日 (" + w + ")";
  }
  function timeLabel(v) { var d = new Date(v); if (isNaN(d)) return "—"; return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function guestsLabel(g) { return String(g).indexOf("+") !== -1 ? "7名以上" : g + "名"; }

  window.YuiStore = {
    SEATS: SEATS, COURSES: COURSES,
    getReservations: getReservations, addReservation: addReservation, setStatus: setStatus, resetDemo: resetDemo,
    partySize: partySize, dateKey: dateKey, dateLabel: dateLabel, timeLabel: timeLabel, guestsLabel: guestsLabel
  };
})();
