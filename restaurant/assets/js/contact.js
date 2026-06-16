// ============================================================
// contact.js — ご予約・お問い合わせフォームのクライアント検証
// セキュリティ方針:
//   - innerHTML は使用しない（textContent / createElement のみ）
//   - 全入力はバリデーションを通す
// ============================================================
(function () {
  "use strict";

  // --- XSS guard hook: warn if innerHTML is ever assigned on this page ---
  // (開発用フック。本番でも害はないが console を汚さないよう warn のみ)
  try {
    var proto = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
    if (proto && proto.set) {
      Object.defineProperty(Element.prototype, "innerHTML", {
        set: function (value) {
          console.warn("[security] innerHTML への代入を検知しました。textContent / createElement を使用してください。");
          proto.set.call(this, value);
        },
        get: proto.get,
        configurable: true,
      });
    }
  } catch (e) {
    /* noop: 環境によっては再定義不可 */
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("reservation-form");
    if (!form) {
      return;
    }

    var statusBox = document.getElementById("form-status");

    /** フィールド定義（id と検証ルール） */
    var rules = [
      {
        id: "name",
        label: "お名前",
        validate: function (v) {
          if (!v.trim()) return "お名前を入力してください。";
          if (v.trim().length > 50) return "お名前は50文字以内で入力してください。";
          return "";
        },
      },
      {
        id: "tel",
        label: "電話番号",
        validate: function (v) {
          var t = v.trim();
          if (!t) return "電話番号を入力してください。";
          // 数字・ハイフン・括弧・スペース・+ を許可、数字は10〜11桁
          if (!/^[0-9+\-()\s]+$/.test(t)) return "電話番号は数字とハイフンで入力してください。";
          var digits = t.replace(/\D/g, "");
          if (digits.length < 10 || digits.length > 11) {
            return "電話番号は10〜11桁で入力してください。";
          }
          return "";
        },
      },
      {
        id: "email",
        label: "メールアドレス",
        validate: function (v) {
          var t = v.trim();
          if (!t) return "メールアドレスを入力してください。";
          // 実用的な簡易メール検証
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
            return "メールアドレスの形式が正しくありません。";
          }
          return "";
        },
      },
      {
        id: "guests",
        label: "ご来店人数",
        validate: function (v) {
          if (!v) return "ご来店人数を選択してください。";
          return "";
        },
      },
      {
        id: "datetime",
        label: "ご希望日時",
        validate: function (v) {
          if (!v) return "ご希望日時を選択してください。";
          var picked = new Date(v);
          if (isNaN(picked.getTime())) return "日時の形式が正しくありません。";
          if (picked.getTime() < Date.now()) {
            return "過去の日時は選択できません。";
          }
          return "";
        },
      },
      {
        id: "message",
        label: "ご要望",
        validate: function (v) {
          // 任意項目。長すぎる場合のみ拒否
          if (v.length > 1000) return "ご要望は1000文字以内で入力してください。";
          return "";
        },
      },
    ];

    /** 単一フィールドを検証してエラー表示を更新。エラー文字列を返す */
    function validateField(rule) {
      var input = document.getElementById(rule.id);
      var errEl = document.getElementById(rule.id + "-error");
      var msg = rule.validate(input.value);
      if (errEl) {
        errEl.textContent = msg; // textContent のみ
      }
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      return msg;
    }

    // 入力中・離脱時に随時検証
    rules.forEach(function (rule) {
      var input = document.getElementById(rule.id);
      if (!input) return;
      input.addEventListener("blur", function () {
        validateField(rule);
      });
      input.addEventListener("input", function () {
        var errEl = document.getElementById(rule.id + "-error");
        if (errEl && errEl.textContent) {
          validateField(rule);
        }
      });
    });

    /** ステータス領域を組み立て（createElement のみ） */
    function renderStatus(type, title, lines) {
      // clear safely
      while (statusBox.firstChild) {
        statusBox.removeChild(statusBox.firstChild);
      }
      statusBox.className = "form-status form-status--" + type;
      statusBox.hidden = false;
      statusBox.setAttribute("role", type === "success" ? "status" : "alert");

      var h = document.createElement("h3");
      h.textContent = title;
      statusBox.appendChild(h);

      lines.forEach(function (line) {
        var p = document.createElement("p");
        p.textContent = line;
        p.style.margin = "0";
        statusBox.appendChild(p);
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var firstInvalid = null;
      var hasError = false;

      rules.forEach(function (rule) {
        var msg = validateField(rule);
        if (msg && !firstInvalid) {
          firstInvalid = document.getElementById(rule.id);
          hasError = true;
        } else if (msg) {
          hasError = true;
        }
      });

      if (hasError) {
        renderStatus("error", "入力内容をご確認ください", [
          "赤色で示された項目を修正のうえ、再度お試しください。",
        ]);
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      // 検証成功 — 本来はここでサーバ送信。デモのため成功表示のみ。
      var name = document.getElementById("name").value.trim();
      renderStatus("success", "ご予約リクエストを受け付けました", [
        name + " 様、ありがとうございます。",
        "内容を確認のうえ、担当者より折り返しご連絡いたします。",
        "（※ これはポートフォリオ用デモのため、実際の送信は行われません）",
      ]);

      form.reset();
      rules.forEach(function (rule) {
        var input = document.getElementById(rule.id);
        if (input) input.setAttribute("aria-invalid", "false");
        var errEl = document.getElementById(rule.id + "-error");
        if (errEl) errEl.textContent = "";
      });

      statusBox.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();
