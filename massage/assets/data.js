/* =========================================================================
   凪 NAGI — 共有データ (FAQ knowledge base / menus / seed demo data)
   APIキー不要。すべてフロントに同梱し、外部送信しない。
   ========================================================================= */
"use strict";

/* 予約メニューのフォールバック（Supabase未接続でも動くための控え）。
   通常は loadNagiMenus() が管理画面(massage/admin/)と同じ Supabase massage_menus を読む。 */
window.NAGI_MENUS = [
  { id: "first", name: "初回カウンセリング＋整体（70分）", price: "6,800円", note: "姿勢チェック・問診込み" },
  { id: "body60", name: "ボディケア整体（60分）", price: "7,200円", note: "肩・腰・首を中心に" },
  { id: "body90", name: "じっくり整体（90分）", price: "10,200円", note: "全身＋姿勢調整" },
  { id: "desk", name: "デスクワーカー集中ケア（45分）", price: "5,400円", note: "肩こり・眼精疲労に" },
  { id: "head", name: "ヘッドスパ＋肩首（50分）", price: "6,200円", note: "頭の緊張をほぐす" },
  { id: "other", name: "その他・相談したい", price: "—", note: "内容に合わせてご提案" }
];

/* Supabase（既存メニューCMS massage/admin/ と同一データ源）。anon公開キー＝クライアント露出前提・RLSで保護。 */
window.NAGI_SB = {
  url: "https://ysgyhijsrwrzrawfceba.supabase.co/rest/v1",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZ3loaWpzcndyenJhd2ZjZWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3Nzg0OTIsImV4cCI6MjA5NzM1NDQ5Mn0.LJ0K_RpQJ6CYPaas-cN59olZwCcUy6Y-mZA6OgVYD1Q",
  table: "massage_menus"
};

/* 公開中メニューを取得。管理画面での追加・編集・公開切替が即反映される。
   接続不可・空の場合は NAGI_MENUS にフォールバック（APIキー無しでも動く設計を維持）。 */
window.loadNagiMenus = async function () {
  try {
    const r = await fetch(NAGI_SB.url + "/" + NAGI_SB.table + "?select=*&active=eq.true&order=sort_order.asc",
      { headers: { apikey: NAGI_SB.key, Authorization: "Bearer " + NAGI_SB.key } });
    if (!r.ok) throw new Error("status " + r.status);
    const rows = await r.json();
    if (!rows || !rows.length) throw new Error("empty");
    return rows.map(function (m) {
      return {
        name: m.name,
        price: (typeof m.price === "number") ? "¥" + m.price.toLocaleString("ja-JP") : (m.price || "—"),
        duration_min: m.duration_min || null,
        description: m.description || "",
        source: "supabase"
      };
    });
  } catch (e) {
    return (window.NAGI_MENUS || []).filter(function (m) { return m.id !== "other"; })
      .map(function (m) { return { name: m.name, price: m.price, duration_min: null, description: m.note || "", source: "fallback" }; });
  }
};

/* 問い合わせ種別 */
window.NAGI_INQUIRY_TYPES = ["予約について", "料金について", "症状について", "キャンセル・変更", "その他"];

/* AI分類カテゴリの表示メタ（バッジ色を共有） */
window.NAGI_CAT_META = {
  "腰痛相談":          { cls: "shu",  en: "Lower back" },
  "肩こり・首こり相談": { cls: "",     en: "Neck & shoulder" },
  "姿勢改善":          { cls: "gold", en: "Posture" },
  "頭・眼精疲労":      { cls: "info", en: "Head & eyes" },
  "一般相談":          { cls: "gray", en: "General" },
  "予約希望":          { cls: "shu",  en: "Booking" },
  "料金質問":          { cls: "gold", en: "Pricing" },
  "症状相談":          { cls: "",     en: "Symptom" },
  "キャンセル・変更":  { cls: "info", en: "Reschedule" },
  "その他":            { cls: "gray", en: "Other" }
};

/* =========================================================================
   FAQ knowledge base （簡易RAG風検索の対象）
   FAQItem: { id, category, question, answer, keywords[] }
   ========================================================================= */
window.NAGI_FAQ = [
  { id: "hours", category: "営業時間",
    question: "営業時間は何時から何時までですか？",
    answer: "平日は10:00〜21:00（最終受付20:00）、土日祝は10:00〜19:00（最終受付18:00）です。完全予約制のため、ご来店前にご予約をお願いしています。",
    keywords: ["営業", "時間", "何時", "開店", "閉店", "受付", "やってる", "あいてる", "開いて"] },
  { id: "holiday", category: "定休日",
    question: "定休日はいつですか？",
    answer: "定休日は毎週水曜日です。水曜が祝日の場合は営業し、翌木曜をお休みにいただくことがあります。",
    keywords: ["定休", "休み", "やすみ", "休日", "水曜", "お休み"] },
  { id: "price", category: "料金",
    question: "料金はいくらですか？",
    answer: "初回カウンセリング＋整体（70分）は6,800円、ボディケア整体（60分）は7,200円、じっくり整体（90分）は10,200円です。続けたい方には回数券（5回 33,000円）もご用意しています。すべて税込です。",
    keywords: ["料金", "値段", "いくら", "価格", "費用", "金額", "お金", "コース", "回数券"] },
  { id: "first", category: "初回カウンセリング",
    question: "初回はどんな流れですか？／初回はいくらですか？",
    answer: "初回は「初回カウンセリング＋整体（70分・6,800円）」がおすすめです。お悩みや生活習慣の問診、姿勢チェックを行ってから施術に入ります。痛みの出るタイミングやデスクワーク時間をうかがい、無理のない内容でご提案します。",
    keywords: ["初回", "はじめて", "初めて", "first", "カウンセリング", "流れ", "ながれ"] },
  { id: "booking", category: "予約方法",
    question: "予約はどうすればいいですか？",
    answer: "Web予約フォームから、ご希望メニュー・第一/第二希望日時・お悩みを入力して送信いただけます。LINE予約も順次対応予定です。空き状況を確認のうえ、スタッフから確定のご連絡をいたします。",
    keywords: ["予約", "よやく", "とりたい", "申し込み", "申込", "ネット", "web", "line", "ライン"] },
  { id: "cancel", category: "キャンセル方法",
    question: "予約の変更・キャンセルはできますか？",
    answer: "はい、可能です。前日までのご連絡は無料です。当日キャンセルは施術料金の50%、無断キャンセルは100%を申し受けます。日時変更もお気軽にご相談ください。",
    keywords: ["キャンセル", "変更", "予約変更", "リスケ", "ずらし", "取り消し", "とりけし", "日時変更", "へんこう"] },
  { id: "wear", category: "服装",
    question: "どんな服装で行けばいいですか？",
    answer: "動きやすい服装でお越しください。当サロンでゆったりした施術着（無料）をご用意していますので、お仕事帰りのスーツやスカートでもそのままお越しいただけます。",
    keywords: ["服装", "服", "着替え", "きがえ", "ふくそう", "格好", "かっこう", "スーツ", "施術着", "ウェア"] },
  { id: "bring", category: "持ち物",
    question: "持ち物は必要ですか？",
    answer: "特別な持ち物は不要です。手ぶらでお越しいただけます。コンタクトの方は必要に応じて保存ケースをお持ちいただくと安心です。",
    keywords: ["持ち物", "もちもの", "持っていく", "必要なもの", "用意", "手ぶら"] },
  { id: "duration", category: "施術時間",
    question: "施術時間はどれくらいですか？",
    answer: "メニューにより45分〜90分です。初回はカウンセリングと姿勢チェックを含めて約70分をみていただくと安心です。お着替えや説明の時間を含め、前後10分ほど余裕をもってご来店ください。",
    keywords: ["施術時間", "時間", "どれくらい", "何分", "長さ", "所要", "かかる", "ながさ"] },
  { id: "insurance", category: "保険適用",
    question: "保険は使えますか？",
    answer: "当サロンはリラクゼーション・ボディケアを目的とした自由施術のため、健康保険の適用はございません。料金はすべて自費（税込）となります。",
    keywords: ["保険", "ほけん", "適用", "医療費", "自費", "自由診療"] },
  { id: "pregnancy", category: "妊娠中の利用",
    question: "妊娠中でも受けられますか？",
    answer: "安定期以降のマタニティ向けケアにも配慮していますが、体調には個人差があります。まずはかかりつけの産婦人科医にご相談のうえ、ご予約時にお知らせください。体調を最優先に、無理のない範囲でご案内します。",
    keywords: ["妊娠", "にんしん", "マタニティ", "妊婦", "つわり", "おなか"] },
  { id: "payment", category: "支払い方法",
    question: "支払い方法は何が使えますか？",
    answer: "現金のほか、各種クレジットカード・QRコード決済（PayPay・楽天ペイなど）・交通系ICに対応しています。回数券は現金・カードでご購入いただけます。",
    keywords: ["支払い", "支払", "しはらい", "決済", "カード", "クレジット", "paypay", "電子マネー", "現金", "qr"] },
  { id: "parking", category: "駐車場",
    question: "駐車場はありますか？",
    answer: "専用駐車場はございませんが、徒歩1分にコインパーキングが複数あります。中目黒駅から徒歩5分のため、電車でのご来店も便利です。",
    keywords: ["駐車場", "ちゅうしゃ", "車", "くるま", "パーキング", "停め", "とめ"] },
  { id: "kids", category: "子連れ可否",
    question: "子連れでも大丈夫ですか？",
    answer: "個室のため、お子さま連れのご来店も事前にご相談いただけます。安全面の都合で対応できる時間帯が限られる場合があるため、ご予約時にお子さまの年齢・人数をお知らせください。",
    keywords: ["子連れ", "こづれ", "子供", "こども", "子ども", "ベビーカー", "赤ちゃん", "キッズ"] },
  { id: "aftercare", category: "施術後の注意点",
    question: "施術後に気をつけることはありますか？",
    answer: "施術後は水分を多めにとり、激しい運動や飲酒は当日控えめにしていただくと、ほぐれた状態が長持ちします。まれに「もみ返し」を感じる場合がありますが、通常は1〜2日でやわらぎます。強い痛みが続く場合は医療機関にご相談ください。",
    keywords: ["施術後", "後", "あと", "注意", "もみ返し", "好転反応", "気をつける", "ケア", "アフター"] }
];

/* =========================================================================
   初期ダミーデータ（ダッシュボードが空のとき投入）
   日時は相対表記でテンプレ化し、store 側で当日基準に整える
   ========================================================================= */
window.NAGI_SEED = {
  bookings: [
    { name: "田中 美咲", email: "misaki.t@example.com", phone: "090-1234-5678",
      menu: "デスクワーカー集中ケア（45分）", firstChoice: "今日 19:00", secondChoice: "明日 19:00",
      symptoms: "在宅勤務が増えてから肩こりと首のはりがひどく、夕方になると頭も重いです。", isFirstVisit: true,
      note: "施術の強さは普通くらいが希望です。", status: "new", _ago: 0.2 },
    { name: "佐藤 健一", email: "k.sato@example.com", phone: "080-2222-3333",
      menu: "ボディケア整体（60分）", firstChoice: "明日 11:00", secondChoice: "明後日 18:00",
      symptoms: "腰痛がつらいです。長時間座っていると腰が固まる感じがします。", isFirstVisit: false,
      note: "前回と同じ担当の方を希望します。", status: "progress", _ago: 0.9 },
    { name: "山本 由香", email: "yuka.y@example.com", phone: "070-4444-5555",
      menu: "初回カウンセリング＋整体（70分）", firstChoice: "土曜 14:00", secondChoice: "日曜 15:00",
      symptoms: "猫背と反り腰が気になっていて、姿勢を改善したいです。", isFirstVisit: true,
      note: "", status: "new", _ago: 1.4 },
    { name: "鈴木 大輔", email: "d.suzuki@example.com", phone: "090-6666-7777",
      menu: "じっくり整体（90分）", firstChoice: "金曜 20:00", secondChoice: "土曜 17:00",
      symptoms: "全身の疲れと寝つきの悪さ。特に背中の張りが気になります。", isFirstVisit: false,
      note: "ヘッドのオプションも相談したいです。", status: "done", _ago: 2.1 }
  ],
  inquiries: [
    { name: "高橋 さくら", email: "sakura.t@example.com", type: "料金について",
      message: "回数券の有効期限はどれくらいですか？家族と一緒に使うことはできますか？",
      status: "new", _ago: 0.5 },
    { name: "伊藤 翔", email: "sho.ito@example.com", type: "キャンセル・変更",
      message: "明日の予約を来週に変更したいのですが可能でしょうか。仕事の都合がつかなくなってしまいました。",
      status: "new", _ago: 1.1 },
    { name: "中村 あすか", email: "asuka.n@example.com", type: "症状について",
      message: "デスクワークで肩こりがひどく、ときどき頭痛もします。整体で楽になりますか？",
      status: "progress", _ago: 1.8 },
    { name: "小林 誠", email: "m.koba@example.com", type: "その他",
      message: "ギフトとして施術をプレゼントすることはできますか？", status: "done", _ago: 3.0 }
  ]
};
