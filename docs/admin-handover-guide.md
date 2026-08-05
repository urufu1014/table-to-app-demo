# 管理者向け引継ぎ資料

## 利用者

Supabase Authでユーザーを管理し、`profiles` テーブルで氏名、メール、権限、有効状態を管理する。シードでは管理者、担当者、閲覧者の3ユーザーを作成する。

## 権限

- admin: 管理者。全案件、CSV移行、利用者管理を扱える
- staff: 担当者。自分の担当案件を閲覧・登録・更新できる
- viewer: 閲覧者。全案件と履歴を閲覧できるが編集できない

権限変更は利用者・権限管理画面から行う。最後のadmin喪失防止と保存成功・失敗メッセージは初回版では未実装。

## CSV取込

CSV移行画面でファイルを選択し、プレビューと検証結果を確認する。正常行だけを明示確認後に取り込み、エラー行は取り込まず `import_errors` に記録する。取込単位の件数は `import_batches` に記録する。

## データ初期化

ローカルでは次を実行する。

```bash
npm run supabase:start
npm run supabase:reset
DEMO_PASSWORD=任意のローカル検証用パスワード SUPABASE_SERVICE_ROLE_KEY=... npm run seed:demo
```

ローカルSupabaseは既定ポート衝突を避けるため、API `55321`、DB `55322`、Studio `55323`、Mailpit `55324`、Analytics `55327` を使用する。

## 環境変数

`.env.example` を参照し、Supabase URL、公開可能キー、サーバー限定キー、デモパスワードを設定する。本番では publishable / secret を優先し、ローカルSupabaseでは anon / service_role も互換用に利用できる。

- `NEXT_PUBLIC_SUPABASE_URL`: ブラウザから参照されるSupabase URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: 本番で優先する公開可能キー。RLS前提で使う
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: ローカル互換用の公開可能キー
- `SUPABASE_SECRET_KEY`: 本番で優先するサーバー限定キー。RLSを回避するためブラウザへ渡さない
- `SUPABASE_SERVICE_ROLE_KEY`: ローカル互換用のサーバー限定キー。ブラウザへ渡さない
- `DEMO_PASSWORD`: シードと実DB検証用のデモパスワード
- `NEXT_PUBLIC_DEMO_PASSWORD`: ログイン画面で自動入力する公開デモ専用パスワード
- `ALLOW_REMOTE_TESTS`: リモートSupabase統合テストを明示許可するフラグ
- `REMOTE_TEST_PROJECT_REF`: リモート誤実行防止用のproject ref

`NEXT_PUBLIC_DEMO_PASSWORD` は秘密情報ではない。顧客環境や本番管理者パスワードには使用しない。

## 公開前ステータス

- GitHub URLは未公開
- 公開デモURLは未公開
- Supabase本番プロジェクトは未構築
- Vercel公開は未実施

公開する場合は、Supabase本番プロジェクトを先に構築し、Vercelへ本番用環境変数を設定する。`.env.remote.local` は本番デモ検証用のローカルファイルで、Git管理しない。実キーはREADMEやGitへ記載しない。公開後にREADMEへURLを追記する。

## 障害時の確認順

1. Supabase Authのユーザー状態
2. `profiles.is_active`
3. RLSポリシー
4. Server Action / Route Handler の権限判定
5. ブラウザのネットワークエラー
6. CSVの場合は `import_batches` と `import_errors`
7. 公開後はVercelのデプロイログ

## 検証コマンド

```bash
npm run lint
npm run typecheck
npm run test
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SECRET_KEY=... DEMO_PASSWORD=... npm run test:integration
RUN_REAL_E2E=1 DEMO_PASSWORD=... NEXT_PUBLIC_DEMO_PASSWORD=... npm run test:e2e
npm run build
```

`npm run test:e2e` は開発サーバーとローカルSupabaseを起動した状態で実行する。

## 引継ぎ時の注意

模擬納品であり、実顧客データは含めない。実在企業への納品実績ではない。公開前に `.env`、ログ、スクリーンショットへ秘密情報が含まれないことを確認する。
