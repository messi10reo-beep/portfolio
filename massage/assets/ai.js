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

  /* ---------------- 類義語・表記ゆれ辞書（クエリ拡張） ----------------
     言い換え(surface)がクエリに含まれたら canonical トークンを補い、
     「お金かかる？」→「料金」のような言い換え・口語に強くする。 */
  const SYNONYMS = [
    { canon: ["料金"], surface: ["値段", "価格", "費用", "金額", "お金", "予算", "コスト", "ねだん", "幾ら", "高い", "安い", "相場", "かかる", "いくら"] },
    { canon: ["予約"], surface: ["よやく", "とりたい", "取りたい", "申し込み", "申込", "ブッキング", "おさえ", "押さえ"] },
    { canon: ["キャンセル", "変更"], surface: ["取り消し", "とりけし", "解約", "リスケ", "ずらし", "ずらす", "日程変更", "日時変更", "へんこう", "やめたい", "変えたい", "リスケジュール"] },
    { canon: ["営業", "時間"], surface: ["何時", "やってる", "やってますか", "あいてる", "開いてる", "空いてる", "オープン", "開店", "閉店", "営業中"] },
    { canon: ["定休", "休み"], surface: ["休業", "やすみ", "お休み", "閉まってる", "休む"] },
    { canon: ["服装"], surface: ["何を着", "着るもの", "格好", "かっこう", "ウェア", "スーツ", "着替え", "きがえ", "私服"] },
    { canon: ["駐車場"], surface: ["車", "くるま", "パーキング", "停め", "とめ", "駐車"] },
    { canon: ["支払い", "決済"], surface: ["カード", "クレジット", "ペイペイ", "電子マネー", "現金", "キャッシュ", "後払い", "分割"] },
    { canon: ["子連れ", "子供"], surface: ["こども", "子ども", "赤ちゃん", "ベビーカー", "キッズ", "同伴"] },
    { canon: ["妊娠"], surface: ["にんしん", "妊婦", "マタニティ", "つわり"] },
    { canon: ["保険"], surface: ["ほけん", "医療費", "自費", "保険証"] },
    { canon: ["初回"], surface: ["はじめて", "初めて", "初診", "一回目"] },
    { canon: ["施術時間", "時間"], surface: ["何分", "所要", "長さ", "かかる時間", "施術はどれ", "施術どれ"] },
    { canon: ["アクセス", "場所"], surface: ["どこ", "駅", "行き方", "住所", "地図", "最寄り", "立地"] },
    { canon: ["男性"], surface: ["男", "メンズ", "旦那", "彼氏", "男でも"] },
    { canon: ["当日", "予約"], surface: ["直前", "飛び込み", "これから", "本日", "今日いけ", "今日行け", "今日空"] },
    { canon: ["頻度", "通う"], surface: ["何回", "ペース", "週に", "週どれ", "どのくらい通", "どれくらい通", "通えば", "継続", "通い"] },
    { canon: ["ギフト"], surface: ["プレゼント", "贈り物", "ギフト券", "チケット", "贈りたい"] },
    { canon: ["強さ"], surface: ["痛い", "強め", "弱め", "ソフト", "加減", "痛く"] },
    { canon: ["遅刻"], surface: ["遅れ", "間に合わ", "遅延", "遅く"] }
  ];

  function expandQuery(qNorm) {
    let extra = "";
    SYNONYMS.forEach((g) => {
      if (g.surface.some((s) => qNorm.indexOf(normalize(s)) !== -1)) {
        extra += g.canon.map(normalize).join("");
      }
    });
    return qNorm + extra;
  }

  /* ---------------- 文字bigramのコサイン類似度（タイポ・言い換え耐性） ---------------- */
  function bigrams(s) {
    const m = {};
    if (s.length < 2) { if (s) m[s] = 1; return m; }
    for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m[g] = (m[g] || 0) + 1; }
    return m;
  }
  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (const k in a) { na += a[k] * a[k]; if (b[k]) dot += a[k] * b[k]; }
    for (const k in b) { nb += b[k] * b[k]; }
    if (!na || !nb) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  /* ---------------- FAQ 検索（意味検索＋シソーラス展開） ---------------- */
  function searchFAQ(query) {
    const q = normalize(query);
    if (!q) return { best: null, score: 0, related: [] };
    const qx = expandQuery(q);
    const qg = bigrams(qx);
    const scored = (window.NAGI_FAQ || []).map((faq) => {
      let score = 0;
      faq.keywords.forEach((kw) => {
        const k = normalize(kw);
        if (k && qx.indexOf(k) !== -1) score += Math.min(k.length, 4); // キーワード一致（拡張後クエリで判定）
      });
      if (qx.indexOf(normalize(faq.category)) !== -1) score += 3; // カテゴリ名一致ボーナス
      const doc = normalize(faq.question + faq.keywords.join("") + faq.category);
      const sim = cosine(qg, bigrams(doc)); // 0..1 の意味的近さ（タイポ・言い換えを補う補助信号）
      score += sim * 5;
      return { faq, score, sim };
    }).filter((x) => x.score > 0.4).sort((a, b) => b.score - a.score);

    return {
      best: scored[0] ? scored[0].faq : null,
      score: scored[0] ? scored[0].score : 0,
      related: scored.slice(1, 4).map((x) => x.faq)
    };
  }

  // チャット用：回答オブジェクトを組み立てる（related = 追い質問の候補）
  function answer(query) {
    const r = searchFAQ(query);
    let confidence = "low";
    if (r.score >= 6) confidence = "high";
    else if (r.score >= 3) confidence = "medium";

    // 確信が低い（ほぼ無関連）ときは「もしかして」候補つきで問い合わせ誘導
    if (!r.best || r.score < 2) {
      const guesses = (r.best ? [r.best] : []).concat(r.related).slice(0, 3);
      return {
        fallback: true,
        text: "ご質問の内容を、よくあるご質問の中からは確実にお答えできませんでした。お手数ですが、お問い合わせフォームからご連絡ください。スタッフが個別にご回答します。" +
          (guesses.length ? "もしかして、次のいずれかでしょうか？" : ""),
        sources: r.best ? [r.best] : [],
        related: guesses,
        confidence: "low"
      };
    }
    return {
      fallback: false,
      text: r.best.answer,
      sources: [r.best].concat(r.related.slice(0, 2)),
      related: r.related.slice(0, 3),
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
