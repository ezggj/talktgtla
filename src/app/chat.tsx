'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

type Message = {
  id: number
  username: string
  content: string
  created_at: string
  reply_to: number | null
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [username, setUsername] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [replyToId, setReplyToId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messagesById = useMemo(() => {
    const map = new Map<number, Message>()
    for (const msg of messages) map.set(msg.id, msg)
    return map
  }, [messages])

  const replyTarget = replyToId != null ? messagesById.get(replyToId) ?? null : null

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100)
      if (data) setMessages(data as Message[])
    }
    loadMessages()

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startReply = (msg: Message) => {
    setReplyToId(msg.id)
    inputRef.current?.focus()
  }

  const cancelReply = () => setReplyToId(null)

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured || !newMessage.trim()) return

    const displayName = isAnonymous ? '匿名' : username.trim() || '匿名'

    await supabase.from('messages').insert([
      {
        username: displayName,
        content: newMessage.trim(),
        reply_to: replyToId,
      },
    ])

    setNewMessage('')
    setReplyToId(null)
  }

  const previewText = (text: string) =>
    text.length > 60 ? `${text.slice(0, 60)}…` : text

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white dark:bg-zinc-900">
      <header className="p-4 border-b bg-zinc-100 dark:bg-zinc-800">
        <h1 className="text-2xl font-bold text-center">Talk tgt la</h1>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const parent = msg.reply_to != null ? messagesById.get(msg.reply_to) : null
          return (
            <div key={msg.id} className="flex flex-col">
              <div className="text-xs text-zinc-500">{msg.username}</div>
              <button
                type="button"
                onClick={() => startReply(msg)}
                className="text-left bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 max-w-[80%] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {parent && (
                  <div className="mb-2 rounded border-l-2 border-blue-400 bg-white/60 dark:bg-black/20 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <div className="font-medium text-zinc-600 dark:text-zinc-300">
                      回覆 {parent.username}
                    </div>
                    <div className="truncate">{previewText(parent.content)}</div>
                  </div>
                )}
                {!parent && msg.reply_to != null && (
                  <div className="mb-2 rounded border-l-2 border-zinc-300 px-2 py-1 text-xs text-zinc-400">
                    回覆一則訊息
                  </div>
                )}
                <div>{msg.content}</div>
              </button>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-zinc-400">
                  {new Date(msg.created_at).toLocaleTimeString('zh-HK')}
                </span>
                <button
                  type="button"
                  onClick={() => startReply(msg)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  回覆
                </button>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t bg-white dark:bg-zinc-900">
        {replyTarget && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 px-3 py-2">
            <div className="flex-1 min-w-0 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="font-medium">回覆 {replyTarget.username}</div>
              <div className="truncate">{previewText(replyTarget.content)}</div>
            </div>
            <button
              type="button"
              onClick={cancelReply}
              className="shrink-0 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              aria-label="取消回覆"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-2 text-sm">
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
              className="flex-1 border rounded px-3 py-1 text-sm"
            />
          )}
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={replyTarget ? '回覆訊息...' : '輸入訊息...'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 border rounded-full px-4 py-2"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700"
          >
            傳送
          </button>
        </div>
      </form>

      <footer className="px-4 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 text-center">
          免責聲明：呢個係公開聊天室。用戶須為自己言論負責，唔好發佈違法、誹謗、侵權或其他不當內容。網站營運者唔對用戶訊息負責，亦可能刪除違規內容。
        </p>
      </footer>
    </div>
  )
}
