import { z } from "zod";
import { BILLING_STATUSES, JOB_STATUSES } from "../constants.ts";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const jobInputSchema = z
  .object({
    job_no: z.string().trim().min(1, "案件番号は必須です").max(40, "案件番号は40文字以内です"),
    customer_id: z.string().uuid("顧客を選択してください"),
    site_id: z.string().uuid("現場を選択してください"),
    inspection_type: z.string().trim().min(1, "点検種別は必須です").max(80, "点検種別は80文字以内です"),
    assignee_id: z.string().uuid("担当者を選択してください"),
    scheduled_date: z.string().regex(datePattern, "点検予定日は YYYY-MM-DD で入力してください"),
    report_due_date: z.string().regex(datePattern, "報告書提出期限は YYYY-MM-DD で入力してください"),
    status: z.enum(JOB_STATUSES, { error: "進捗が不正です" }),
    estimate_amount: z
      .union([z.string(), z.number(), z.null()])
      .transform((value) => (value === "" || value === null ? null : Number(value)))
      .pipe(z.number().min(0, "見積金額は0以上で入力してください").nullable()),
    billing_status: z.enum(BILLING_STATUSES, { error: "請求状況が不正です" }),
    notes: z.string().max(2000, "備考は2000文字以内です").nullable().optional()
  })
  .refine((value) => value.report_due_date >= value.scheduled_date, {
    message: "報告書提出期限は点検予定日以降にしてください",
    path: ["report_due_date"]
  });

export type JobInput = z.infer<typeof jobInputSchema>;

export function formDataToJobInput(formData: FormData) {
  return {
    job_no: String(formData.get("job_no") ?? ""),
    customer_id: String(formData.get("customer_id") ?? ""),
    site_id: String(formData.get("site_id") ?? ""),
    inspection_type: String(formData.get("inspection_type") ?? ""),
    assignee_id: String(formData.get("assignee_id") ?? ""),
    scheduled_date: String(formData.get("scheduled_date") ?? ""),
    report_due_date: String(formData.get("report_due_date") ?? ""),
    status: String(formData.get("status") ?? ""),
    estimate_amount: String(formData.get("estimate_amount") ?? ""),
    billing_status: String(formData.get("billing_status") ?? ""),
    notes: String(formData.get("notes") ?? "")
  };
}
