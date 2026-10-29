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
  const [nowMs, setNowMs] = useState(() => Date.now())
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
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
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

  const previewText = (text: string) =>
    text.length > 60 ? `${text.slice(0, 60)}…` : text

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white dark:bg-zinc-900">
      <header className="p-4 border-b bg-zinc-100/90 dark:bg-zinc-800/90 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-center tracking-tight">Talk tgt la</h1>
        <p className="text-sm text-center text-zinc-500">香港人一齊傾偈</p>
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
                    {formatRelativeTime(msg.created_at, nowMs)}
                  </span>
                  <button
                    type="button"
                    onClick={() => startReply(msg)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline active:opacity-70 transition-opacity"
                  >
                    回覆
                  </button>
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
        className="p-4 border-t bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm"
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

      <footer className="px-4 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 text-center">
          免責聲明：呢個係公開聊天室。用戶須為自己言論負責，唔好發佈違法、誹謗、侵權或其他不當內容。網站營運者唔對用戶訊息負責，亦可能刪除違規內容。
        </p>
      </footer>
    </div>
  )
}
