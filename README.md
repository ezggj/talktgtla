# Talk tgt la

香港人一齊傾偈 · 訓練 · 飲食。公開聊天室＋健身日誌＋影餐營養估算＋課表生成。

## 路由

| 路徑 | 說明 |
|------|------|
| `/` | 傾偈（Realtime 聊天，匿名友善） |
| `/train` | 訓練日誌（組數／重量／時間、課表、PR、雲端同步） |
| `/eat` | 飲食（影相估算＋日／週／月歷史匯總） |
| `/me` | 登入、目標、課表生成器 |
| `/admin` | 管理員（長按標題 / Ctrl+Shift+A；同會員 Auth 分開） |
| `/auth/confirm` · `/auth/callback` | Magic link / PKCE 回跳 |

## Auth 同雲端

- Supabase Auth：**電郵 magic link**（可選 6 位碼）
- 登入後：訓練、飲食、目標、課表上雲；RLS 只得自己
- 訪客仍可用本機 localStorage；登入會遷移本機資料
- **Dashboard 必須設定**（Authentication → URL Configuration）：
  - Site URL: `https://talktgtla.com`
  - Redirect URLs: `https://talktgtla.com/**`, `https://talktgtla.com/auth/confirm`, `https://talktgtla.com/auth/callback`, `http://localhost:3000/**`

## 飲食匯總

- 每餐 `eaten_at` 永久保存（登入）
- UI：日／週／月切換＋日曆熱圖
- SQL：`meal_period_totals`（`date_trunc`，Asia/Hong_Kong）

## 課表生成

`/me` 五步表單（目標／經驗／日數／時長／器材）→ 規則引擎出一週 split → 「開波」帶動作入 `/train`。

## 環境變數

見 `.env.example`。Production 已有 `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`。

## 設計

Linear + Stripe + Apple：`#FAFAF9`、accent `#0F766E`、Instrument Serif、Geist、Framer Motion。

## 開發

```bash
npm install && npm run dev
npm run build
```
