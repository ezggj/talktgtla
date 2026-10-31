# Talk tgt la

香港人一齊傾偈 · 訓練 · 飲食。公開聊天室＋健身日誌＋影餐營養估算。

## 路由

| 路徑 | 說明 |
|------|------|
| `/` | 傾偈（Realtime 聊天） |
| `/train` | 訓練日誌（組數／重量／時間、課表、PR、休息計時） |
| `/eat` | 飲食（影相估算 kcal／蛋白／碳水／脂肪） |
| `/me` | 個人目標（登入稍後接 Auth） |
| `/admin` | 管理員登入（唔公開顯示） |

## 設計

Linear + Stripe + Apple 風格：暖灰白底 `#FAFAF9`、深青 accent `#0F766E`、Instrument Serif 標題、Geist 內文、Framer Motion spring。手機底部四格導航：傾偈｜訓練｜飲食｜我。

訓練／飲食資料暫存 `localStorage`，結構已預留接 Supabase Auth + RLS。

## 環境變數

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ADMIN_PASSWORD=
ADMIN_DELETE_TOKEN=
ADMIN_SESSION_SECRET=
CRON_SECRET=
```

## 聊天安全

- 訊息經 `/api/messages`（消毒 + 限速 + IP 封鎖）
- 前端 Realtime 只讀；anon **唔可以** 直接 INSERT
- 管理員：`/admin`、長按標題、或 `Ctrl+Shift+A`

## Ambient bots

Vercel cron 每分鐘打 `/api/cron/ambient-bots`。房內真實在線 < 2 人時用 `🤖` persona 暖場。

## 開發

```bash
npm install
npm run dev
npm run build
```

## 下一步

1. Supabase Auth + `profiles` / `workouts` / `meals`
2. Storage 私人 bucket 放餐相
3. Vision AI 估營養（取代本機 mock）
