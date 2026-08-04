# セキュリティメモ

## RLS

全アプリケーションテーブルでRLSを有効化している。admin、staff、viewerの権限差はDBポリシーで定義する。実Supabaseローカル環境で、service roleではなく各ユーザーのAuthセッションを使ったSELECT/INSERT/UPDATE拒否を統合テストで確認済み。

staffについては、自分担当案件はSELECTでき、他人担当案件はID指定SELECTでも0件になること、一覧SELECTにも自分担当以外が含まれないことを確認している。adminとviewerは仕様どおり同じ他人担当案件をSELECTできる。

## 秘密情報

`.env`、service role key、デモパスワードはコミットしない。`.env.example` にはプレースホルダだけを置く。

- `SUPABASE_SERVICE_ROLE_KEY` はサーバー側、シード、検証用途に限定し、ブラウザへ渡さない
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` はブラウザから参照される公開可能キーであり、RLSを前提に利用する
- `NEXT_PUBLIC_DEMO_PASSWORD` は公開デモ専用の資格情報としてのみ使用する
- `NEXT_PUBLIC_DEMO_PASSWORD` は顧客環境や本番管理者パスワードには使用しない
- `NEXT_PUBLIC_` で始まるため、`NEXT_PUBLIC_DEMO_PASSWORD` は秘密情報として保護される値ではない

実際のパスワード値、service role key、JWTはREADME、docs、Git管理ファイルへ記載しない。

## デモデータ

顧客名、住所、電話番号、メールは架空データのみを使う。実在企業への納品実績ではないことをREADMEとログイン画面に明記する。

## CSV

CSV取込では必須列、重複、日付、金額、担当者、進捗、請求状況を検証し、不正行は登録しない。CSV出力では `=`, `+`, `-`, `@`, タブ、改行で始まる値に `'` を付け、Excelで開く際のCSVインジェクションを抑制する。

## ログとエラー表示

利用者向けには日本語エラーを返し、Supabaseの技術的なエラーメッセージをそのまま表示しない。秘密情報やservice role keyをログへ出さない。

## 履歴

案件作成・更新履歴はDBトリガーで記録する。`actor_id` は作成時 `created_by`、更新時 `updated_by` を参照し、RLSにより権限外ユーザーが履歴を直接偽造できないことを確認している。

## AI利用

AI / Codexは実装とレビュー補助として利用する。要件、優先順位、受入判断は人間側で行い、型チェック、テスト、ビルドで確認する。実顧客データや秘密情報をAI検証用の資料へ含めない。
