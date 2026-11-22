# トコトコおでかけビンゴ帳（非公式）

名取さなさんの「さなちゃんねるトコトコおでかけビンゴ」（#さなちゃんねるトコトコおでかけビンゴ）を、
おでかけ中にスマホで遊びやすくするための **非公式ファンメイド** Web アプリ（PWA）です。

> ⚠️ 本アプリは名取さなさん・公式運営とは一切関係のない、ファンによる非公式・非営利の制作物です。
> 公式へのお問い合わせはご遠慮ください。二次創作は[名取さな 二次創作ガイドライン](https://natorisana.com/guideline/)に従っています。

- ビンゴのお題の出典: 名取さな YouTube 配信「さなちゃんねるトコトコおでかけビンゴを作ろう！」（2026/11/20）および公開されたビンゴカード（2026/11/21）

- アプリ: https://uu4k.github.io/natori-osanpo/

## 開発

```bash
cd app
npm ci
npm run dev        # 開発サーバー http://localhost:5173/natori-osanpo/
npm test           # 単体テスト（Vitest）
npm run test:e2e   # E2Eテスト（Playwright）
npm run build      # 本番ビルド（app/dist）
npm run build:no-official  # 公式素材を含まない版をビルド
```

`main` に push すると GitHub Actions でテストし、GitHub Pages に公開します。

## ドキュメント（ウォーターフォール）

| 工程 | ドキュメント | 状態 |
|---|---|---|
| 1. 要件定義 | [docs/01_requirements.md](docs/01_requirements.md) | v0.2 承認済み |
| 2. 基本設計 | [docs/02_basic_design.md](docs/02_basic_design.md) | v0.1 承認済み |
| 3. 詳細設計 | [docs/03_detailed_design.md](docs/03_detailed_design.md) | v0.1 承認済み |
| 4. 実装 | [app/](app/) | 完了（v0.1.0） |
| 5. テスト報告 | [docs/05_test_report.md](docs/05_test_report.md) | v0.1 実機確認待ち |
