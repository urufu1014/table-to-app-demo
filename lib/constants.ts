export const MOCK_DELIVERY_NOTICE =
  "公開されている業務委託・開発案件で求められる業務を参考に、架空の企業・データを用いて制作した模擬納品事例です。実在企業への納品実績ではありません。";

export const ROLES = ["admin", "staff", "viewer"] as const;
export const JOB_STATUSES = [
  "unassigned",
  "scheduled",
  "in_progress",
  "report_preparing",
  "submitted",
  "completed",
  "cancelled"
] as const;
export const BILLING_STATUSES = [
  "not_quoted",
  "quoted",
  "ordered",
  "not_invoiced",
  "invoiced",
  "paid",
  "not_applicable"
] as const;

export const roleLabels = {
  admin: "管理者",
  staff: "担当者",
  viewer: "閲覧者"
} as const;

export const statusLabels = {
  unassigned: "未割当",
  scheduled: "予定",
  in_progress: "点検中",
  report_preparing: "報告書作成中",
  submitted: "提出済み",
  completed: "完了",
  cancelled: "中止"
} as const;

export const billingStatusLabels = {
  not_quoted: "未見積",
  quoted: "見積済",
  ordered: "受注",
  not_invoiced: "未請求",
  invoiced: "請求済",
  paid: "入金済",
  not_applicable: "対象外"
} as const;

export const DEMO_ACCOUNTS = [
  { role: "管理者", email: "admin@table-to-app.example", note: "すべての案件と利用者を管理できます。" },
  { role: "担当者", email: "staff@table-to-app.example", note: "自分が担当する案件を登録・更新できます。" },
  { role: "閲覧者", email: "viewer@table-to-app.example", note: "案件の内容を確認できます。編集はできません。" }
] as const;
