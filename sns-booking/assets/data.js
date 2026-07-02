/* =========================================================================
   nail salon luce — 管理画面のデモ初期予約データ（架空）
   DM/LINEで予約をさばく個人サロンを想定。初回アクセス時に localStorage へ投入。
   contactType: Instagram / LINE / 電話   source: 流入元   status: new/confirmed/done
   _ago: 何日前の申込か
   ========================================================================= */
"use strict";

window.LUCE_SEED = [
  {
    name: "あや", contactType: "Instagram", contact: "@aya_nuance",
    menu: "ニュアンスアート", design: "くすみベージュ×ミラーで秋っぽく。保存した投稿をDMで送ります。",
    firstChoice: "2026-06-24T13:00", secondChoice: "2026-06-25T11:00",
    firstVisit: true, source: "Instagramリール", coupon: "LUCE500", status: "new", _ago: 0
  },
  {
    name: "みなみ", contactType: "LINE", contact: "minami.n",
    menu: "マグネットネイル", design: "深みのあるグリーン系のマグネット希望。",
    firstChoice: "2026-06-25T16:00", secondChoice: "",
    firstVisit: false, source: "Instagram投稿", coupon: "", status: "confirmed", _ago: 1
  },
  {
    name: "さき", contactType: "Instagram", contact: "@saki_0210",
    menu: "ワンカラー", design: "ミルクティーベージュのシンプルワンカラー。",
    firstChoice: "2026-06-23T18:30", secondChoice: "",
    firstVisit: true, source: "TikTok", coupon: "LUCE500", status: "new", _ago: 0
  },
  {
    name: "ゆい", contactType: "LINE", contact: "yui_nail",
    menu: "フレンチ", design: "細フレンチ＋パールを少し。上品めに。",
    firstChoice: "2026-06-22T11:00", secondChoice: "",
    firstVisit: false, source: "友人の紹介", coupon: "", status: "done", _ago: 3
  },
  {
    name: "ことね", contactType: "Instagram", contact: "@kotone.m",
    menu: "ニュアンスアート", design: "結婚式参列用。白〜くすみピンクの上品ニュアンス。",
    firstChoice: "2026-06-27T10:00", secondChoice: "2026-06-28T10:00",
    firstVisit: true, source: "Instagram投稿", coupon: "", status: "confirmed", _ago: 2
  },
  {
    name: "RIO", contactType: "電話", contact: "090-1234-5678",
    menu: "付け替え（オフ込み）", design: "前回のジェルをオフして、今度はマグネットに。",
    firstChoice: "2026-06-26T19:00", secondChoice: "",
    firstVisit: false, source: "Googleマップ", coupon: "", status: "new", _ago: 1
  },
  {
    name: "なお", contactType: "Instagram", contact: "@nao_foot",
    menu: "フットネイル", design: "サンダルの季節。ぷっくりミラーフレンチ。",
    firstChoice: "2026-07-01T15:00", secondChoice: "",
    firstVisit: true, source: "Instagramリール", coupon: "LUCE500", status: "new", _ago: 0
  },
  {
    name: "はる", contactType: "LINE", contact: "haru_06",
    menu: "グラデーション", design: "ピンクの大人グラデ。ラメ控えめ。",
    firstChoice: "2026-06-21T17:00", secondChoice: "",
    firstVisit: false, source: "Instagram投稿", coupon: "", status: "done", _ago: 2
  }
];
