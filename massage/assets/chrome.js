/* =========================================================================
   凪 NAGI — 共通レイアウト注入（サブページ用）
   架空案件バナー / トップナビ / フッター / スクロール演出 / モバイルメニュー。
   ここで扱うのは静的な定数マークアップのみ（外部・ユーザー入力は注入しない）。
   <body data-page="booking"> のように現在ページを指定すると active 表示。
   ========================================================================= */
"use strict";

(function () {
  const page = document.body.getAttribute("data-page") || "";
  const NAV = [
    { key: "home", href: "../", label: "サイト" },
    { key: "booking", href: "../booking/", label: "予約" },
    { key: "faq", href: "../faq/", label: "AI FAQ" },
    { key: "contact", href: "../contact/", label: "問い合わせ" },
    { key: "dashboard", href: "../dashboard/", label: "管理画面" },
    { key: "case", href: "../case-study/", label: "ケーススタディ" },
    { key: "impl", href: "../implementation/", label: "実装解説" }
  ];

  const navLinks = NAV.map((n) =>
    `<a href="${n.href}" class="${n.key === page ? "active" : ""}">${n.label}</a>`
  ).join("");

  const banner =
    `<div class="demo-banner">
       <b>PORTFOLIO DEMO</b>　架空のボディケアサロン「凪 NAGI」を題材にした<b>AI業務改善デモ</b>です。実在の店舗・医療行為とは関係ありません。
       <a href="../case-study/">案件の概要を見る →</a>
     </div>`;

  const topbar =
    `<header class="topbar">
       <a href="../" class="brand"><span class="k">凪</span><span class="en">NAGI</span></a>
       <nav class="nav-links" id="navLinks">
         ${navLinks}
         <a href="../booking/" class="pill solid">予約する</a>
       </nav>
       <button class="menu-toggle" id="menuToggle" aria-label="メニュー" aria-expanded="false">☰</button>
     </header>`;

  const footer =
    `<footer class="foot">
       <div class="wrap">
         <div class="ft-top">
           <div class="ft-brand">
             <div><span class="k mincho">凪</span> <span class="en">NAGI</span></div>
             <p>東京・中目黒（架空）。デスクワークで固まった肩・腰・首をほぐすボディケアサロン。予約・問い合わせ・FAQをAIで一体運用するデモです。</p>
           </div>
           <div class="ft-nav">
             <div class="ft-col">
               <h4>Pages</h4>
               <a href="../">サイトトップ</a>
               <a href="../booking/">予約フォーム</a>
               <a href="../faq/">AI FAQ チャット</a>
               <a href="../contact/">問い合わせ</a>
             </div>
             <div class="ft-col">
               <h4>Business</h4>
               <a href="../dashboard/">管理ダッシュボード</a>
               <a href="../case-study/">ケーススタディ</a>
               <a href="../implementation/">実装解説</a>
               <a href="../../">ポートフォリオ TOP</a>
             </div>
           </div>
         </div>
         <div class="ft-bottom">
           <span>© 2026 NAGI (fictional) — Portfolio demo. 架空案件です。</span>
           <span>Built with HTML / CSS / Vanilla JS — APIキー不要</span>
         </div>
       </div>
     </footer>`;

  // 注入：banner+topbar を先頭、footer を末尾に
  document.body.insertAdjacentHTML("afterbegin", banner + topbar);
  document.body.insertAdjacentHTML("beforeend", footer);

  // モバイルメニュー
  const toggle = document.getElementById("menuToggle");
  const links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // スクロール演出（.reveal を可視化）
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
