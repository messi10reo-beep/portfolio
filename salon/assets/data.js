/* =========================================================================
   hair atelier hibi — 管理画面のデモ初期データ
   実在しない架空の予約データ。初回アクセス時に localStorage へ投入される。
   _ago: 何日前に申し込まれたか / status: new(未対応) confirmed(確定) done(来店済)
   ========================================================================= */
"use strict";

window.HIBI_SEED = [
  {
    name: "佐藤 美咲", email: "misaki.s@example.com", phone: "09012345678",
    menu: "カット＋カラー", stylist: "日比野 葵（店長）",
    firstChoice: "2026-06-24T11:00", secondChoice: "2026-06-25T13:00",
    concern: "毛先のパサつきが気になります。明るめのカラーにもしたいです。",
    isFirstVisit: false, note: "肩につくくらいのボブにしたいです。", status: "confirmed", _ago: 1
  },
  {
    name: "田中 健一", email: "tanaka.k@example.com", phone: "08098765432",
    menu: "カット", stylist: "指名なし（お任せ）",
    firstChoice: "2026-06-24T19:00", secondChoice: "",
    concern: "仕事帰りにさっと整えたいです。短時間希望。",
    isFirstVisit: true, note: "", status: "new", _ago: 0
  },
  {
    name: "鈴木 さやか", email: "sayaka@example.com", phone: "07011112222",
    menu: "縮毛矯正", stylist: "森 千尋",
    firstChoice: "2026-06-26T10:00", secondChoice: "2026-06-28T10:00",
    concern: "湿気でくせとうねりが強く出て広がります。自然なストレートに。",
    isFirstVisit: false, note: "以前に他店で矯正したことがあります。", status: "new", _ago: 0
  },
  {
    name: "山本 由紀", email: "yuki.y@example.com", phone: "09033334444",
    menu: "白髪染め", stylist: "日比野 葵（店長）",
    firstChoice: "2026-06-23T14:00", secondChoice: "",
    concern: "分け目とこめかみの白髪が目立ってきました。暗くなりすぎない色味希望。",
    isFirstVisit: false, note: "", status: "done", _ago: 3
  },
  {
    name: "中村 あおい", email: "aoi.n@example.com", phone: "08055556666",
    menu: "トリートメント／ヘッドスパ", stylist: "指名なし（お任せ）",
    firstChoice: "2026-06-27T16:00", secondChoice: "",
    concern: "在宅勤務で頭が疲れています。リラックスしたいです。",
    isFirstVisit: true, note: "頭皮が乾燥しやすいです。", status: "confirmed", _ago: 2
  },
  {
    name: "小林 真央", email: "mao.k@example.com", phone: "07077778888",
    menu: "カット＋パーマ", stylist: "新人スタイリスト",
    firstChoice: "2026-06-29T13:00", secondChoice: "2026-06-30T11:00",
    concern: "トップがぺたんこになりがち。根元をふんわりさせたいです。",
    isFirstVisit: true, note: "", status: "new", _ago: 0
  },
  {
    name: "渡辺 千夏", email: "chinatsu.w@example.com", phone: "09099990000",
    menu: "その他・相談したい", stylist: "日比野 葵（店長）",
    firstChoice: "2026-07-05T10:00", secondChoice: "",
    concern: "来月の結婚式に向けてヘアセットと事前のケアを相談したいです。",
    isFirstVisit: true, note: "前撮りもあります。", status: "new", _ago: 1
  }
];
