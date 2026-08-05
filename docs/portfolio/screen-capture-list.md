# スクリーンショット一覧

撮影日: 2026-08-05
撮影環境: 本番URL `https://table-to-app-demo.vercel.app/`
撮影方法: Playwright `page.screenshot`

| ファイル名 | 撮影画面 | 権限 | 画面幅 | 表示状態 | 掲載候補 | 使用目的 |
|---|---|---|---:|---|---|---|
| `01-login-desktop.png` | ログイン | 未ログイン | 1440 | 事業説明、模擬納品表記、管理者・担当者・閲覧者の選択肢、空のパスワード欄 | 優先 | スプレッドシート管理からWebアプリ化した背景と3権限ログインを示す |
| `02-jobs-overview-desktop.png` | 案件一覧 | admin | 1440 | 全案件数、期限超過、7日以内、未完了、検索・絞り込み欄、一覧表 | 優先 | 初期表示で案件管理の全体像、期限管理、一覧性を示す |
| `03-customer-search-desktop.png` | 案件一覧 | admin | 1440 | 検索語 `堺中央ビル管理`、検索結果6件、1 / 1ページ、検索欄にキーワード表示 | 優先 | 顧客名によるDB側キーワード検索と件数反映を示す |
| `04-job-detail-history-desktop.png` | 案件詳細 | admin | 1440 | 顧客、現場、担当者、期限、進捗、請求状況、備考、更新履歴 | 優先 | 案件詳細と変更履歴が同時に追えることを示す |
| `05-job-form-validation-desktop.png` | 案件登録 | admin | 1440 | 未保存入力、日付前後関係の日本語エラー、必須項目を含む入力フォーム | 候補 | 保存前検証と日本語エラーハンドリングを示す |
| `06-csv-preview-errors-desktop.png` | CSV移行 | admin | 1440 | `legacy/sample-inspection-jobs-with-errors.csv` のプレビュー、総行数、正常行、失敗行、エラー件数、行番号、列、理由 | 優先 | 旧CSV移行時に正常行と異常行を分けて確認できることを示す |
| `07-admin-users-desktop.png` | 利用者・権限管理 | admin | 1440 | 3ユーザー、admin / staff / viewer、権限と有効状態 | 候補 | 管理者による利用者・権限管理画面を示す |
| `08-viewer-permission-desktop.png` | 案件詳細 | viewer | 1440 | 閲覧のみ可能、CSV・利用者・新規登録・編集ボタンなし、更新履歴表示 | 優先 | viewer権限では閲覧に限定されることを示す |
| `09-jobs-mobile.png` | 案件一覧 | admin | 390 | モバイル表示、集計、検索・絞り込み欄、一覧表への導線 | 優先 | レスポンシブ対応とスマートフォンでの案件確認を示す |
| `10-login-mobile.png` | ログイン | 未ログイン | 390 | 事業説明、模擬納品表記、3権限選択、パスワード未表示 | 候補 | モバイルでもデモの位置付けと権限選択が伝わることを示す |

全画像は本番URLで撮影した。パスワード、secret key、publishable key、ローカルパス、Supabase Dashboard、Vercel管理画面は含めていない。
