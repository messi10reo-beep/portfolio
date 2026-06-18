// Bone Studios 予約管理ダッシュボード (demo). Vanilla JS + Supabase REST. No innerHTML.
"use strict";

const SB = "https://ysgyhijsrwrzrawfceba.supabase.co/rest/v1";
const KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZ3loaWpzcndyenJhd2ZjZWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3Nzg0OTIsImV4cCI6MjA5NzM1NDQ5Mn0.LJ0K_RpQJ6CYPaas-cN59olZwCcUy6Y-mZA6OgVYD1Q";
const PASSCODE = "2026";
const STATUSES = ["新規", "確認済", "確定", "来店済", "キャンセル"];
const METHODS = ["Instagram", "LINE", "電話", "メール"];

const state = { menus: [], reservations: [] };
const $ = (sel) => document.querySelector(sel);

// ---- Supabase REST helper ----
async function api(path, opts = {}) {
  const res = await fetch(SB + path, {
    method: opts.method || "GET",
    headers: {
      apikey: KEY,
      Authorization: "Bearer " + KEY,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error("API " + res.status + ": " + (await res.text()));
  return res.status === 204 ? null : res.json();
}

// ---- DOM helpers (no innerHTML) ----
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function inputEl(opts) {
  const i = document.createElement("input");
  if (opts.type) i.type = opts.type;
  if (opts.value != null) i.value = opts.value;
  if (opts.placeholder) i.placeholder = opts.placeholder;
  if (opts.min != null) i.min = opts.min;
  return i;
}
function textareaEl(value, placeholder) {
  const t = document.createElement("textarea");
  if (value != null) t.value = value;
  if (placeholder) t.placeholder = placeholder;
  return t;
}
function selectEl(options, selected) {
  const s = document.createElement("select");
  options.forEach((o) => {
    const opt = el("option", null, o.label);
    opt.value = o.value;
    if (o.value === selected) opt.selected = true;
    s.appendChild(opt);
  });
  return s;
}
function field(labelText, node) {
  const f = el("div", "field");
  f.appendChild(el("label", null, labelText));
  f.appendChild(node);
  return f;
}
function row2(a, b) {
  const d = el("div", "row2");
  d.append(a, b);
  return d;
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1900);
}
const WD = ["日", "月", "火", "水", "木", "金", "土"];
function fmtDate(iso) {
  if (!iso) return "日時未定";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]}) ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---- data load ----
async function loadAll() {
  $("#loading").style.display = "block";
  try {
    const [menus, res] = await Promise.all([
      api("/menus?select=*&order=sort_order.asc"),
      api("/reservations?select=*&order=reserved_at.asc"),
    ]);
    state.menus = menus || [];
    state.reservations = res || [];
    renderReservations();
    renderMenus();
  } catch (e) {
    toast("読み込みに失敗しました");
    console.error(e);
  } finally {
    $("#loading").style.display = "none";
  }
}

// ================= 予約 =================
function renderSummary() {
  const counts = {};
  STATUSES.forEach((s) => (counts[s] = 0));
  state.reservations.forEach((r) => {
    if (counts[r.status] !== undefined) counts[r.status]++;
  });
  const box = $("#summary");
  box.textContent = "";
  STATUSES.forEach((s) => {
    const c = el("div", "sum");
    c.appendChild(el("div", "n", String(counts[s])));
    c.appendChild(el("div", "l", s));
    box.appendChild(c);
  });
}

function filteredReservations() {
  const q = $("#resSearch").value.trim().toLowerCase();
  const f = $("#resFilter").value;
  return state.reservations.filter((r) => {
    if (f && r.status !== f) return false;
    if (!q) return true;
    return [r.customer_name, r.contact_value, r.menu_name].join(" ").toLowerCase().includes(q);
  });
}

function renderReservations() {
  renderSummary();
  const list = $("#resList");
  list.textContent = "";
  const rows = filteredReservations();
  if (rows.length === 0) {
    list.appendChild(el("div", "empty", "該当する予約はありません"));
    return;
  }
  rows.forEach((r) => list.appendChild(reservationRow(r)));
}

function reservationRow(r) {
  const row = el("div", "row");
  const main = el("div", "main");
  main.appendChild(el("div", "when", fmtDate(r.reserved_at)));
  main.appendChild(el("div", "name", r.customer_name));
  main.appendChild(el("div", "meta", `${r.menu_name || "メニュー未選択"}　/　${r.contact_method} ${r.contact_value}`));
  if (r.note) main.appendChild(el("div", "note", "メモ: " + r.note));

  const side = el("div", "side");
  const sel = selectEl(STATUSES.map((s) => ({ value: s, label: s })), r.status);
  sel.className = "status";
  sel.onchange = () => changeStatus(r, sel.value);
  side.appendChild(sel);
  const acts = el("div", "acts");
  const edit = el("button", "btn btn-ghost btn-sm", "編集");
  edit.onclick = () => openResModal(r);
  const del = el("button", "btn btn-danger btn-sm", "削除");
  del.onclick = () => deleteReservation(r);
  acts.append(edit, del);
  side.appendChild(acts);
  row.append(main, side);
  return row;
}

async function changeStatus(r, status) {
  try {
    await api(`/reservations?id=eq.${r.id}`, { method: "PATCH", body: { status } });
    r.status = status;
    renderSummary();
    toast("ステータスを保存しました");
  } catch (e) {
    toast("保存に失敗しました");
  }
}

async function deleteReservation(r) {
  if (!confirm(`「${r.customer_name}」さんの予約を削除しますか？\nこの操作は元に戻せません。`)) return;
  try {
    await api(`/reservations?id=eq.${r.id}`, { method: "DELETE" });
    state.reservations = state.reservations.filter((x) => x.id !== r.id);
    renderReservations();
    toast("削除しました");
  } catch (e) {
    toast("削除に失敗しました");
  }
}

function openResModal(r) {
  const isNew = !r;
  const fName = inputEl({ value: r ? r.customer_name : "", placeholder: "山田 花子" });
  const fWhen = inputEl({ type: "datetime-local", value: r ? toLocalInput(r.reserved_at) : "" });
  const menuOpts = [{ value: "", label: "（メニューを選択）" }].concat(
    state.menus.filter((m) => m.active).map((m) => ({ value: m.name, label: m.name }))
  );
  const fMenu = selectEl(menuOpts, r ? r.menu_name : "");
  const fMethod = selectEl(METHODS.map((m) => ({ value: m, label: m })), r ? r.contact_method : "Instagram");
  const fContact = inputEl({ value: r ? r.contact_value : "", placeholder: "@id / 電話番号など" });
  const fStatus = selectEl(STATUSES.map((s) => ({ value: s, label: s })), r ? r.status : "新規");
  const fNote = textareaEl(r ? r.note : "", "ご要望など");

  const nodes = [
    field("お名前", fName),
    field("予約日時", fWhen),
    field("メニュー", fMenu),
    row2(field("連絡方法", fMethod), field("連絡先", fContact)),
    field("ステータス", fStatus),
    field("メモ", fNote),
  ];
  openModal(isNew ? "予約を追加" : "予約を編集", nodes, async () => {
    const name = fName.value.trim();
    if (!name) { toast("お名前を入力してください"); return false; }
    const body = {
      customer_name: name,
      reserved_at: fWhen.value ? new Date(fWhen.value).toISOString() : null,
      menu_name: fMenu.value,
      contact_method: fMethod.value,
      contact_value: fContact.value.trim(),
      status: fStatus.value,
      note: fNote.value.trim(),
    };
    try {
      if (isNew) {
        const created = await api("/reservations", { method: "POST", prefer: "return=representation", body });
        state.reservations.push(created[0]);
      } else {
        await api(`/reservations?id=eq.${r.id}`, { method: "PATCH", body });
        Object.assign(r, body);
      }
      state.reservations.sort((a, b) => String(a.reserved_at).localeCompare(String(b.reserved_at)));
      renderReservations();
      toast(isNew ? "予約を追加しました" : "保存しました");
      return true;
    } catch (e) { toast("保存に失敗しました"); return false; }
  });
}

function exportCsv() {
  const head = ["予約日時", "お名前", "連絡方法", "連絡先", "メニュー", "ステータス", "メモ"];
  const lines = [head.join(",")];
  filteredReservations().forEach((r) => {
    const cells = [fmtDate(r.reserved_at), r.customer_name, r.contact_method, r.contact_value, r.menu_name, r.status, r.note];
    lines.push(cells.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(","));
  });
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "予約一覧.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("CSVを書き出しました");
}

// ================= メニュー =================
function renderMenus() {
  const list = $("#menuList");
  list.textContent = "";
  if (state.menus.length === 0) {
    list.appendChild(el("div", "empty", "メニューがありません。「＋ メニューを追加」から登録してください。"));
    return;
  }
  state.menus.forEach((m, i) => list.appendChild(menuRow(m, i)));
}

function menuRow(m, i) {
  const row = el("div", "mrow" + (m.active ? "" : " off"));
  const order = el("div", "order");
  const up = el("button", null, "▲");
  up.title = "上へ"; up.disabled = i === 0; up.onclick = () => moveMenu(i, -1);
  const down = el("button", null, "▼");
  down.title = "下へ"; down.disabled = i === state.menus.length - 1; down.onclick = () => moveMenu(i, 1);
  order.append(up, down);

  const mid = el("div");
  const nm = el("div", "mname", m.name);
  if (!m.active) nm.appendChild(el("span", "badge b-来店済", " 非公開"));
  mid.appendChild(nm);
  mid.appendChild(el("div", "mmeta", `${m.category || "カテゴリなし"}　/　${m.duration_min ? m.duration_min + "分" : "—"}${m.description ? "　/ " + m.description : ""}`));

  const right = el("div", "side");
  right.appendChild(el("div", "price", "¥" + Number(m.price).toLocaleString()));
  const acts = el("div", "acts");
  const toggle = el("button", "btn btn-ghost btn-sm", m.active ? "非公開にする" : "公開する");
  toggle.onclick = () => toggleMenu(m);
  const edit = el("button", "btn btn-ghost btn-sm", "編集");
  edit.onclick = () => openMenuModal(m);
  const del = el("button", "btn btn-danger btn-sm", "削除");
  del.onclick = () => deleteMenu(m);
  acts.append(toggle, edit, del);
  right.appendChild(acts);

  row.append(order, mid, right);
  return row;
}

async function toggleMenu(m) {
  try {
    await api(`/menus?id=eq.${m.id}`, { method: "PATCH", body: { active: !m.active } });
    m.active = !m.active;
    renderMenus();
    toast(m.active ? "公開しました" : "非公開にしました");
  } catch (e) { toast("変更に失敗しました"); }
}

async function moveMenu(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= state.menus.length) return;
  const a = state.menus[i], b = state.menus[j];
  const ao = a.sort_order, bo = b.sort_order;
  try {
    await Promise.all([
      api(`/menus?id=eq.${a.id}`, { method: "PATCH", body: { sort_order: bo } }),
      api(`/menus?id=eq.${b.id}`, { method: "PATCH", body: { sort_order: ao } }),
    ]);
    a.sort_order = bo; b.sort_order = ao;
    state.menus.sort((x, y) => x.sort_order - y.sort_order);
    renderMenus();
  } catch (e) { toast("並び替えに失敗しました"); }
}

async function deleteMenu(m) {
  if (!confirm(`メニュー「${m.name}」を削除しますか？`)) return;
  try {
    await api(`/menus?id=eq.${m.id}`, { method: "DELETE" });
    state.menus = state.menus.filter((x) => x.id !== m.id);
    renderMenus();
    toast("削除しました");
  } catch (e) { toast("削除に失敗しました"); }
}

function openMenuModal(m) {
  const isNew = !m;
  const mName = inputEl({ value: m ? m.name : "", placeholder: "カット＋カラー" });
  const mCat = inputEl({ value: m ? m.category : "", placeholder: "ヘア" });
  const mPrice = inputEl({ type: "number", min: 0, value: m ? m.price : "", placeholder: "5500" });
  const mDur = inputEl({ type: "number", min: 0, value: m && m.duration_min ? m.duration_min : "", placeholder: "60" });
  const mActive = selectEl([{ value: "true", label: "公開" }, { value: "false", label: "非公開" }], m && !m.active ? "false" : "true");
  const mDesc = textareaEl(m ? m.description : "", "お客様向けの一言説明");

  const nodes = [
    field("メニュー名", mName),
    row2(field("カテゴリ", mCat), field("料金（円）", mPrice)),
    row2(field("所要時間（分）", mDur), field("公開状態", mActive)),
    field("説明", mDesc),
  ];
  openModal(isNew ? "メニューを追加" : "メニューを編集", nodes, async () => {
    const name = mName.value.trim();
    if (!name) { toast("メニュー名を入力してください"); return false; }
    const body = {
      name,
      category: mCat.value.trim(),
      price: parseInt(mPrice.value, 10) || 0,
      duration_min: parseInt(mDur.value, 10) || null,
      description: mDesc.value.trim(),
      active: mActive.value === "true",
    };
    try {
      if (isNew) {
        body.sort_order = state.menus.reduce((mx, x) => Math.max(mx, x.sort_order), 0) + 1;
        const created = await api("/menus", { method: "POST", prefer: "return=representation", body });
        state.menus.push(created[0]);
      } else {
        await api(`/menus?id=eq.${m.id}`, { method: "PATCH", body });
        Object.assign(m, body);
      }
      renderMenus();
      toast(isNew ? "メニューを追加しました" : "保存しました");
      return true;
    } catch (e) { toast("保存に失敗しました"); return false; }
  });
}

// ================= modal / boot =================
function openModal(title, nodes, onSave) {
  const bg = el("div", "modal-bg");
  const modal = el("div", "modal");
  modal.appendChild(el("h3", null, title));
  const body = el("div", "body");
  nodes.forEach((n) => body.appendChild(n));
  modal.appendChild(body);
  const foot = el("div", "foot");
  const cancel = el("button", "btn btn-ghost", "キャンセル");
  const ok = el("button", "btn btn-primary", "保存する");
  foot.append(cancel, ok);
  modal.appendChild(foot);
  bg.appendChild(modal);
  const close = () => bg.remove();
  cancel.onclick = close;
  bg.onclick = (e) => { if (e.target === bg) close(); };
  ok.onclick = async () => { const r = await onSave(); if (r !== false) close(); };
  document.body.appendChild(bg);
}

function startApp() {
  $("#gate").style.display = "none";
  loadAll();
}
function tryLogin() {
  if ($("#passInput").value === PASSCODE) {
    sessionStorage.setItem("bs_admin", "1");
    startApp();
  } else {
    $("#passErr").textContent = "パスコードが違います";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("#passBtn").onclick = tryLogin;
  $("#passInput").addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });
  $("#reloadBtn").onclick = loadAll;
  $("#exportBtn").onclick = exportCsv;
  $("#addResBtn").onclick = () => openResModal(null);
  $("#addMenuBtn").onclick = () => openMenuModal(null);
  $("#resSearch").addEventListener("input", renderReservations);
  $("#resFilter").addEventListener("change", renderReservations);
  document.querySelectorAll(".tab").forEach((t) => {
    t.onclick = () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
      $("#panel-yoyaku").classList.toggle("hidden", t.dataset.tab !== "yoyaku");
      $("#panel-menu").classList.toggle("hidden", t.dataset.tab !== "menu");
    };
  });
  if (sessionStorage.getItem("bs_admin") === "1") startApp();
  else $("#loading").style.display = "none";
});
