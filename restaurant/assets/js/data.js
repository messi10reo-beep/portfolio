// ============================================================
// data.js — 和食 結 -yui- 予約台帳のデモ初期データ（架空）
// 初回アクセス時に localStorage へ投入される。
// seat: カウンター / テーブル席 / 個室   status: new(未確認)/confirmed(確定)/done(来店済)
// _ago: 何日前に申込まれたか
// ============================================================
window.YUI_SEED = [
  {
    name: "結城 花子", tel: "09011112222", email: "hanako@example.com",
    guests: "2", seat: "カウンター", course: "季節のおまかせコース",
    datetime: "2026-06-21T18:00", message: "記念日です。可能であればデザートプレートに一言添えていただけると嬉しいです。",
    status: "confirmed", _ago: 2
  },
  {
    name: "田所 健", tel: "08033334444", email: "tadokoro@example.com",
    guests: "4", seat: "テーブル席", course: "結コース",
    datetime: "2026-06-21T19:30", message: "1名、甲殻類アレルギーがあります。", status: "confirmed", _ago: 1
  },
  {
    name: "佐々木 美和", tel: "07055556666", email: "miwa.s@example.com",
    guests: "2", seat: "カウンター", course: "アラカルト・飲みのみ",
    datetime: "2026-06-21T20:30", message: "", status: "new", _ago: 0
  },
  {
    name: "山口 大輔", tel: "09077778888", email: "daisuke@example.com",
    guests: "6", seat: "個室", course: "結コース",
    datetime: "2026-06-22T18:30", message: "接待で利用します。落ち着いた席を希望します。", status: "new", _ago: 0
  },
  {
    name: "中川 由美", tel: "08099990000", email: "yumi.n@example.com",
    guests: "3", seat: "テーブル席", course: "季節のおまかせコース",
    datetime: "2026-06-22T19:00", message: "", status: "new", _ago: 0
  },
  {
    name: "藤本 隆", tel: "07012123434", email: "fujimoto@example.com",
    guests: "2", seat: "個室", course: "結コース",
    datetime: "2026-06-23T18:00", message: "両親の還暦祝いです。", status: "confirmed", _ago: 1
  },
  {
    name: "小林 さやか", tel: "09056567878", email: "sayaka.k@example.com",
    guests: "5", seat: "テーブル席", course: "ご相談",
    datetime: "2026-06-24T19:30", message: "コースか単品か当日相談したいです。", status: "new", _ago: 0
  },
  {
    name: "渡辺 翔", tel: "08023234545", email: "sho.w@example.com",
    guests: "2", seat: "カウンター", course: "季節のおまかせコース",
    datetime: "2026-06-20T18:30", message: "", status: "done", _ago: 3
  }
];
