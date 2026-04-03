# ABA行動記録・事例蓄積ツール

GitHub Pages でそのまま公開できる静的構成です。サーバー不要で、`index.html` を起点に動作します。

## ディレクトリ構成

```text
aba-record-tool/
├─ index.html
├─ README.md
└─ assets/
   ├─ css/
   │  └─ styles.css
   └─ js/
      ├─ app.js        # 初期化・イベント・画面遷移・一覧表示
      ├─ config.js     # 定数、選択肢、フォーム定義
      ├─ core.js       # 状態管理、DOM共通処理、保存/読込、基本ユーティリティ
      ├─ analysis.js   # 機能仮説、介入案、要約、AI用プロンプト生成
      ├─ charts.js     # Canvasによる簡易グラフ描画
      ├─ history.js    # 利用者別履歴、月次レポート、集計
      └─ week.js       # 週次30分表、ヒートマップ、セルからABC起票
