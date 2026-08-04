# テストレポート

作成日: 2026-08-04

## 実行環境

- Node.js: 24.11.1
- npm: 11.6.2
- Supabase CLI: 2.111.0
- Supabase local API: `http://127.0.0.1:55321`
- Supabase local DB: `127.0.0.1:55322`
- Supabase Studio: `http://127.0.0.1:55323`

最終受入前確認では、正式リポジトリからSupabase/Docker、統合テスト、E2E、buildを再実行した。秘密情報は環境変数としてプロセスに渡し、リポジトリには保存していない。

## 実行結果

| コマンド | 結果 | テスト数 | 失敗 | スキップ | 実DB |
|---|---:|---:|---:|---:|---:|
| `npm run supabase:start` | 成功 | - | - | - | はい |
| `npm run supabase:reset` | 成功 | - | - | - | はい |
| `DEMO_PASSWORD=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:demo` | 成功。3 users / 10 customers / 20 sites / 50 jobs | - | - | - | はい |
| `npm run lint` | 成功 | - | 0 | 0 | いいえ |
| `npm run typecheck` | 成功 | - | 0 | 0 | いいえ |
| `npm run test` | 成功 | 20 | 0 | 0 | いいえ |
| `npm run test:integration` | 成功 | 1 | 0 | 0 | はい |
| `RUN_REAL_E2E=1 npm run test:e2e` | 成功 | 10 | 0 | 0 | はい |
| `npm run build` | 成功 | - | 0 | 0 | いいえ |

## 単体・静的DBテスト

`npm run test` はNode.js標準テストランナーで20件を実行する。

- CSVパース、必須列、検証、失敗行数、CSVインジェクション対策
- 期限状態判定
- 案件入力バリデーション
- SQLマイグレーション内のRLS、ポリシー、制約、トリガー静的確認

## 実DB統合テスト

`tests/integration/supabase-real.test.ts` で、service roleではなくadmin/staff/viewerそれぞれのAuthセッションを使って次を確認した。service role keyはセットアップと後片付け、集計確認に限定している。

- 3ユーザーのメール/パスワード実ログイン
- AuthユーザーIDと `profiles.id` の一致
- 未認証SELECTが保護データを返さない
- adminの全案件SELECT/INSERT/UPDATE
- staffの自分担当案件SELECT/UPDATE/INSERT
- staffの他人担当案件ID指定SELECTが0件になること
- staffの一覧SELECTに自分担当案件以外が含まれないこと
- staffの他人担当案件UPDATE拒否
- viewerのINSERT/UPDATE拒否
- viewerの `profiles.role` 更新拒否
- adminとviewerが、staffには見えない他人担当案件をSELECTできること
- `inspection_jobs.job_no` の一意制約による重複拒否
- 作成・更新時の `job_history` 作成
- 権限外ユーザーによる履歴偽造拒否
- 正常CSV20行の実DB取込
- 正常CSV再取込時の20行重複拒否
- 異常CSV11行中、正常1行のみ取込、失敗10行、エラー記録あり

## E2E

`npm run test:e2e` はPlaywrightで10件を実行する。

- `tests/e2e/login.spec.ts`: ログイン画面をモック認証失敗で確認
- `tests/e2e/real-auth.spec.ts`: `RUN_REAL_E2E=1` のとき、admin / staff / viewer の実ログイン後主要導線を確認
- `tests/e2e/screen-audit.spec.ts`: `RUN_REAL_E2E=1` のとき、1440px / 1024px / 768px / 390pxで主要画面、権限差、404、CSV操作、画面はみ出し、コンソールエラー、service role露出なしを確認

## CSV取込結果

| ファイル | 総行数 | 成功行数 | 失敗行数 | エラー件数 | DB登録 |
|---|---:|---:|---:|---:|---:|
| `legacy/sample-inspection-jobs.csv` | 20 | 20 | 0 | 0 | 20 |
| 同一CSV再取込 | 20 | 0 | 20 | 20 | 0 |
| `legacy/sample-inspection-jobs-with-errors.csv` | 11 | 1 | 10 | 10件以上 | 1 |

`failed_rows` は失敗した行数、`import_errors` はエラー記録数として扱う。同一行に複数エラーがある場合、失敗行数は1、エラー記録数は複数になる。

## 未確認

公開デモURL、GitHub公開、Supabase本番プロジェクト、Vercel公開は未実施。これらは今回のローカル受入範囲外。
