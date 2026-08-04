# 移行対応表

## CSV列対応

| 旧CSV列 | 新DB | 画面表示 |
|---|---|---|
| job_no | inspection_jobs.job_no | 案件番号 |
| customer_code | customers.customer_code | 顧客コード |
| customer_name | customers.name | 顧客名 |
| site_name | sites.name | 現場名 |
| postal_code | sites.postal_code | 郵便番号 |
| address | sites.address | 現場住所 |
| inspection_type | inspection_jobs.inspection_type | 点検種別 |
| assignee_email | profiles.email -> inspection_jobs.assignee_id | 担当者 |
| scheduled_date | inspection_jobs.scheduled_date | 点検予定日 |
| report_due_date | inspection_jobs.report_due_date | 報告書提出期限 |
| status | inspection_jobs.status | 進捗 |
| estimate_amount | inspection_jobs.estimate_amount | 見積金額 |
| billing_status | inspection_jobs.billing_status | 請求状況 |
| notes | inspection_jobs.notes | 備考 |

## サンプルCSV

- `legacy/sample-inspection-jobs.csv`: ヘッダー1行 + データ20行
- `legacy/sample-inspection-jobs-with-errors.csv`: ヘッダー1行 + データ11行

## 取込方式

1. CSVを選択する
2. プレビューAPIで列、行、既存DB、担当者、日付、金額、enumを検証する
3. 正常行とエラー行を確認する
4. 利用者が明示確認した場合だけ、正常行を登録する
5. 取込結果を `import_batches` に記録し、エラーを `import_errors` に記録する

不正行は `inspection_jobs` へ登録しない。`failed_rows` は失敗した行数、`import_errors` はエラー件数として扱う。同じ行に複数エラーがある場合、失敗行数は1、エラー件数は複数になる。

## 検証方針

- 必須列がないCSVはプレビュー時点でエラーにする
- DB内またはCSV内で案件番号が重複する行は取り込まない
- 未登録または無効な担当者メールは取り込まない
- 予定日より前の提出期限は取り込まない
- 見積金額が負数の行は取り込まない
- 未定義の進捗・請求状況は取り込まない
- CSVインジェクションになりうる値は出力時に先頭へ `'` を付ける
