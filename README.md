# Talk tgt la

香港人一齊傾偈嘅公開聊天室。

## 重點

- 訊息經 `/api/messages` 送出（消毒 + 限速 + IP 封鎖檢查）
- 前端 Realtime 照讀訊息；anon **唔可以** 直接 INSERT
- 管理員可刪訊息、封鎖／解除 IP

## 環境變數

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ADMIN_PASSWORD=
ADMIN_DELETE_TOKEN=   # 同 private.admin_config.delete_token 一致；亦用於 post_message / ban RPCs
ADMIN_SESSION_SECRET=
```

## 限速同自動封鎖

- Burst：10 秒內最多 3 句（暫時減速）
- Soft window：60 秒內最多 8 句／rate key（暫時減速）
- **自動封 IP**：同一 IP 60 秒內超過 20 句 → 寫入 `private.banned_ips`
- 訊息最多 500 字、暱稱最多 24 字
- DB `post_message` 負責 durable 限速、IP 封鎖檢查同自動封

## 管理員

公開 UI **冇**「管理」掣。登入方法（揀一種）：
- 開 `https://talktgtla.com/admin` 輸入 `ADMIN_PASSWORD`
- 主頁長按標題「Talk tgt la」約 1.2 秒
- 鍵盤：`Ctrl+Shift+A`（開密碼框）

登入後右上角會出現「封鎖」「登出」；可：
- **刪**／**刪+封**／**封 IP**
- **封鎖** 睇名單同解除

SQL 已套用：`post_message`、`admin_ban_*`、`private.banned_ips`、`private.message_client_ips`、`private.rate_buckets`；已移除公開 INSERT policy。

## Ambient bots

Vercel cron 每分鐘打 `/api/cron/ambient-bots`（要 `CRON_SECRET`）。
房內真實在線 < 2 人時，會用 `🤖` 前綴 persona 傾偈；有人在線就自動收聲。
人類限速／消毒唔受影響。

## 管理員發言

管理員登入後傳送嘅訊息會標 `is_admin`，暱稱用琥珀色 +「管理」徽章。
