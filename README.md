# 給与ダッシュボード

派遣・シフト制向け給与確認Webアプリ（Vite + React）

## ローカル起動

```bash
npm install
npm run dev
```

→ http://localhost:5173 で開く

## Vercel デプロイ手順

### 1. GitHubにpush

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/salary-app.git
git push -u origin main
```

### 2. Vercelでデプロイ

1. https://vercel.com にアクセス → GitHubでサインイン
2. **Add New → Project** → リポジトリを選択 → **Import**
3. Framework Preset: **Vite** が自動検出される
4. **Deploy** をクリック → 完了

以降は `git push` するだけで自動再デプロイされます。

## フォルダ構成

```
salary-app/
├── index.html        ← エントリーHTML
├── vite.config.js    ← Vite設定
├── package.json
├── .gitignore
└── src/
    ├── main.jsx      ← Reactマウント
    └── App.jsx       ← アプリ本体（全コンポーネント）
```
