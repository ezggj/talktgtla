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

## 限速

- Burst：10 秒內最多 3 句
- Window：60 秒內最多 8 句
- 訊息最多 500 字、暱稱最多 24 字
- DB 層亦有 per-key 60 秒 / 8 句限速同 IP 封鎖檢查

## 管理員

右上角「管理」登入後：
- **刪**／**刪+封**／**封 IP**
- **封鎖** 睇名單同解除

SQL 已套用：`post_message`、`admin_ban_*`、`private.banned_ips`、`private.message_client_ips`、`private.rate_buckets`；已移除公開 INSERT policy。
