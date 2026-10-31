# Talk tgt la

香港人一齊傾偈 · 訓練 · 飲食。公開聊天室＋健身日誌＋影餐營養估算＋課表生成。

## 路由

| 路徑 | 說明 |
|------|------|
| `/` | 傾偈（Realtime 聊天，匿名友善） |
| `/train` | 訓練日誌（組數／重量／時間、課表、PR、雲端同步） |
| `/eat` | 飲食（影相估算＋日／週／月歷史匯總） |
| `/me` | 登入、目標、課表生成器 |
| `/admin` | 管理員（不公開連結；長按標題 / Ctrl+Shift+A） |
| `/auth/confirm` · `/auth/callback` | Google／舊連結回跳 |

## Auth 同雲端

- Supabase Auth：**Google OAuth（建議）**＋電郵六位數字（次選，唔係 magic link）
- 登入後：訓練、飲食、目標、課表同步去你個帳戶；RLS 只得自己
- 訪客仍可用本機 localStorage；登入會遷移本機資料
- `authRedirectTo()` 永遠用 `https://talktgtla.com`（`NEXT_PUBLIC_SITE_URL`），避免電郵／OAuth 跳去 localhost
- **Dashboard 必須設定**（Authentication → URL Configuration）：
  - Site URL: `https://talktgtla.com`
  - Redirect URLs: `https://talktgtla.com/**`, `https://talktgtla.com/auth/confirm`, `https://talktgtla.com/auth/callback`, `http://localhost:3000/**`
- **電郵六位數字**（Authentication → Email Templates → Magic Link）：Supabase 用呢個模板寄 `signInWithOtp`。主旨改成「你嘅六位數字」，內容用 `supabase/templates/magic_link.html`（只顯示 `{{ .Token }}`）。唔好留「Sign in」／`{{ .ConfirmationURL }}`，否則用戶會收到 magic link 而唔係六位數字。App 寄碼時**唔會**傳 `emailRedirectTo`。

### 開 Google 登入

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth client ID（Web application）
2. Authorized redirect URI（必須係 Supabase callback，唔係自己網站）：
   `https://etbgulbuzezrdoqvvamy.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Authentication → Providers → **Google** → Enable，貼上 Client ID + Client Secret（secret 只放 dashboard，**唔好**寫入 Next.js env）
4. 儲存後喺 `/me` 撳「用 Google 登入」試


## 飲食匯總

- 每餐 `eaten_at` 永久保存（登入）
- UI：日／週／月切換＋日曆熱圖
- SQL：`meal_period_totals`（`date_trunc`，Asia/Hong_Kong）

## 課表生成

`/me` 五步表單（目標／經驗／日數／時長／器材）→ 規則引擎出一週 split → 「開波」帶動作入 `/train`。


## 影相估營養（免費限次 + 可改）

- 路徑：`POST /api/eat/estimate`（Vercel AI Gateway + AI SDK `generateText` + vision）
- 預設模型：`AI_GATEWAY_MODEL`（production 設咗 `google/gemini-2.5-flash`）
- Production 用 **Vercel OIDC** 打 Gateway，唔使喺 client 暴露 key
- **免費限次（預設每日 3 次，`EAT_AI_FREE_DAILY_LIMIT`）**：按登入 user id／訪客 fingerprint／IP，計香港日曆日；持久化於 Supabase `eat_ai_daily_quota`（`peek_eat_ai_quota` / `consume_eat_ai_quota`）
- 超出限次 → `code: free_limit`，前端開可改數字卡（唔逼 Gateway 收費）
- 成功：`meals.source = 'ai'`；Gateway billing／失敗 → 溫和手動／示範卡，數字一律可改
- UI：卡路里／蛋白／碳水／脂肪撳格即改；份量滑桿即時重算

> **AI Gateway note (#2)：** 優先走 **免費限次 + 用戶可改** 路徑；真 AI 有 Gateway Credits 就用，冇／billing 失敗就 fallback 手動編輯，唔阻擋核心 UX。加卡買 Credits 係可選加速，唔係必須。


## 環境變數

見 `.env.example`。Production 已有 `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`。

## 設計

Linear + Stripe + Apple：`#FAFAF9`、accent `#0F766E`、**Fraunces**（標題）、Geist（內文）、Framer Motion。文案用口語香港廣東話。

## 開發

```bash
npm install && npm run dev
npm run build
```
