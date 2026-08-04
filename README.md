# 点検案件管理アプリ

Excel・スプレッドシートで属人化していた点検案件管理を、認証、権限、期限、検索、履歴、CSV移行を備えたWebアプリへ移行する模擬納品事例です。

> 公開されている業務委託・開発案件で求められる業務を参考に、架空の企業・データを用いて制作した模擬納品事例です。実在企業への納品実績ではありません。

## 困っている会社

南大阪設備点検株式会社という架空の設備点検会社を想定しています。ExcelまたはGoogleスプレッドシートで案件番号、顧客、現場、点検予定日、提出期限、進捗、請求状況を管理していました。

## 移行前の問題

- 同じ案件番号を二重登録できる
- 必須項目が空でも保存できる
- 期限超過が分かりにくい
- 全員がすべて編集できる
- 誰が何を変更したか分からない
- データが増えると探しにくい
- 引継ぎ資料がない

## Webアプリで解決すること

- Supabase Auth によるログイン
- admin / staff / viewer の権限分離
- PostgreSQL 制約と RLS による重複・権限外操作の防止
- 案件一覧、詳細、登録、編集
- 検索、絞り込み、期限超過表示
- CSVプレビュー、検証、取込、結果記録
- 更新履歴
- 操作手順書と管理者向け引継ぎ資料

## 公開状況

- GitHub URL: 未公開
- 公開デモURL: 未公開
- Supabase本番プロジェクト: 未構築
- Vercel: 未公開

このREADMEはローカル検証済みコードの説明です。公開URLは作成後に追記します。

## 技術構成

採用バージョンは `package-lock.json` で固定しています。

- Next.js App Router 16.3.0
- React 19.2.8
- TypeScript 6.0.3
- Tailwind CSS 4.3.3
- Supabase JS 2.112.0 / Supabase Auth / PostgreSQL / RLS
- Supabase SSR 0.12.4
- Zustand 5.0.14
- Zod 4.4.3
- Node.js 24.11.1 / npm 11.6.2
- Node.js標準テストランナー
- Playwright 1.62.1

GitHub ActionsとVercelは公開工程で使用予定ですが、現時点ではGitHub公開とVercel公開は未実施です。

## ローカル起動

```bash
npm install
npm run supabase:start
npm run supabase:reset
DEMO_PASSWORD=任意のローカル検証用パスワード SUPABASE_SERVICE_ROLE_KEY=... npm run seed:demo
npm run dev
```

ローカルSupabaseは既定ポート衝突を避けるため、APIは `http://127.0.0.1:55321`、DBは `127.0.0.1:55322`、Studioは `http://127.0.0.1:55323` を使用します。

## 環境変数

`.env.example` をコピーして、ローカル環境の値を設定します。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEMO_ADMIN_EMAIL`
- `DEMO_STAFF_EMAIL`
- `DEMO_VIEWER_EMAIL`
- `DEMO_PASSWORD`
- `NEXT_PUBLIC_DEMO_PASSWORD`
- `NEXT_PUBLIC_DEMO_NOTE`

`SUPABASE_SERVICE_ROLE_KEY` はサーバー側処理、シード、検証用途だけで使い、ブラウザへ渡しません。

## デモアカウント

シードで次の架空ユーザーを作成します。実際のパスワード値はREADMEやGitへ記載しません。

- 管理者: `admin@table-to-app.example`
- 担当者: `staff@table-to-app.example`
- 閲覧者: `viewer@table-to-app.example`

ログイン画面の役割選択では、公開デモ専用として `NEXT_PUBLIC_DEMO_PASSWORD` の値を自動入力します。`NEXT_PUBLIC_DEMO_PASSWORD` はブラウザから参照できるため、秘密情報として保護される値ではありません。顧客環境や本番管理者パスワードには使わず、公開デモ専用の資格情報として扱います。

## 主な画面

- `/login`: ログイン
- `/jobs`: 案件一覧・簡易ダッシュボード
- `/jobs/new`: 案件登録
- `/jobs/[id]`: 案件詳細・更新履歴
- `/jobs/[id]/edit`: 案件編集
- `/csv-import`: CSV移行
- `/users`: 利用者・権限管理

`/` は `/jobs` へリダイレクトします。

## APIとServer Action

- `/api/import/preview`: CSVプレビューと検証
- `/api/import/commit`: 正常CSV行の取込と結果記録
- `/api/jobs/export`: 絞り込み条件を反映したCSV出力
- `app/actions/auth.ts`: ログアウト
- `app/actions/jobs.ts`: 案件登録・編集
- `app/actions/users.ts`: 利用者権限更新

## Supabase設計

SQLマイグレーションは `supabase/migrations/202608040001_initial_schema.sql` の1本です。`profiles`, `customers`, `sites`, `inspection_jobs`, `job_history`, `import_batches`, `import_errors` の7テーブルを定義し、主キー、外部キー、一意制約、日付・金額チェック、インデックス、RLSポリシー、更新日時トリガー、案件履歴トリガーを含みます。

## CSV移行

対象CSVの列は `legacy/sample-inspection-jobs.csv` と `legacy/sample-inspection-jobs-with-errors.csv` を参照してください。

- 正常サンプル: 20データ行
- 異常サンプル: 11データ行
- 正常行だけを明示確認後に取り込む
- 不正行は登録せず、`import_errors` に理由を記録する
- `failed_rows` は失敗した行数、`import_errors` はエラー件数として扱う
- 同じ行に複数エラーがある場合、失敗行数は1、エラー件数は複数になる

## テスト

ローカル確認は次の順序で再現します。

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
RUN_REAL_E2E=1 npm run test:e2e
npm run build
```

`npm run test:integration` はローカルSupabaseを起動し、必要な環境変数をプロセスへ渡して実行します。

```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... DEMO_PASSWORD=... npm run test:integration
```

`RUN_REAL_E2E=1 npm run test:e2e` は開発サーバーとローカルSupabaseを起動した状態で実行します。モックE2Eはログイン画面の失敗表示を確認し、実Auth/DB E2Eはadmin / staff / viewer の認証後導線、権限差、画面崩れ、主要画面のレスポンシブを確認します。

今回の確認結果は [docs/test-report.md](docs/test-report.md) に記録しています。

## ドキュメント一覧

- [要件定義](docs/requirements.md)
- [現行業務フロー](docs/current-workflow.md)
- [移行対応表](docs/migration-map.md)
- [DB設計](docs/database-design.md)
- [テストレポート](docs/test-report.md)
- [操作手順書](docs/operation-guide.md)
- [管理者向け引継ぎ資料](docs/admin-handover-guide.md)
- [既知の制約](docs/known-limitations.md)
- [セキュリティメモ](docs/security-notes.md)
- [ポートフォリオ掲載用コピー](docs/portfolio/case-study-copy.md)
- [ポートフォリオ掲載用ファクト](docs/portfolio/portfolio-facts.md)
- [スクリーンショット一覧](docs/portfolio/screen-capture-list.md)

## Vercel公開予定

Vercel公開は未実施です。公開時は、Supabase本番プロジェクトを構築し、Vercelに必要な環境変数を設定します。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEMO_PASSWORD`
- `NEXT_PUBLIC_DEMO_PASSWORD`

公開後にデモURLをこのREADMEへ追記します。

## セキュリティ

- service role keyはクライアントへ渡しません
- RLSはSQLマイグレーションで有効化しています
- CSV出力ではCSVインジェクション対策を行います
- `.env` はGit管理対象外です
- 実顧客データや実在企業の納品実績は含めません

詳細は [docs/security-notes.md](docs/security-notes.md) を参照してください。

## 既知の制約

公開前ステータスと初回版の制約は [docs/known-limitations.md](docs/known-limitations.md) を参照してください。

## AI / Codex利用方針

AI / Codexは、調査、実装、レビュー補助に利用しています。要件、優先順位、設計判断、受入判断は人間側で行い、型チェック、テスト、ビルド、画面確認を通して採用しています。
