// ============================================================
// site.js — 全ページ共通の演出スクリプト（バニラJS・自己完結）
// 設計方針:
//   - 中身を絶対に隠さない。.reveal を opacity:0 にするのは <html class="js"> の時だけ
//   - IntersectionObserver で表示域に入った要素へ .is-in を付与
//   - セーフティ: window.load 後 と 2.5秒タイマーで未表示の .reveal を強制表示
//   - prefers-reduced-motion: reduce の時は監視を行わず即時 全表示
//   - innerHTML 不使用（textContent / createElement のみ）
// ============================================================
(function () {
  "use strict";

  var docEl = document.documentElement;
  // JS有効を示すフラグ。これが付いている時だけ CSS が .reveal を隠す。
  docEl.classList.add("js");

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ----------------------------------------------------------
  // ハンバーガーメニュー（全ページ共通）
  // ----------------------------------------------------------
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("primary-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute(
        "aria-label",
        !open ? "メニューを閉じる" : "メニューを開く"
      );
    });
  }

  // ----------------------------------------------------------
  // スクロールリビール
  // ----------------------------------------------------------
  function revealAll() {
    var items = document.querySelectorAll(".reveal");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.add("is-in");
    }
  }

  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    // reduced-motion もしくは IO 非対応なら、隠さず即時全表示
    if (prefersReduced || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    var io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    items.forEach(function (el) {
      io.observe(el);
    });

    // セーフティ1: ページ読み込み完了後、画面内にあるのに未発火の要素を救済
    window.addEventListener("load", function () {
      window.setTimeout(function () {
        items.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) {
            el.classList.add("is-in");
          }
        });
      }, 200);
    });

    // セーフティ2: 2.5秒後、まだ隠れている .reveal を全て強制表示
    window.setTimeout(function () {
      revealAll();
    }, 2500);
  }

  // ----------------------------------------------------------
  // スティッキーヘッダー（スクロールで縮む＋背景強調）
  // ----------------------------------------------------------
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var ticking = false;
    function update() {
      if (window.scrollY > 24) {
        header.classList.add("is-scrolled");
      } else {
        header.classList.remove("is-scrolled");
      }
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  // ----------------------------------------------------------
  // ヒーロー背景の軽いパララックス（reduced-motion では無効）
  // ----------------------------------------------------------
  function initParallax() {
    if (prefersReduced) return;
    var targets = document.querySelectorAll("[data-parallax]");
    if (!targets.length) return;
    var ticking = false;
    function update() {
      var y = window.scrollY;
      targets.forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.15;
        el.style.transform = "translate3d(0," + y * speed + "px,0) scale(1.08)";
      });
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  // ----------------------------------------------------------
  // マーキー（無限ループ）: 内容を複製してシームレスにする
  // markup: <div class="marquee"><div class="marquee__track">...</div></div>
  // ----------------------------------------------------------
  function initMarquee() {
    if (prefersReduced) return;
    var tracks = document.querySelectorAll(".marquee__track");
    tracks.forEach(function (track) {
      var clone = track.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.parentNode.appendChild(clone);
    });
  }

  // ----------------------------------------------------------
  // 数字カウントアップ（任意・data-count を持つ要素）
  // ----------------------------------------------------------
  function initCountUp() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute("data-count")) || 0;
      var suffix = el.getAttribute("data-count-suffix") || "";
      if (prefersReduced) {
        el.textContent = String(target) + suffix;
        return;
      }
      var dur = 1400;
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased)) + suffix;
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in window)) {
      nums.forEach(run);
      return;
    }
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            run(e.target);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    nums.forEach(function (el) {
      io.observe(el);
    });
  }

  function init() {
    initNav();
    initReveal();
    initHeader();
    initParallax();
    initMarquee();
    initCountUp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
