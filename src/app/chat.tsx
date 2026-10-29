'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

type Message = {
  id: number
  username: string
  content: string
  created_at: string
  reply_to: number | null
}

const EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🔥', '❤️', '🎉', '😢', '🤔', '👏', '✨'] as const

function formatRelativeTime(iso: string, nowMs: number): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const diffSec = Math.round((nowMs - then) / 1000)
  if (diffSec < 45) return '剛剛'
  if (diffSec < 3600) {
    const mins = Math.max(1, Math.floor(diffSec / 60))
    return `${mins} 分鐘前`
  }
  if (diffSec < 86400) {
    const hours = Math.max(1, Math.floor(diffSec / 3600))
    return `${hours} 小時前`
  }
  if (diffSec < 86400 * 7) {
    const days = Math.max(1, Math.floor(diffSec / 86400))
    return `${days} 日前`
  }

  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date(nowMs).getFullYear()
  return d.toLocaleString('zh-HK', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [username, setUsername] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [replyToId, setReplyToId] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [showJump, setShowJump] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminBusy, setAdminBusy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [nowMs, setNowMs] = useState(0) // set after mount (avoid prerender Date.now)
  const listRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottomRef = useRef(true)
  const initialScrollDone = useRef(false)

  const messagesById = useMemo(() => {
    const map = new Map<number, Message>()
    for (const msg of messages) map.set(msg.id, msg)
    return map
  }, [messages])

  const replyTarget = replyToId != null ? messagesById.get(replyToId) ?? null : null

  const isNearBottom = useCallback(() => {
    const el = listRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }, [])

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = listRef.current
    if (el) {
      if (behavior === 'auto') {
        el.scrollTop = el.scrollHeight
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
    }
    stickToBottomRef.current = true
    setShowJump(false)
  }, [])

  const onListScroll = () => {
    const near = isNearBottom()
    stickToBottomRef.current = near
    setShowJump(!near)
  }

  useEffect(() => {
    setNowMs(Date.now())
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => setIsAdmin(Boolean(d?.admin)))
      .catch(() => setIsAdmin(false))
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100)
      if (data) {
        setMessages(data as Message[])
      }
    }
    loadMessages()

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as Message
            if (prev.some((m) => m.id === next.id)) return prev
            return [...prev, next]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const oldRow = payload.old as { id?: number }
          if (oldRow?.id == null) return
          setMessages((prev) => prev.filter((m) => m.id !== oldRow.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!messages.length) return
    if (!initialScrollDone.current) {
      requestAnimationFrame(() => {
        scrollToLatest('auto')
        initialScrollDone.current = true
      })
      return
    }
    if (stickToBottomRef.current) {
      requestAnimationFrame(() => scrollToLatest('smooth'))
    } else {
      setShowJump(true)
    }
  }, [messages, scrollToLatest])

  const resizeComposer = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  useEffect(() => {
    resizeComposer()
  }, [newMessage, resizeComposer])

  const startReply = (msg: Message) => {
    setReplyToId(msg.id)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const cancelReply = () => setReplyToId(null)

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current
    if (!el) {
      setNewMessage((prev) => prev + emoji)
      return
    }
    const start = el.selectionStart ?? newMessage.length
    const end = el.selectionEnd ?? newMessage.length
    const next = newMessage.slice(0, start) + emoji + newMessage.slice(end)
    setNewMessage(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + emoji.length
      el.setSelectionRange(pos, pos)
      resizeComposer()
    })
  }

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!isSupabaseConfigured || !newMessage.trim() || sending) return

    const displayName = isAnonymous ? '匿名' : username.trim() || '匿名'
    const content = newMessage.trim()
    const reply_to = replyToId

    setSending(true)
    setNewMessage('')
    setReplyToId(null)
    setShowEmoji(false)
    stickToBottomRef.current = true
    setShowJump(false)

    try {
      await supabase.from('messages').insert([
        {
          username: displayName,
          content,
          reply_to,
        },
      ])
      requestAnimationFrame(() => scrollToLatest('smooth'))
    } finally {
      setSending(false)
      inputRef.current?.focus()
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }
    }
  }

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return
    // Avoid sending while IME is composing (Canto/Mandarin input)
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.shiftKey) return // newline
    e.preventDefault()
    void sendMessage()
  }

  const loginAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminBusy(true)
    setAdminError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      })
      if (!res.ok) {
        setAdminError(res.status === 401 ? '密碼錯誤' : '登入失敗')
        return
      }
      setIsAdmin(true)
      setShowAdminLogin(false)
      setAdminPassword('')
    } catch {
      setAdminError('網絡錯誤')
    } finally {
      setAdminBusy(false)
    }
  }

  const logoutAdmin = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setIsAdmin(false)
  }

  const deleteMessage = async (id: number) => {
    if (!isAdmin) return
    if (!window.confirm('確定刪除呢條訊息？')) return
    const res = await fetch('/api/admin/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      window.alert('刪除失敗')
      return
    }
    setMessages((prev) => prev.filter((m) => m.id !== id))
    if (replyToId === id) setReplyToId(null)
  }

  const previewText = (text: string) =>
    text.length > 60 ? `${text.slice(0, 60)}…` : text

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto bg-white dark:bg-zinc-900 overflow-hidden">
      <header className="p-3 border-b bg-zinc-100/90 dark:bg-zinc-800/90 backdrop-blur-sm shrink-0 z-10">
        <div className="relative">
          <h1 className="text-xl font-bold text-center tracking-tight">Talk tgt la</h1>
          <div className="absolute right-0 top-0">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => void logoutAdmin()}
                className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline"
              >
                管理員登出
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowAdminLogin(true)
                  setAdminError('')
                }}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                aria-label="管理員登入"
              >
                管理
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-center text-zinc-500">香港人一齊傾偈</p>
        <p className="mt-1.5 text-[10px] text-center text-zinc-400 leading-snug">
          公開聊天室 · 訊息由用戶發佈，唔代表本平台立場 · 請遵守下方使用條款
        </p>
        {isAdmin && (
          <p className="mt-1 text-[10px] text-center text-amber-700 dark:text-amber-300">
            管理員模式：可刪除違規訊息
          </p>
        )}
      </header>

      {!isSupabaseConfigured && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          未設定 Supabase。請喺 Vercel 加環境變數
          <code className="mx-1">NEXT_PUBLIC_SUPABASE_URL</code>
          同
          <code className="mx-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          ，跟住照 README 建 messages 表。
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <div
          ref={listRef}
          onScroll={onListScroll}
          className="chat-messages h-full overflow-y-auto p-4 space-y-3"
        >
          {messages.map((msg) => {
            const parent = msg.reply_to != null ? messagesById.get(msg.reply_to) : null
            const isReplying = replyToId === msg.id
            return (
              <div key={msg.id} className="chat-msg flex flex-col">
                <div className="text-xs text-zinc-500 mb-0.5">{msg.username}</div>
                <button
                  type="button"
                  onClick={() => startReply(msg)}
                  className={`text-left rounded-2xl p-3 max-w-[85%] transition-all duration-150 ease-out active:scale-[0.98] ${
                    isReplying
                      ? 'bg-blue-100 dark:bg-blue-950 ring-2 ring-blue-400/60'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/90 dark:hover:bg-zinc-700'
                  }`}
                >
                  {parent && (
                    <div className="mb-2 rounded-lg border-l-2 border-blue-400 bg-white/70 dark:bg-black/25 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="font-medium text-zinc-600 dark:text-zinc-300">
                        回覆 {parent.username}
                      </div>
                      <div className="truncate">{previewText(parent.content)}</div>
                    </div>
                  )}
                  {!parent && msg.reply_to != null && (
                    <div className="mb-2 rounded-lg border-l-2 border-zinc-300 px-2 py-1 text-xs text-zinc-400">
                      回覆一則訊息
                    </div>
                  )}
                  <div className="leading-relaxed break-words whitespace-pre-wrap">{msg.content}</div>
                </button>
                <div className="flex items-center gap-2 mt-1 pl-0.5">
                  <span
                    className="text-xs text-zinc-400"
                    title={new Date(msg.created_at).toLocaleString('zh-HK')}
                  >
                    {nowMs
                      ? formatRelativeTime(msg.created_at, nowMs)
                      : new Date(msg.created_at).toLocaleTimeString('zh-HK', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                  </span>
                  <button
                    type="button"
                    onClick={() => startReply(msg)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline active:opacity-70 transition-opacity"
                  >
                    回覆
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => void deleteMessage(msg.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline active:opacity-70 transition-opacity"
                    >
                      刪除
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {showJump && (
          <button
            type="button"
            onClick={() => scrollToLatest('smooth')}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900/90 dark:bg-zinc-100/90 text-white dark:text-zinc-900 text-xs px-3 py-1.5 shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
          >
            最新訊息 ↓
          </button>
        )}
      </div>

      <form
        onSubmit={sendMessage}
        className="p-3 border-t bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm shrink-0"
      >
        {replyTarget && (
          <div className="chat-reply-bar mb-2 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 px-3 py-2">
            <div className="flex-1 min-w-0 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="font-medium">回覆 {replyTarget.username}</div>
              <div className="truncate">{previewText(replyTarget.content)}</div>
            </div>
            <button
              type="button"
              onClick={cancelReply}
              className="shrink-0 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 active:opacity-70 transition-colors"
              aria-label="取消回覆"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            匿名
          </label>
          {!isAnonymous && (
            <input
              type="text"
              placeholder="你的名字"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400/50 transition"
            />
          )}
        </div>

        {showEmoji && (
          <div className="emoji-picker mb-2 flex flex-wrap gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 p-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="h-9 w-9 rounded-lg text-xl leading-none hover:bg-zinc-200/80 dark:hover:bg-zinc-700 active:scale-90 transition-transform"
                aria-label={`插入 ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className={`shrink-0 h-10 w-10 rounded-full border text-lg flex items-center justify-center transition-all active:scale-95 ${
              showEmoji
                ? 'bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700'
                : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            aria-label="表情符號"
            aria-expanded={showEmoji}
          >
            😊
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            placeholder={replyTarget ? '回覆訊息…（Enter 傳送）' : '輸入訊息…（Enter 傳送）'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={onComposerKeyDown}
            disabled={sending}
            enterKeyHint="send"
            className="flex-1 border rounded-2xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-400/50 transition disabled:opacity-60 resize-none max-h-[120px] leading-relaxed"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="shrink-0 bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 h-10"
          >
            {sending ? '…' : '傳送'}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-400 text-center">
          Enter 傳送 · Shift+Enter 換行
        </p>
      </form>

      <footer className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/95 dark:bg-zinc-950/95 shrink-0">
        <button
          type="button"
          onClick={() => setShowTerms((v) => !v)}
          className="w-full text-left text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          aria-expanded={showTerms}
        >
          <span className="font-medium text-zinc-600 dark:text-zinc-300">使用條款／免責聲明</span>
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
          <span>用戶須為言論負責 · 嚴禁違法／誹謗／色情／仇恨內容 · 平台可刪除及封鎖 · 唔對用戶內容負責</span>
          <span className="ml-1 text-blue-600 dark:text-blue-400">{showTerms ? '收起' : '詳情'}</span>
        </button>
        {showTerms && (
          <ul className="mt-2 list-disc pl-4 space-y-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 marker:text-zinc-400">
            <li>
              呢個係<strong className="font-medium">公開、可匿名</strong>嘅聊天室。你喺此發佈嘅所有言論、回覆同表情內容，均由你本人全權負責。
            </li>
            <li>
              <strong className="font-medium">嚴禁</strong>發佈違法、誹謗、色情、仇恨、侵權、欺詐、騷擾或其他不當內容。違規內容唔代表本平台立場。
            </li>
            <li>
              本平台可隨時<strong className="font-medium">刪除內容、限制或封鎖使用者</strong>，無需事先通知，亦唔保證服務不中斷或內容永久保存。
            </li>
            <li>
              所有訊息均為用戶自行產生；本平台<strong className="font-medium">唔對用戶內容負責</strong>，亦唔承擔因此引起嘅任何損失或法律責任。繼續使用即表示你同意以上條款。
            </li>
          </ul>
        )}
      </footer>

      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={loginAdmin}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-xl border border-zinc-200 dark:border-zinc-700"
          >
            <h2 className="text-base font-semibold mb-1">管理員登入</h2>
            <p className="text-xs text-zinc-500 mb-3">登入後可以刪除違規訊息。一般用戶唔使登入。</p>
            <input
              type="password"
              autoFocus
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="管理員密碼"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400/50 mb-2"
            />
            {adminError && (
              <p className="text-xs text-red-600 mb-2">{adminError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAdminLogin(false)
                  setAdminPassword('')
                  setAdminError('')
                }}
                className="text-sm px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={adminBusy || !adminPassword}
                className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {adminBusy ? '登入中…' : '登入'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
