/* =========================================================================
   凪 NAGI — ローカルLLM接続レイヤ（Ollama / OpenAI互換も可）
   ・APIキー不要・外部送信なし：ブラウザから localhost の Ollama に直接接続。
   ・RAG：NagiAI.retrieve() で関連FAQを取得 → 文脈としてLLMに渡し、根拠に基づき回答。
   ・Ollama が起動していなければ false を返し、呼び出し側はFAQ検索にフォールバック。
   起動方法（お客様の端末）:
     1) https://ollama.com からインストール
     2) ollama pull qwen2.5:1.5b        （軽量・日本語可。お好みのモデルでOK）
     3) OLLAMA_ORIGINS=* ollama serve   （ブラウザからの接続を許可）
   ========================================================================= */
"use strict";

(function () {
  var cfg = { endpoint: "http://localhost:11434", model: null, timeoutMs: 2500 };

  // localStorage で接続先・モデルを上書き可能（デモ運用の柔軟性）
  try {
    var saved = JSON.parse(localStorage.getItem("nagi_llm_cfg") || "{}");
    if (saved.endpoint) cfg.endpoint = saved.endpoint;
    if (saved.model) cfg.model = saved.model;
  } catch (e) { /* noop */ }

  // 軽量・指示追従の良いモデルを優先して自動選択
  function pickModel(models) {
    if (!models || !models.length) return null;
    var prefer = ["qwen2.5", "qwen", "llama3.2", "llama3", "gemma2", "gemma", "phi3", "mistral", "elyza"];
    for (var i = 0; i < prefer.length; i++) {
      var hit = models.find(function (m) { return m.indexOf(prefer[i]) !== -1; });
      if (hit) return hit;
    }
    return models[0];
  }

  // Ollama が起動しているか検出（/api/tags）。起動していればモデル一覧を返す。
  function detect() {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, cfg.timeoutMs);
    return fetch(cfg.endpoint + "/api/tags", { signal: ctrl.signal })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        clearTimeout(t);
        if (!data || !data.models) return { ok: false };
        var names = data.models.map(function (m) { return m.name; });
        if (!cfg.model || names.indexOf(cfg.model) === -1) cfg.model = pickModel(names);
        return { ok: names.length > 0, models: names, model: cfg.model };
      })
      .catch(function () { clearTimeout(t); return { ok: false }; });
  }

  var SYSTEM =
    "あなたは整体・ボディケアサロン「凪 NAGI」のFAQアシスタントです。" +
    "以下の【参考FAQ】だけを根拠に、日本語で簡潔（2〜4文）に、お客様へそのまま送れる丁寧な口調で答えてください。" +
    "参考FAQに答えが無い場合は推測せず、「申し訳ありません、その点はこのFAQでは分かりかねます。お問い合わせフォームからご連絡ください」と案内してください。" +
    "医療的な診断・断定はしないでください。症状が強い場合は医療機関の受診もご案内してください。前置きや箇条書きは不要です。";

  function buildMessages(question, faqs) {
    var ctx = "【参考FAQ】\n";
    (faqs || []).forEach(function (f, i) {
      ctx += (i + 1) + ". [" + f.category + "] " + f.question + "\n   " + f.answer + "\n";
    });
    if (!faqs || !faqs.length) ctx += "（関連するFAQは見つかりませんでした）\n";
    return [
      { role: "system", content: SYSTEM },
      { role: "user", content: ctx + "\nお客様の質問：" + question }
    ];
  }

  // /api/chat をストリーミングで呼び、トークンを onToken に渡す。
  function chatStream(messages, handlers) {
    handlers = handlers || {};
    var ctrl = new AbortController();
    fetch(cfg.endpoint + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.model, messages: messages, stream: true, options: { temperature: 0.3, num_predict: 320 } }),
      signal: ctrl.signal
    }).then(function (res) {
      if (!res.ok || !res.body) throw new Error("status " + res.status);
      var reader = res.body.getReader();
      var dec = new TextDecoder();
      var buf = "";
      function pump() {
        return reader.read().then(function (chunk) {
          if (chunk.done) { if (handlers.onDone) handlers.onDone(); return; }
          buf += dec.decode(chunk.value, { stream: true });
          var lines = buf.split("\n");
          buf = lines.pop(); // 末尾の未完了行は次回へ
          lines.forEach(function (line) {
            line = line.trim(); if (!line) return;
            try {
              var data = JSON.parse(line);
              if (data.message && data.message.content && handlers.onToken) handlers.onToken(data.message.content);
              if (data.done && handlers.onDone) handlers.onDone();
            } catch (e) { /* 不完全な行は無視 */ }
          });
          return pump();
        });
      }
      return pump();
    }).catch(function (err) { if (handlers.onError) handlers.onError(err); });
    return { abort: function () { ctrl.abort(); } };
  }

  function setConfig(c) {
    if (c.endpoint) cfg.endpoint = c.endpoint;
    if (c.model) cfg.model = c.model;
    try { localStorage.setItem("nagi_llm_cfg", JSON.stringify({ endpoint: cfg.endpoint, model: cfg.model })); } catch (e) { /* noop */ }
  }
  function getModel() { return cfg.model; }

  window.NagiLLM = { detect: detect, chatStream: chatStream, buildMessages: buildMessages, setConfig: setConfig, getModel: getModel };
})();
