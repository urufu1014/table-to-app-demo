# IMPLEMENTATION_PLAN

このリポジトリは、点検案件管理アプリの模擬納品を作成するための作業ログ兼チェックリストです。

## Phase 0：計画と確認

- [x] 現在のフォルダをルートとして確認
- [x] ルート直下で `git init`
- [x] `IMPLEMENTATION_PLAN.md` 作成
- [x] `.gitignore` 作成
- [x] `.env.example` 作成
- [x] Next.js / TypeScript / Tailwind CSS の基本設定
- [x] README 初版

## Phase 1：データと認証

- [x] Supabase 設定
- [x] SQL マイグレーション
- [x] 型定義
- [x] シード
- [x] Auth
- [x] profiles
- [x] RLS

## Phase 2：案件管理

- [x] 顧客
- [x] 現場
- [x] 案件
- [x] 一覧
- [x] 詳細
- [x] 登録
- [x] 編集
- [x] 検索・絞り込み
- [x] 期限状態

## Phase 3：履歴・権限

- [x] `job_history`
- [x] 監査履歴
- [x] admin / staff / viewer 表示制御
- [x] サーバー側権限チェック
- [x] 権限テスト（SQL静的検査）
- [x] 権限テスト（実Supabase RLS統合）

## Phase 4：CSV移行

- [x] Zustand によるウィザード状態管理
- [x] CSV 解析
- [x] CSV 検証
- [x] プレビュー
- [x] 取込
- [x] `import_batches`
- [x] `import_errors`
- [x] CSV 出力

## Phase 5：品質

- [x] 単体テスト
- [x] DB・RLSテスト（SQL静的検査）
- [x] 実Supabase統合テスト
- [x] E2E（ログイン画面 desktop/mobile）
- [x] E2E（実Supabase認証後 admin/staff/viewer desktop/mobile）
- [x] E2E（全画面・操作・レスポンシブ監査 1440/1024/768/390）
- [x] CI設定
- [x] エラー状態確認（CSV/フォーム実装と単体テスト）
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run test:integration`
- [x] `RUN_REAL_E2E=1 npm run test:e2e`
- [x] `npm run build`

## Phase 6：納品資料

- [x] docs
- [x] legacy
- [x] README 完成
- [x] ポートフォリオ素材
- [x] 既知の制約
- [x] セキュリティ資料
- [x] README・docs・実装内容の整合確認

## Phase 7：最終確認

- [x] 全コマンド実行
- [x] 未完了確認
- [x] ローカル秘密情報の扱い確認
- [x] デモ公開手順の整理
- [x] 最終報告

## Phase 0 報告

- 作成したファイル: `package.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `IMPLEMENTATION_PLAN.md`
- 実行結果: ルート確認済み。`git init` は初回サンドボックス制限で失敗後、承認付きで成功。
- 未完了項目: README 初版、依存関係インストール、アプリ本体、DB設計、テスト、納品資料。

## Phase 1 報告

- 作成したファイル: `supabase/config.toml`, `supabase/migrations/202608040001_initial_schema.sql`, `scripts/seed-demo.mjs`, `lib/supabase/*`, `lib/auth.ts`
- 実行結果: SQLで7テーブル、制約、RLS、updated_atトリガー、案件履歴トリガーを作成。デモユーザーは環境変数のパスワードで作成する方式。ローカルSupabaseで `db reset` とシード再実行を確認済み。
- 未完了項目: なし。

## Phase 2 報告

- 作成したファイル: `app/(app)/jobs/*`, `components/job-form.tsx`, `components/due-badge.tsx`, `app/actions/jobs.ts`
- 実行結果: 一覧、詳細、登録、編集、検索、絞り込み、期限状態表示を実装。
- 未完了項目: 顧客・現場の専用管理画面は初回対象外。

## Phase 3 報告

- 作成したファイル: `app/(app)/users/page.tsx`, `app/actions/users.ts`
- 実行結果: admin/staff/viewerの画面制御、サーバー側権限チェック、DBトリガーによる履歴登録、実Supabase RLS統合テストを実装。
- 未完了項目: なし。

## Phase 4 報告

- 作成したファイル: `lib/csv.ts`, `lib/stores/csv-import-store.ts`, `app/(app)/csv-import/*`, `app/api/import/*`, `app/api/jobs/export/route.ts`
- 実行結果: CSV4ステップ、プレビュー、エラー一覧、正常行取込、取込結果、CSV出力を実装。
- 未完了項目: なし。

## Phase 5 報告

- 作成したファイル: `tests/*`, `playwright.config.ts`, `.github/workflows/ci.yml`
- 実行結果: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:integration`, `RUN_REAL_E2E=1 npm run test:e2e`, `npm run build` 成功。E2Eは合計10件。
- 未完了項目: なし。

## Phase 6 報告

- 作成したファイル: `docs/*`, `docs/portfolio/*`, `legacy/*`, README更新
- 実行結果: 要件、現行業務、移行対応表、DB設計、テスト結果、操作手順、管理者引継ぎ、制約、セキュリティ、ポートフォリオ素材、legacy CSVを作成。README・docs・実装内容の整合確認を実施。
- 未完了項目: 公開デモURL設定は未実施。
