# 点検案件管理のWebアプリ化

Excel・スプレッドシートで属人化していた点検案件管理を、権限、期限、履歴、検索、CSV移行を備えたWebアプリへ移行した模擬納品事例。

## 模擬顧客

南大阪設備点検株式会社。社員20人、専任エンジニアなしの架空設備点検会社。

## 移行前の問題

重複登録、必須項目漏れ、期限超過の見落とし、全員編集、更新履歴なし、引継ぎ資料なし。

## 担当範囲

要件整理、現行業務整理、DB設計、Next.js実装、Supabase Auth/RLS、CSV移行、テスト、操作手順書、管理者向け引継ぎ資料、本番公開。

## 設計

案件、顧客、現場、プロフィール、履歴、CSV取込バッチ、CSVエラーを分け、DB制約とRLSで守る。

## 実装

ログイン、案件一覧、詳細、登録・編集、顧客名・顧客コード・現場・住所・担当者を含む検索、CSV移行、利用者・権限管理を実装。

## データ移行

正常行だけを明示確認後に取り込み、エラー行は取り込まず理由を表示する。取込結果はCSV取込バッチとエラー明細に保存する。

## 権限

admin、staff、viewerの3権限。画面表示、Server Action、Route Handler、RLSで確認する。staffは自分担当案件のみ、viewerは閲覧のみ。

## テスト

lint、型チェック、unit/db test 20件、実Supabase integration test 2件、Playwright 本番E2E 10件、Next buildを実施。E2Eでは本番Vercelと本番Supabase上でログイン画面、実Auth後の主要導線、権限差、CSV操作、PC・タブレット・スマートフォン幅の表示を確認。GitHub Actionsも成功済み。

## 納品物

Webアプリ、SQLマイグレーション、シード、テスト、README、docs、legacy CSV。

## 対象外

マルチテナント、請求書PDF、会計連携、メール通知、AIチャット、顧客・現場の専用管理画面。

## 公開状況

GitHub公開済み、Supabase本番構築済み、Vercel本番公開済み。公開デモURLは https://table-to-app-demo.vercel.app/、GitHubは https://github.com/urufu1014/table-to-app-demo。admin / staff / viewerの本番ログイン、本番RLS、本番架空案件50件、画面検索とCSV出力の検索条件一致を確認済み。

## 模擬納品表記

公開されている業務委託・開発案件で求められる業務を参考に、架空の企業・データを用いて制作した模擬納品事例です。実在企業への納品実績ではありません。掲載内容はコード、DB、テスト、資料、本番画面から確認できる事実に限定しています。
