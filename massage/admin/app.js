// 凪 NAGI メニューCMS (demo). Vanilla JS + Supabase REST. XSS-safe (no innerHTML).
"use strict";

const SB = "https://ysgyhijsrwrzrawfceba.supabase.co/rest/v1";
const KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZ3loaWpzcndyenJhd2ZjZWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3Nzg0OTIsImV4cCI6MjA5NzM1NDQ5Mn0.LJ0K_RpQJ6CYPaas-cN59olZwCcUy6Y-mZA6OgVYD1Q";
const PASSCODE = "2026";
const TABLE = "/massage_menus";
const CATEGORIES = ["ボディ", "ヘッド", "フット", "ウェルネス", "スペシャル"];
const CAT_EN = { "ボディ": "Body", "ヘッド": "Head", "フット": "Foot", "ウェルネス": "Wellness", "スペシャル": "Special", "その他": "Other" };

const VIEW_META = {
  dash: { title: "ダッシュボード", sub: "メニューの状況をひと目で" },
  menu: { title: "メニュー管理", sub: "追加・編集・並び替え・公開設定" },
  preview: { title: "ライブプレビュー", sub: "公開サイトでの表示を確認" },
};

const state = { menus: [], view: "dash", search: "", catFilter: "", statusFilter: "", drag: null };
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));

// ---- Supabase REST ----
async function api(path, opts = {}) {
  const res = await fetch(SB + path, {
    method: opts.method || "GET",
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", Prefer: opts.prefer || "" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error("API " + res.status + ": " + (await res.text()));
  return res.status === 204 ? null : res.json();
}

// ---- DOM helpers ----
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function inputEl(o) { const i = document.createElement("input"); if (o.type) i.type = o.type; if (o.value != null) i.value = o.value; if (o.placeholder) i.placeholder = o.placeholder; if (o.min != null) i.min = o.min; if (o.list) i.setAttribute("list", o.list); return i; }
function textareaEl(v, p) { const t = document.createElement("textarea"); if (v != null) t.value = v; if (p) t.placeholder = p; return t; }
function selectEl(opts, sel) { const s = document.createElement("select"); opts.forEach((o) => { const op = el("option", null, o.label); op.value = o.value; if (o.value === sel) op.selected = true; s.appendChild(op); }); return s; }
function field(label, node, sub) { const f = el("div", "field"); f.appendChild(el("label", null, label)); f.appendChild(node); if (sub) f.appendChild(el("div", "sub", sub)); return f; }
function row2(a, b) { const d = el("div", "row2"); d.append(a, b); return d; }
function yen(n) { return "¥" + Number(n).toLocaleString("ja-JP"); }
function toast(msg) { const t = $("#toast"); t.replaceChildren(el("span", "dot"), document.createTextNode(msg)); t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2100); }
function catOf(m) { return (m.category || "").trim() || "その他"; }
function catList() { const set = []; CATEGORIES.forEach((c) => set.push(c)); state.menus.forEach((m) => { const c = catOf(m); if (set.indexOf(c) === -1) set.push(c); }); return set; }

// ---- load ----
async function loadAll() {
  if (state.menus.length === 0) showSkeleton();
  try {
    const menus = await api(TABLE + "?select=*&order=sort_order.asc");
    state.menus = menus || [];
    renderAll();
  } catch (e) { toast("読み込みに失敗しました"); console.error(e); }
}
function showSkeleton() {
  const list = $("#menuList"); list.replaceChildren();
  for (let i = 0; i < 4; i++) list.appendChild(el("div", "skel"));
}

function renderAll() {
  $("#navCount").textContent = String(state.menus.length);
  renderDashboard();
  renderCatFilter();
  renderMenuList();
}

// ================= DASHBOARD =================
function renderDashboard() {
  const total = state.menus.length;
  const active = state.menus.filter((m) => m.active).length;
  const off = total - active;
  const cats = {};
  state.menus.forEach((m) => { cats[catOf(m)] = (cats[catOf(m)] || 0) + 1; });
  const catCount = Object.keys(cats).length;
  const prices = state.menus.map((m) => Number(m.price)).filter((n) => n > 0);
  const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const min = prices.length ? Math.min.apply(null, prices) : 0;
  const max = prices.length ? Math.max.apply(null, prices) : 0;

  const kpis = $("#kpis"); kpis.replaceChildren();
  const card = (label, n, small, sub, accent, spark) => {
    const c = el("div", "kpi" + (accent ? " accent" : ""));
    if (spark) c.appendChild(el("div", "spark", spark));
    c.appendChild(el("div", "l", label));
    const nn = el("div", "n"); nn.appendChild(document.createTextNode(n)); if (small) nn.appendChild(el("small", null, " " + small));
    c.appendChild(nn);
    if (sub) c.appendChild(el("div", "s", sub));
    return c;
  };
  kpis.append(
    card("総メニュー数", String(total), "件", catCount + " カテゴリ", false, "☰"),
    card("公開中", String(active), "件", "サイトに表示中", true, "●"),
    card("非公開（下書き）", String(off), "件", "サイト未掲載", false, "○"),
    card("平均料金", yen(avg), "", prices.length ? yen(min) + " 〜 " + yen(max) : "—", false, "¥"),
  );

  const bar = $("#catbar"); bar.replaceChildren();
  const maxCount = Math.max.apply(null, Object.values(cats).concat([1]));
  catList().forEach((c) => {
    if (!cats[c]) return;
    const row = el("div", "row");
    const cn = el("div", "cn"); cn.appendChild(document.createTextNode(c)); cn.appendChild(el("span", "en", CAT_EN[c] || ""));
    const track = el("div", "track"); const fill = el("div", "fill"); fill.style.width = Math.round((cats[c] / maxCount) * 100) + "%"; track.appendChild(fill);
    row.append(cn, track, el("div", "v", cats[c] + "件"));
    bar.appendChild(row);
  });
}

// ================= MENU LIST =================
function renderCatFilter() {
  const sel = $("#catFilter"); const cur = state.catFilter;
  sel.replaceChildren();
  const all = el("option", null, "すべてのカテゴリ"); all.value = ""; sel.appendChild(all);
  catList().forEach((c) => { if (state.menus.some((m) => catOf(m) === c)) { const o = el("option", null, c); o.value = c; sel.appendChild(o); } });
  sel.value = cur;
}

function passFilter(m) {
  if (state.statusFilter === "active" && !m.active) return false;
  if (state.statusFilter === "off" && m.active) return false;
  if (state.catFilter && catOf(m) !== state.catFilter) return false;
  if (state.search) {
    const q = state.search.toLowerCase();
    if (![m.name, m.description, m.category].join(" ").toLowerCase().includes(q)) return false;
  }
  return true;
}

function renderMenuList() {
  const list = $("#menuList"); list.replaceChildren();
  if (state.menus.length === 0) {
    const e = el("div", "empty"); e.appendChild(el("div", "big", "メニューがまだありません")); e.appendChild(document.createTextNode("右上の「＋ メニューを追加」から登録してください。")); list.appendChild(e); return;
  }
  const visible = state.menus.filter(passFilter);
  if (visible.length === 0) {
    const e = el("div", "empty"); e.appendChild(el("div", "big", "条件に合うメニューがありません")); e.appendChild(document.createTextNode("検索・絞り込みを変更してください。")); list.appendChild(e); return;
  }
  catList().forEach((cat) => {
    const items = state.menus.filter((m) => catOf(m) === cat);
    const shown = items.filter(passFilter);
    if (shown.length === 0) return;
    const group = el("div", "catgroup");
    const gh = el("div", "gh");
    gh.appendChild(el("span", "jp", cat));
    gh.appendChild(el("span", "en", CAT_EN[cat] || ""));
    gh.appendChild(el("span", "ct", items.length + "件"));
    group.appendChild(gh);
    const cards = el("div", "cards");
    items.forEach((m, posInCat) => { if (passFilter(m)) cards.appendChild(menuRow(m, cat, posInCat, items.length)); });
    group.appendChild(cards);
    list.appendChild(group);
  });
}

function menuRow(m, cat, pos, catLen) {
  const row = el("div", "mrow" + (m.active ? "" : " off"));
  row.draggable = true;
  const reorderable = !state.search && !state.catFilter && !state.statusFilter;

  // handle (grip + arrows)
  const handle = el("div", "handle");
  const grip = el("div", "grip", "⠿"); grip.title = reorderable ? "ドラッグで並び替え" : "並び替えは絞り込み解除後に";
  handle.appendChild(grip);
  const arr = el("div", "arr");
  const up = el("button", null, "▲"); up.title = "上へ"; up.disabled = pos === 0 || !reorderable; up.onclick = () => moveWithinCat(cat, pos, pos - 1);
  const down = el("button", null, "▼"); down.title = "下へ"; down.disabled = pos === catLen - 1 || !reorderable; down.onclick = () => moveWithinCat(cat, pos, pos + 1);
  arr.append(up, down); handle.appendChild(arr);

  // mid
  const mid = el("div", "mid");
  const nm = el("div", "mname"); nm.appendChild(document.createTextNode(m.name));
  nm.appendChild(el("span", "chip" + (m.active ? "" : " off"), m.active ? cat : "非公開"));
  mid.appendChild(nm);
  const meta = el("div", "mmeta");
  meta.appendChild(el("span", "price", yen(m.price)));
  meta.appendChild(document.createTextNode("　"));
  meta.appendChild(el("span", "dur", m.duration_min ? m.duration_min + "分" : "時間未設定"));
  if (m.description) meta.appendChild(document.createTextNode("　/　" + m.description));
  mid.appendChild(meta);

  // right
  const right = el("div", "right");
  const sw = el("div", "switch");
  sw.appendChild(el("span", null, m.active ? "公開" : "非公開"));
  const toggle = el("button", "toggle" + (m.active ? " on" : "")); toggle.title = "公開/非公開を切り替え"; toggle.onclick = () => toggleMenu(m);
  sw.appendChild(toggle);
  right.appendChild(sw);
  const edit = el("button", "iconbtn", "✎"); edit.title = "編集"; edit.onclick = () => openMenuModal(m);
  const dup = el("button", "iconbtn", "⧉"); dup.title = "複製"; dup.onclick = () => duplicateMenu(m);
  const del = el("button", "iconbtn del", "🗑"); del.title = "削除"; del.onclick = () => deleteMenu(m);
  right.append(edit, dup, del);

  row.append(handle, mid, right);

  // drag and drop (within same category)
  if (reorderable) {
    row.addEventListener("dragstart", (e) => { state.drag = { cat, pos }; row.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; });
    row.addEventListener("dragend", () => { row.classList.remove("dragging"); $$(".mrow.dragover").forEach((r) => r.classList.remove("dragover")); state.drag = null; });
    row.addEventListener("dragover", (e) => { if (state.drag && state.drag.cat === cat) { e.preventDefault(); row.classList.add("dragover"); } });
    row.addEventListener("dragleave", () => row.classList.remove("dragover"));
    row.addEventListener("drop", (e) => { e.preventDefault(); row.classList.remove("dragover"); if (state.drag && state.drag.cat === cat && state.drag.pos !== pos) moveWithinCat(cat, state.drag.pos, pos); });
  } else {
    row.draggable = false;
  }
  return row;
}

// ---- reorder helpers ----
function globalIndicesOfCat(cat) {
  const out = []; state.menus.forEach((m, i) => { if (catOf(m) === cat) out.push(i); }); return out;
}
async function moveWithinCat(cat, from, to) {
  const idxs = globalIndicesOfCat(cat);
  if (to < 0 || to >= idxs.length || from === to) return;
  const items = idxs.map((i) => state.menus[i]);
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  idxs.forEach((gi, k) => { state.menus[gi] = items[k]; });
  renderMenuList(); renderDashboard();
  await persistOrder();
  toast("並び順を保存しました");
}
async function persistOrder() {
  const changed = [];
  state.menus.forEach((m, i) => { const so = i + 1; if (m.sort_order !== so) { m.sort_order = so; changed.push(m); } });
  try { await Promise.all(changed.map((m) => api(`${TABLE}?id=eq.${m.id}`, { method: "PATCH", body: { sort_order: m.sort_order } }))); }
  catch (e) { toast("並び替えの保存に失敗しました"); }
}

// ---- actions ----
async function toggleMenu(m) {
  try { await api(`${TABLE}?id=eq.${m.id}`, { method: "PATCH", body: { active: !m.active } }); m.active = !m.active; renderAll(); toast(m.active ? "公開しました（サイトに表示）" : "非公開にしました"); }
  catch (e) { toast("変更に失敗しました"); }
}
async function duplicateMenu(m) {
  const body = { name: m.name + "（コピー）", category: m.category, price: m.price, duration_min: m.duration_min, description: m.description, active: false, sort_order: state.menus.reduce((mx, x) => Math.max(mx, x.sort_order), 0) + 1 };
  try { const created = await api(TABLE, { method: "POST", prefer: "return=representation", body }); state.menus.push(created[0]); state.menus.sort((a, b) => a.sort_order - b.sort_order); renderAll(); toast("複製しました（非公開で追加）"); }
  catch (e) { toast("複製に失敗しました"); }
}
async function deleteMenu(m) {
  if (!confirm(`メニュー「${m.name}」を削除しますか？\nこの操作は元に戻せません。`)) return;
  try { await api(`${TABLE}?id=eq.${m.id}`, { method: "DELETE" }); state.menus = state.menus.filter((x) => x.id !== m.id); renderAll(); toast("削除しました"); }
  catch (e) { toast("削除に失敗しました"); }
}

function openMenuModal(m) {
  const isNew = !m;
  const mName = inputEl({ value: m ? m.name : "", placeholder: "例）アロマトリートメント" });
  const mCat = inputEl({ value: m ? m.category : "", placeholder: "例）ボディ", list: "catList" });
  const mPrice = inputEl({ type: "number", min: 0, value: m ? m.price : "", placeholder: "例）8800" });
  const mDur = inputEl({ type: "number", min: 0, value: m && m.duration_min ? m.duration_min : "", placeholder: "例）60" });
  const mActive = selectEl([{ value: "true", label: "公開する（サイトに表示）" }, { value: "false", label: "非公開（下書き）" }], m && !m.active ? "false" : "true");
  const mDesc = textareaEl(m ? m.description : "", "お客様に伝わる一言説明（任意）");
  const nodes = [
    field("メニュー名", mName, "お客様に表示される名前です。"),
    row2(field("カテゴリ", mCat, "例：ボディ / ヘッド"), field("料金（円・税込）", mPrice, "数字のみ")),
    row2(field("所要時間（分）", mDur, "空欄でもOK"), field("公開状態", mActive)),
    field("説明", mDesc),
  ];
  openModal(isNew ? "メニューを追加" : "メニューを編集", nodes, async () => {
    const name = mName.value.trim();
    if (!name) { toast("メニュー名を入力してください"); return false; }
    const price = parseInt(mPrice.value, 10);
    if (isNaN(price) || price < 0) { toast("料金を正しく入力してください"); return false; }
    const body = { name, category: mCat.value.trim(), price, duration_min: parseInt(mDur.value, 10) || null, description: mDesc.value.trim(), active: mActive.value === "true" };
    try {
      if (isNew) { body.sort_order = state.menus.reduce((mx, x) => Math.max(mx, x.sort_order), 0) + 1; const created = await api(TABLE, { method: "POST", prefer: "return=representation", body }); state.menus.push(created[0]); }
      else { await api(`${TABLE}?id=eq.${m.id}`, { method: "PATCH", body }); Object.assign(m, body); }
      state.menus.sort((a, b) => a.sort_order - b.sort_order); renderAll(); toast(isNew ? "メニューを追加しました" : "保存しました"); return true;
    } catch (e) { toast("保存に失敗しました"); return false; }
  });
}

// ================= modal =================
function openModal(title, nodes, onSave) {
  const bg = el("div", "modal-bg");
  const modal = el("div", "modal");
  modal.appendChild(el("h3", null, title));
  const body = el("div", "body"); nodes.forEach((n) => body.appendChild(n)); modal.appendChild(body);
  const foot = el("div", "foot");
  const cancel = el("button", "btn btn-ghost", "キャンセル");
  const ok = el("button", "btn btn-primary", "保存する");
  foot.append(cancel, ok); modal.appendChild(foot);
  bg.appendChild(modal);
  const close = () => bg.remove();
  cancel.onclick = close;
  bg.onclick = (e) => { if (e.target === bg) close(); };
  ok.onclick = async () => { const r = await onSave(); if (r !== false) close(); };
  document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
  document.body.appendChild(bg);
  const first = modal.querySelector("input, textarea, select"); if (first) first.focus();
}

// ================= views / preview =================
function switchView(v) {
  state.view = v;
  $$(".navitem").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  ["dash", "menu", "preview"].forEach((k) => $("#view-" + k).classList.toggle("hidden", k !== v));
  $("#pageTitle").childNodes[0].nodeValue = VIEW_META[v].title;
  $("#pageSub").textContent = VIEW_META[v].sub;
  $("#addMenuBtn").style.display = v === "menu" ? "" : "none";
  if (v === "preview") reloadFrame();
}
function reloadFrame() { const f = $("#previewFrame"); f.src = "../?t=" + (f.dataset.n = String((+f.dataset.n || 0) + 1)); }

function startApp() {
  $("#gate").style.display = "none";
  $("#app").style.display = "grid";
  loadAll();
}
function tryLogin() {
  if ($("#passInput").value === PASSCODE) { sessionStorage.setItem("nagi_admin", "1"); startApp(); }
  else { $("#passErr").textContent = "パスコードが違います"; $("#passInput").value = ""; }
}

document.addEventListener("DOMContentLoaded", () => {
  // category datalist for the form
  const dl = document.createElement("datalist"); dl.id = "catList";
  CATEGORIES.forEach((c) => { const o = document.createElement("option"); o.value = c; dl.appendChild(o); });
  document.body.appendChild(dl);

  $("#passBtn").onclick = tryLogin;
  $("#passInput").addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });
  $("#reloadBtn").onclick = () => { loadAll(); if (state.view === "preview") reloadFrame(); toast("最新の状態に更新しました"); };
  $("#addMenuBtn").onclick = () => openMenuModal(null);
  $("#logoutBtn").onclick = (e) => { e.preventDefault(); sessionStorage.removeItem("nagi_admin"); location.reload(); };
  $$(".navitem").forEach((b) => (b.onclick = () => switchView(b.dataset.view)));

  $("#search").addEventListener("input", (e) => { state.search = e.target.value.trim(); renderMenuList(); });
  $("#catFilter").addEventListener("change", (e) => { state.catFilter = e.target.value; renderMenuList(); });
  $("#statusFilter").addEventListener("change", (e) => { state.statusFilter = e.target.value; renderMenuList(); });

  $$(".preview-bar .seg button").forEach((b) => (b.onclick = () => {
    $$(".preview-bar .seg button").forEach((x) => x.classList.toggle("active", x === b));
    $("#previewFrame").classList.toggle("sp", b.dataset.dev === "sp");
  }));
  $("#frameReload").onclick = () => { reloadFrame(); toast("プレビューを更新しました"); };

  if (sessionStorage.getItem("nagi_admin") === "1") startApp();
});
