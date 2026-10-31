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
| `/auth/confirm` · `/auth/callback` | Magic link / PKCE 回跳 |

## Auth 同雲端

- Supabase Auth：**Google／Apple OAuth（建議）**＋電郵 magic link／6 位碼（次選）
- 登入後：訓練、飲食、目標、課表上雲；RLS 只得自己
- 訪客仍可用本機 localStorage；登入會遷移本機資料
- `authRedirectTo()` 永遠用 `https://talktgtla.com`（`NEXT_PUBLIC_SITE_URL`），避免電郵／OAuth 跳去 localhost
- **Dashboard 必須設定**（Authentication → URL Configuration）：
  - Site URL: `https://talktgtla.com`
  - Redirect URLs: `https://talktgtla.com/**`, `https://talktgtla.com/auth/confirm`, `https://talktgtla.com/auth/callback`, `http://localhost:3000/**`

### 開 Google 登入

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth client ID（Web application）
2. Authorized redirect URI（必須係 Supabase callback，唔係自己網站）：
   `https://etbgulbuzezrdoqvvamy.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Authentication → Providers → **Google** → Enable，貼上 Client ID + Client Secret（secret 只放 dashboard，**唔好**寫入 Next.js env）
4. 儲存後喺 `/me` 撳「用 Google 登入」試

### 開 Apple 登入

UI 已有「用 Apple 登入」（`signInWithOAuth({ provider: 'apple' })`，`redirectTo` 同 Google）。

後台要自己開（唔開掣會提示）：

1. [Apple Developer](https://developer.apple.com/) → Certificates, Identifiers & Profiles
2. 整 **Services ID**（Sign in with Apple），domains／return URL 用 Supabase callback：
   `https://etbgulbuzezrdoqvvamy.supabase.co/auth/v1/callback`
3. 整 **Key**（Sign in with Apple），下載 `.p8`，記低 Key ID + Team ID
4. Supabase Dashboard → Authentication → Providers → **Apple** → Enable，填 Services ID、Secret Key（`.p8`）、Key ID、Team ID
5. `/me` 撳「用 Apple 登入」試

## 飲食匯總

- 每餐 `eaten_at` 永久保存（登入）
- UI：日／週／月切換＋日曆熱圖
- SQL：`meal_period_totals`（`date_trunc`，Asia/Hong_Kong）

## 課表生成

`/me` 五步表單（目標／經驗／日數／時長／器材）→ 規則引擎出一週 split → 「開波」帶動作入 `/train`。


## 影相估營養（真 AI）

- 路徑：`POST /api/eat/estimate`（Vercel AI Gateway + AI SDK `generateText` + vision）
- 預設模型：`AI_GATEWAY_MODEL`（production 設咗 `google/gemini-2.5-flash`）
- Production 用 **Vercel OIDC** 打 Gateway，唔使喺 client 暴露 key
- 客戶端先壓縮相片再上傳；IP rate limit（burst + 日額）
- 成功：`meals.source = 'ai'`；失敗會 toast 並 fallback 示範估算（`mock`）
- UI 一律標「估算」，份量滑桿即時重算四大營養素

> **注意：** AI Gateway 免費 Credits 需要 team 已加有效信用卡（`customer_verification_required`）。未開通時影相會 toast 並 fallback 示範估算。


## 環境變數

見 `.env.example`。Production 已有 `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`。

## 設計

Linear + Stripe + Apple：`#FAFAF9`、accent `#0F766E`、**Fraunces**（標題）、Geist（內文）、Framer Motion。文案用口語香港廣東話。

## 開發

```bash
npm install && npm run dev
npm run build
```
