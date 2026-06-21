/* =========================================================================
   凪 NAGI — AI風ロジック（LLM API不要 / 完全フロント完結）
   ・FAQ回答：キーワード重みづけによる簡易RAG風検索＋根拠提示
   ・予約分類：症状文からカテゴリ判定＋スタッフ確認ポイント生成
   ・問い合わせ分類：種別＋本文からカテゴリ判定＋返信たたき台生成
   いずれも「最終確認はスタッフが行う」半自動化の補助として設計。
   ========================================================================= */
"use strict";

(function () {
  // 全角→半角・小文字・記号/空白除去で表記ゆれを吸収
  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/[\s　、。，．・!?！？]/g, "");
  }

  /* ---------------- FAQ 検索（簡易RAG風） ---------------- */
  function searchFAQ(query) {
    const q = normalize(query);
    if (!q) return { best: null, score: 0, related: [] };
    const scored = (window.NAGI_FAQ || []).map((faq) => {
      let score = 0;
      faq.keywords.forEach((kw) => {
        const k = normalize(kw);
        if (k && q.indexOf(k) !== -1) score += Math.min(k.length, 4); // 長いキーワードほど高配点
      });
      if (q.indexOf(normalize(faq.category)) !== -1) score += 3; // カテゴリ名一致ボーナス
      return { faq, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);

    return {
      best: scored[0] ? scored[0].faq : null,
      score: scored[0] ? scored[0].score : 0,
      related: scored.slice(1, 3).map((x) => x.faq)
    };
  }

  // チャット用：回答オブジェクトを組み立てる
  function answer(query) {
    const r = searchFAQ(query);
    // 信頼度ラベル（しきい値はデモ用に控えめに設定）
    let confidence = "low";
    if (r.score >= 6) confidence = "high";
    else if (r.score >= 3) confidence = "medium";

    if (!r.best || confidence === "low") {
      return {
        fallback: true,
        text: "ご質問の内容を、よくあるご質問の中から確実にお答えできませんでした。お手数ですが、お問い合わせフォームから直接ご連絡ください。スタッフが個別にご回答いたします。",
        sources: r.best ? [r.best] : [],
        confidence: "low"
      };
    }
    return {
      fallback: false,
      text: r.best.answer,
      sources: [r.best].concat(r.related),
      category: r.best.category,
      confidence
    };
  }

  /* ---------------- 予約の事前整理（分類＋確認ポイント） ---------------- */
  const BOOKING_RULES = [
    { cat: "腰痛相談", test: /(腰|ぎっくり|坐骨|ヘルニア)/,
      checks: ["痛みが出るタイミング（朝・夕方・座位/立位）", "デスクワークの連続時間と椅子の環境", "しびれの有無（ある場合は医療機関の受診状況）"] },
    { cat: "姿勢改善", test: /(姿勢|猫背|反り腰|そり腰|巻き肩|ストレートネック)/,
      checks: ["1日の座位時間とPC/スマホの使用状況", "気になる見た目（猫背・反り腰など）の自己認識", "運動習慣の有無"] },
    { cat: "肩こり・首こり相談", test: /(肩|首|肩こり|首こり|こり|張り|凝)/,
      checks: ["デスクワーク時間・モニター位置", "痛み/重さの出る時間帯", "頭痛・眼精疲労を伴うか"] },
    { cat: "頭・眼精疲労", test: /(頭痛|偏頭痛|頭が|目|眼|眼精|まぶた|こめかみ)/,
      checks: ["画面を見る合計時間", "頭痛の頻度・出方（医療機関の受診歴があれば確認）", "睡眠の状況"] }
  ];

  function classifyBooking(symptoms, note) {
    const text = normalize((symptoms || "") + " " + (note || ""));
    const matched = BOOKING_RULES.filter((r) => r.test.test(text));
    const primary = matched[0];
    const cat = primary ? primary.cat : "一般相談";
    const checks = primary ? primary.checks
      : ["お悩みの中心（部位・症状）の確認", "ご希望の施術の強さ・所要時間", "通院・既往歴で配慮すべき点"];

    let summary = "この予約は「" + cat + "」として分類されました。";
    if (cat === "一般相談") {
      summary += " 具体的なお悩みが読み取りにくいため、カウンセリング時にお身体の状態を丁寧にうかがうとよさそうです。";
    } else {
      summary += " 初回カウンセリング時に、上記の確認ポイントをおさえると施術プランを立てやすくなります。";
    }
    if (matched.length > 1) {
      summary += "（「" + matched.slice(1).map((m) => m.cat).join("」「") + "」の要素も含まれます）";
    }
    return { category: cat, summary, checks };
  }

  /* ---------------- 問い合わせの分類＋返信たたき台 ---------------- */
  function inferInquiryCategory(type, message) {
    const direct = {
      "予約について": "予約希望",
      "料金について": "料金質問",
      "症状について": "症状相談",
      "キャンセル・変更": "キャンセル・変更"
    };
    if (direct[type]) return direct[type];
    // 「その他」は本文から推定
    const m = normalize(message);
    if (/(予約|空き|あき|よやく|とりたい)/.test(m)) return "予約希望";
    if (/(料金|値段|いくら|価格|回数券|費用)/.test(m)) return "料金質問";
    if (/(痛|こり|張り|症状|つら|しびれ|肩|腰|首)/.test(m)) return "症状相談";
    if (/(キャンセル|変更|リスケ|取り消し)/.test(m)) return "キャンセル・変更";
    return "その他";
  }

  const REPLY_TEMPLATES = {
    "予約希望": {
      reply: "お問い合わせありがとうございます。ご予約のご希望を承りました。\nご希望の日時と空き状況を確認し、改めて確定のご連絡をいたします。お急ぎの場合はWeb予約フォームからもお手続きいただけます。\nご来店を心よりお待ちしております。",
      checks: ["希望日時の空き枠を確認", "初回かどうか／希望メニューの確認", "確定連絡の手段（メール/電話）の確認"]
    },
    "料金質問": {
      reply: "お問い合わせありがとうございます。料金についてご案内いたします。\nメニュー・所要時間により料金が異なります。詳細は料金ページをご覧ください。回数券のご利用や、お悩みに合わせたおすすめコースもご提案できます。\nご不明点があればお気軽にお知らせください。",
      checks: ["質問が単発料金か回数券かを確認", "おすすめコースを提案できるか", "キャンペーン適用の有無"]
    },
    "症状相談": {
      reply: "お問い合わせありがとうございます。お身体のお悩みについて承りました。\n初回カウンセリングで状態を詳しくうかがったうえで、無理のない施術内容をご提案いたします。痛みが強い場合や不安がある場合は、医療機関の受診もあわせてご検討ください。\nまずはお気軽にご相談ください。",
      checks: ["症状の部位・強さ・経過を確認", "医療機関の受診が必要そうか判断", "初回カウンセリングへの導線を案内"]
    },
    "キャンセル・変更": {
      reply: "ご連絡ありがとうございます。ご予約の変更・キャンセルの件、承りました。\n前日までのご連絡は無料で承っております。変更をご希望の場合は、ご都合のよい候補日時をお知らせいただけますとスムーズです。\nどうぞよろしくお願いいたします。",
      checks: ["対象の予約日時を特定", "変更希望日時の空き確認", "当日扱いかどうか（キャンセルポリシー）の確認"]
    },
    "その他": {
      reply: "お問い合わせありがとうございます。内容を確認いたしました。\n担当よりあらためてご連絡いたします。お急ぎの場合はお電話でも承っておりますので、お気軽にお問い合わせください。",
      checks: ["問い合わせの意図を再確認", "担当部門/担当者の割り当て", "折り返しの要否と手段の確認"]
    }
  };

  function classifyInquiry(type, message) {
    const category = inferInquiryCategory(type, message);
    const tpl = REPLY_TEMPLATES[category] || REPLY_TEMPLATES["その他"];
    return { category, reply: tpl.reply, checks: tpl.checks };
  }

  window.NagiAI = { normalize, searchFAQ, answer, classifyBooking, classifyInquiry };
})();
