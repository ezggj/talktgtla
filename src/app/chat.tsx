'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  ACHIEVEMENTS,
  achievementById,
  dismissWelcome,
  evaluateAchievements,
  isWelcomeDismissed,
  loadStats,
  loadUnlocked,
  saveStats,
  saveUnlocked,
  type AchievementId,
  type Stats,
} from '@/lib/client-progress'
import {
  MAX_CONTENT_LENGTH,
  MAX_USERNAME_LENGTH,
  sanitizeContent,
  sanitizeUsername,
} from '@/lib/sanitize'
import { applyTheme, resolveInitialTheme, type ThemeMode } from '@/lib/theme'
import { AppShell } from '@/components/shell/app-shell'
import { trainedToday } from '@/lib/fitness/streaks'

type Message = {
  id: number
  username: string
  content: string
  created_at: string
  reply_to: number | null
  is_admin?: boolean
}

const EMOJIS = [
  // smileys
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '😉', '😍', '🥰', '😘', '😗', '😜', '🤪', '😎', '🤩',
  '🥳', '😏', '😒', '🙄', '😬', '😮', '😯', '😲', '😳', '🥺',
  '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '🤔', '🤭', '🤫',
  '😴', '🤤', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴',
  // gestures / people
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌',
  '👐', '🤝', '🙏', '💪', '🫶', '❤️', '🧡', '💛', '💚', '💙',
  '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗',
  // celebration / objects
  '🔥', '✨', '⭐', '🌟', '💥', '🎉', '🎊', '🎈', '🎁', '🏆',
  '🥇', '🎯', '💡', '📌', '✅', '❌', '❓', '❗', '💯', '🚀',
  // animals / nature
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦄', '🐝',
  '🌸', '🌺', '🌻', '🌈', '☀️', '🌙', '☁️', '⚡', '🌊', '🍀',
] as const

/** Quick-insert chips — light HK net slang, keep SFW */
const HK_SLANG = [
  '師兄',
  '大癲',
  '笑死',
  '真係',
  '勁呀',
  '好呀',
  '冇問題',
  '哈哈哈',
  '不如',
  '傾下偈',
  '見到',
  '明白',
  '沖涼先',
  '晚安',
  '早晨',
] as const

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
  const [showTrainedBadge, setShowTrainedBadge] = useState(false)
  useEffect(() => {
    setShowTrainedBadge(trainedToday())
  }, [])
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
  const [onlineCount, setOnlineCount] = useState<number | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [unlocked, setUnlocked] = useState<Set<AchievementId>>(new Set())
  const [stats, setStats] = useState<Stats | null>(null)
  const [achievementToast, setAchievementToast] = useState<AchievementId | null>(null)
  const [showBadges, setShowBadges] = useState(false)
  const [showSlang, setShowSlang] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')
  const [sendError, setSendError] = useState('')
  const [showBanList, setShowBanList] = useState(false)
  const [bannedIps, setBannedIps] = useState<
    { client_ip: string; reason: string | null; created_at: string; source_message_id: number | null }[]
  >([])
  const [banBusy, setBanBusy] = useState(false)
  const clientFpRef = useRef<string>('')
  const toastTimerRef = useRef<number | null>(null)
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
    const mode = resolveInitialTheme()
    // Premium redesign: prefer calm light; keep stored preference
    setThemeMode(mode)
    applyTheme(mode === 'dark' ? 'dark' : 'light')
    setShowWelcome(!isWelcomeDismissed())
    setUnlocked(loadUnlocked())
    setStats(loadStats())
    const FP_KEY = 'talktgtla-fp'
    let fp = localStorage.getItem(FP_KEY)
    if (!fp) {
      fp =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `fp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(FP_KEY, fp)
    }
    clientFpRef.current = fp
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showAchievementToast = useCallback((id: AchievementId) => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    setAchievementToast(id)
    toastTimerRef.current = window.setTimeout(() => {
      setAchievementToast(null)
      toastTimerRef.current = null
    }, 2200)
  }, [])

  const applyStats = useCallback(
    (updater: (prev: Stats) => Stats) => {
      setStats((prev) => {
        const base = prev ?? loadStats()
        const next = updater(base)
        saveStats(next)
        const already = loadUnlocked()
        const newly = evaluateAchievements(next, already)
        if (newly.length) {
          const merged = new Set(already)
          for (const id of newly) merged.add(id)
          saveUnlocked(merged)
          setUnlocked(merged)
          showAchievementToast(newly[0])
          // queue remaining toasts briefly
          newly.slice(1).forEach((id, i) => {
            window.setTimeout(() => showAchievementToast(id), (i + 1) * 2400)
          })
        }
        return next
      })
    },
    [showAchievementToast]
  )

  const closeWelcome = () => {
    dismissWelcome()
    setShowWelcome(false)
  }

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => setIsAdmin(Boolean(d?.admin)))
      .catch(() => setIsAdmin(false))

    // Discreet admin entry: /?admin=1 or /#admin (no visible 管理 button)
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('admin') === '1' || window.location.hash === '#admin') {
        setShowAdminLogin(true)
        setAdminError('')
        // Clean URL so casual users don't see the flag after refresh
        const url = new URL(window.location.href)
        url.searchParams.delete('admin')
        url.hash = ''
        window.history.replaceState({}, '', url.pathname + url.search)
      }
    } catch {
      /* ignore */
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault()
        setShowAdminLogin(true)
        setAdminError('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Heartbeat so server cron knows real humans are online (bots dial down)
  useEffect(() => {
    const key = clientFpRef.current
    if (!key) return
    const beat = () => {
      void fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKey: clientFpRef.current || key }),
      })
    }
    beat()
    const id = window.setInterval(beat, 45_000)
    return () => window.clearInterval(id)
  }, [])

  // Hobby plan: client nudges ambient bots when room is quiet
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const tick = () => {
      const humans = onlineCount
      if (humans != null && humans >= 2) return
      void fetch('/api/ambient/tick', { method: 'POST' })
    }
    const id = window.setInterval(tick, 55_000)
    // first nudge after a short delay so presence can register
    const first = window.setTimeout(tick, 8_000)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(first)
    }
  }, [onlineCount])

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

    // One presence key per browser tab (= one online person while the tab is open)
    const PRESENCE_KEY = 'talktgtla-presence-id'
    let presenceKey = sessionStorage.getItem(PRESENCE_KEY)
    if (!presenceKey) {
      presenceKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem(PRESENCE_KEY, presenceKey)
    }

    const updateOnlineCount = (channel: ReturnType<typeof supabase.channel>) => {
      const state = channel.presenceState()
      setOnlineCount(Object.keys(state).length)
    }

    const channel = supabase
      .channel('public:messages', {
        config: {
          presence: { key: presenceKey },
        },
      })
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
      .on('presence', { event: 'sync' }, () => {
        updateOnlineCount(channel)
      })
      .on('presence', { event: 'join' }, () => {
        updateOnlineCount(channel)
      })
      .on('presence', { event: 'leave' }, () => {
        updateOnlineCount(channel)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      void channel.untrack()
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

  const insertText = (chunk: string) => {
    const el = inputRef.current
    if (!el) {
      setNewMessage((prev) => prev + chunk)
      return
    }
    const start = el.selectionStart ?? newMessage.length
    const end = el.selectionEnd ?? newMessage.length
    const next = newMessage.slice(0, start) + chunk + newMessage.slice(end)
    setNewMessage(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + chunk.length
      el.setSelectionRange(pos, pos)
      resizeComposer()
    })
  }

  const insertEmoji = (emoji: string) => {
    insertText(emoji)
    applyStats((s) => ({ ...s, emojiUsed: s.emojiUsed + 1 }))
  }

  const insertSlang = (phrase: string) => {
    insertText(phrase)
    applyStats((s) => ({ ...s, slangUsed: s.slangUsed + 1 }))
  }

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!isSupabaseConfigured || !newMessage.trim() || sending) return

    setSendError('')
    const draft = newMessage
    const reply_to = replyToId

    if (!isAnonymous) {
      const u = sanitizeUsername(username)
      if (!u.ok) {
        setSendError(u.error)
        return
      }
    }
    const c = sanitizeContent(draft)
    if (!c.ok) {
      setSendError(c.error)
      return
    }

    setSending(true)
    setNewMessage('')
    setReplyToId(null)
    setShowEmoji(false)
    setShowSlang(false)
    stickToBottomRef.current = true
    setShowJump(false)

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-fingerprint': clientFpRef.current || '',
        },
        body: JSON.stringify({
          anonymous: isAnonymous,
          username: isAnonymous ? undefined : username,
          content: draft,
          reply_to,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: Message
      }
      if (!res.ok) {
        setNewMessage(draft)
        setReplyToId(reply_to)
        setSendError(data.error || '傳送失敗，請再試一次')
        return
      }
      // Don't wait on Realtime — append returned row immediately (dedupe by id)
      if (data.message && typeof data.message.id === 'number') {
        const row = data.message
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev
          return [...prev, row]
        })
      }
      applyStats((s) => ({
        ...s,
        messagesSent: s.messagesSent + 1,
        repliesSent: s.repliesSent + (reply_to != null ? 1 : 0),
      }))
      requestAnimationFrame(() => scrollToLatest('smooth'))
    } catch {
      setNewMessage(draft)
      setReplyToId(reply_to)
      setSendError('網絡錯誤，請再試一次')
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

  const deleteMessage = async (id: number, banIp = false) => {
    if (!isAdmin) return
    const ok = window.confirm(
      banIp ? '刪除訊息並封鎖呢個 IP？' : '確定刪除呢條訊息？'
    )
    if (!ok) return
    const res = await fetch('/api/admin/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, banIp }),
    })
    if (!res.ok) {
      window.alert(banIp ? '刪除／封鎖失敗' : '刪除失敗')
      return
    }
    const data = (await res.json().catch(() => ({}))) as { bannedIp?: string | null }
    setMessages((prev) => prev.filter((m) => m.id !== id))
    if (replyToId === id) setReplyToId(null)
    if (banIp && data.bannedIp) {
      window.alert(`已封鎖 IP：${data.bannedIp}`)
    } else if (banIp && !data.bannedIp) {
      window.alert('已刪除；呢條舊訊息冇 IP 記錄，未有封鎖')
    }
  }

  const banMessageIp = async (id: number) => {
    if (!isAdmin) return
    if (!window.confirm('封鎖呢條訊息嘅 IP？（唔刪訊息）')) return
    setBanBusy(true)
    try {
      const res = await fetch('/api/admin/bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: id, reason: '管理員封鎖' }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; ip?: string }
      if (!res.ok) {
        window.alert(data.error || '封鎖失敗')
        return
      }
      window.alert(`已封鎖 IP：${data.ip || ''}`)
    } finally {
      setBanBusy(false)
    }
  }

  const loadBans = async () => {
    const res = await fetch('/api/admin/bans')
    if (!res.ok) {
      window.alert('讀取封鎖名單失敗')
      return
    }
    const data = (await res.json()) as { bans?: typeof bannedIps }
    setBannedIps(data.bans || [])
    setShowBanList(true)
  }

  const unbanIp = async (ip: string) => {
    if (!window.confirm(`解除封鎖 ${ip}？`)) return
    setBanBusy(true)
    try {
      const res = await fetch('/api/admin/bans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      })
      if (!res.ok) {
        window.alert('解除失敗')
        return
      }
      setBannedIps((prev) => prev.filter((b) => b.client_ip !== ip))
    } finally {
      setBanBusy(false)
    }
  }

  const previewText = (text: string) =>
    text.length > 60 ? `${text.slice(0, 60)}…` : text

  const toggleTheme = () => {
    const next: ThemeMode = themeMode === 'dark' ? 'light' : 'dark'
    setThemeMode(next)
    applyTheme(next)
  }

  return (
    <AppShell flush>
    <div className="flex flex-col h-[calc(100dvh-var(--nav-h)-var(--safe-bottom))] md:h-dvh max-w-2xl mx-auto bg-background overflow-hidden">
      <header className="px-4 py-3.5 border-b border-border bg-surface/90 backdrop-blur-md shrink-0 z-10">
        <div className="relative flex items-center justify-center gap-2">
          <div className="absolute left-0 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="text-[11px] text-muted hover:text-foreground transition-colors"
              aria-label={themeMode === 'dark' ? '轉日間模式' : '轉夜間模式'}
              title={themeMode === 'dark' ? '日間' : '夜間'}
            >
              {themeMode === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              onClick={() => setShowBadges(true)}
              className="text-[11px] text-muted hover:text-foreground transition-colors"
              aria-label="徽章"
            >
              徽章{unlocked.size > 0 ? ` ${unlocked.size}` : ''}
            </button>
          </div>
          <div className="text-center">
            <h1
              className="font-serif text-xl tracking-tight leading-tight select-none text-foreground"
              onPointerDown={(e) => {
                // Long-press title (~1.2s) opens discreet admin login
                const target = e.currentTarget
                const timer = window.setTimeout(() => {
                  setShowAdminLogin(true)
                  setAdminError('')
                }, 1200)
                const clear = () => {
                  window.clearTimeout(timer)
                  target.removeEventListener('pointerup', clear)
                  target.removeEventListener('pointerleave', clear)
                  target.removeEventListener('pointercancel', clear)
                }
                target.addEventListener('pointerup', clear)
                target.addEventListener('pointerleave', clear)
                target.addEventListener('pointercancel', clear)
              }}
            >
              Talk tgt la
            </h1>
            <p className="text-[11px] text-accent tabular-nums font-medium" aria-live="polite">
              {onlineCount == null
                ? '…'
                : onlineCount <= 0
                  ? '0 人在線'
                  : `${onlineCount} 人在線`}
            </p>
          </div>
          <div className="absolute right-0 flex items-center gap-2">
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => void loadBans()}
                  className="text-[11px] text-warning font-medium"
                >
                  封鎖
                </button>
                <button
                  type="button"
                  onClick={() => void logoutAdmin()}
                  className="text-[11px] text-muted underline underline-offset-2"
                >
                  登出
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <div className="mx-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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
          className="chat-messages h-full overflow-y-auto p-4 sm:p-5 space-y-3.5"
        >
          {messages.map((msg) => {
            const parent = msg.reply_to != null ? messagesById.get(msg.reply_to) : null
            const isReplying = replyToId === msg.id
            return (
              <div key={msg.id} className="chat-msg flex flex-col">
                <div className="text-xs mb-0.5 flex items-center gap-1.5">
                <span
                  className={
                    msg.is_admin
                      ? 'font-semibold text-warning'
                      : msg.username.includes('🤖')
                        ? 'text-muted/80'
                        : 'text-muted'
                  }
                >
                  {msg.username}
                </span>
                {msg.is_admin && (
                  <span className="rounded-full px-1.5 py-px text-[9px] font-medium bg-amber-50 text-warning border border-amber-200">
                    管理
                  </span>
                )}
              </div>
                <button
                  type="button"
                  onClick={() => startReply(msg)}
                  className={`text-left rounded-2xl p-3 max-w-[85%] transition-all duration-150 ease-out active:scale-[0.98] ${
                    isReplying
                      ? 'bg-accent-soft ring-2 ring-accent/35'
                      : msg.is_admin
                        ? 'bg-amber-50/80 border border-amber-200/80'
                        : 'bg-surface border border-border shadow-soft hover:shadow-hover'
                  }`}
                >
                  {parent && (
                    <div className="mb-2 rounded-xl border-l-2 border-accent bg-[#fafaf9] px-2.5 py-1.5 text-xs text-muted">
                      <div className="font-medium text-foreground/80">
                        回覆 {parent.username}
                      </div>
                      <div className="truncate">{previewText(parent.content)}</div>
                    </div>
                  )}
                  {!parent && msg.reply_to != null && (
                    <div className="mb-2 rounded-xl border-l-2 border-border px-2.5 py-1.5 text-xs text-muted">
                      回覆一則訊息
                    </div>
                  )}
                  <div className="leading-relaxed break-words whitespace-pre-wrap">{msg.content}</div>
                </button>
                <div className="flex items-center gap-2 mt-1 pl-0.5">
                  <span
                    className="text-xs text-muted"
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
                    className="text-xs text-accent hover:underline active:opacity-70 transition-opacity font-medium"
                  >
                    回覆
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => void deleteMessage(msg.id, false)}
                        className="text-xs text-danger hover:underline"
                      >
                        刪
                      </button>
                      <button
                        type="button"
                        disabled={banBusy}
                        onClick={() => void deleteMessage(msg.id, true)}
                        className="text-xs text-danger hover:underline disabled:opacity-40"
                      >
                        刪+封
                      </button>
                      <button
                        type="button"
                        disabled={banBusy}
                        onClick={() => void banMessageIp(msg.id)}
                        className="text-xs text-warning hover:underline disabled:opacity-40"
                      >
                        封 IP
                      </button>
                    </>
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
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground text-background text-xs px-3.5 py-1.5 shadow-hover backdrop-blur-sm active:scale-95 transition-transform"
          >
            最新訊息 ↓
          </button>
        )}
      </div>

      <form
        onSubmit={sendMessage}
        className="p-3 sm:p-4 border-t border-border bg-surface/95 backdrop-blur-md shrink-0"
      >
        {replyTarget && (
          <div className="chat-reply-bar mb-2 flex items-start gap-2 rounded-2xl border border-accent/25 bg-accent-soft/60 px-3 py-2">
            <div className="flex-1 min-w-0 text-xs text-foreground/80">
              <div className="font-medium">回覆 {replyTarget.username}</div>
              <div className="truncate">{previewText(replyTarget.content)}</div>
            </div>
            <button
              type="button"
              onClick={cancelReply}
              className="shrink-0 text-xs text-muted hover:text-foreground active:opacity-70 transition-colors"
              aria-label="取消回覆"
            >
              ✕
            </button>
          </div>
        )}
        {showTrainedBadge && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent text-[11px] font-semibold px-3 py-1 border border-border">
              💪 今日練咗
            </span>
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
              placeholder="暱稱"
              value={username}
              maxLength={MAX_USERNAME_LENGTH}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent/25 bg-surface transition"
            />
          )}
        </div>

        {showSlang && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HK_SLANG.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => insertSlang(phrase)}
                className="shrink-0 rounded-full border border-border bg-[#fafaf9] px-2.5 py-1 text-xs text-foreground hover:bg-accent-soft active:scale-95 transition-all"
              >
                {phrase}
              </button>
            ))}
          </div>
        )}

        {showEmoji && (
          <div className="emoji-picker mb-2 max-h-36 overflow-y-auto overscroll-contain flex flex-wrap gap-1 rounded-2xl border border-border bg-[#fafaf9] p-2">
            {EMOJIS.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="h-9 w-9 rounded-xl text-xl leading-none hover:bg-accent-soft active:scale-90 transition-transform"
                aria-label={`插入 ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setShowSlang((v) => !v)
              if (!showSlang) setShowEmoji(false)
            }}
            className={`shrink-0 h-10 px-2.5 rounded-full border text-xs transition-all active:scale-95 ${
              showSlang
                ? 'bg-accent-soft border-accent/40'
                : 'border-border'
            }`}
            aria-label="潮語"
            aria-expanded={showSlang}
          >
            潮語
          </button>
          <button
            type="button"
            onClick={() => {
              setShowEmoji((v) => !v)
              if (!showEmoji) setShowSlang(false)
            }}
            className={`shrink-0 h-10 w-10 rounded-full border text-lg flex items-center justify-center transition-all active:scale-95 ${
              showEmoji
                ? 'bg-accent-soft border-accent/40'
                : 'border-border'
            }`}
            aria-label="表情"
            aria-expanded={showEmoji}
          >
            😊
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            maxLength={MAX_CONTENT_LENGTH}
            placeholder={replyTarget ? '回覆…' : '講啲咩…'}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              if (sendError) setSendError('')
            }}
            onKeyDown={onComposerKeyDown}
            disabled={sending}
            enterKeyHint="send"
            className="flex-1 border border-border rounded-2xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent/25 bg-surface shadow-soft transition disabled:opacity-60 resize-none max-h-[120px] leading-relaxed"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="shrink-0 bg-accent text-white px-4 py-2 rounded-full hover:bg-[#0d6a63] active:scale-95 transition-all disabled:opacity-50 h-10 text-sm shadow-soft"
          >
            {sending ? '…' : '送'}
          </button>
        </div>
        {sendError && (
          <p
            role="alert"
            className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger text-center"
          >
            {sendError}
          </p>
        )}
      </form>

      <footer className="px-3 py-1.5 border-t border-border bg-[#fafaf9]/95 shrink-0">
        <button
          type="button"
          onClick={() => setShowTerms((v) => !v)}
          className="w-full text-center text-[11px] text-muted hover:text-foreground transition-colors transition-colors"
          aria-expanded={showTerms}
        >
          免責聲明{showTerms ? ' · 收起' : ' · 詳情'}
        </button>
        {showTerms && (
          <ul className="mt-2 list-disc pl-4 space-y-1 text-[11px] leading-relaxed text-muted marker:text-muted">
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

      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-labelledby="welcome-title"
            className="welcome-card w-full max-w-sm rounded-[20px] bg-surface p-6 shadow-hover border border-border"
          >
            <h2 id="welcome-title" className="font-serif text-2xl tracking-tight mb-2">
              Talk tgt la
            </h2>
            <p className="text-sm text-muted mb-5 leading-relaxed">
              香港人一齊傾偈。Enter 傳送；訓練同飲食喺下面導航。自己負責言論。
            </p>
            <button
              type="button"
              onClick={closeWelcome}
              className="w-full rounded-full bg-accent text-white py-2.5 text-sm font-medium hover:bg-[#0d6a63] active:scale-[0.98] transition-all shadow-soft"
            >
              開始傾偈
            </button>
          </div>
        </div>
      )}

      {achievementToast && (() => {
        const a = achievementById(achievementToast)
        if (!a) return null
        return (
          <div
            className="achievement-toast fixed top-16 left-1/2 z-[60] -translate-x-1/2 max-w-[90vw] rounded-2xl bg-foreground text-background px-4 py-3 shadow-hover"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>{a.emoji}</span>
              <div className="font-medium text-sm">{a.title}</div>
            </div>
          </div>
        )
      })()}

      {showBadges && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-labelledby="badges-title"
            className="w-full max-w-sm rounded-[20px] bg-surface p-5 shadow-hover border border-border max-h-[80dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 id="badges-title" className="text-base font-semibold">
                我的徽章
              </h2>
              <button
                type="button"
                onClick={() => setShowBadges(false)}
                className="text-muted hover:text-foreground text-sm px-2"
                aria-label="關閉"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted mb-3">
              只喺本機{stats ? ` · 已送 ${stats.messagesSent}` : ''}
            </p>
            <ul className="space-y-2">
              {ACHIEVEMENTS.map((a) => {
                const got = unlocked.has(a.id)
                return (
                  <li
                    key={a.id}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                      got
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-border opacity-55'
                    }`}
                  >
                    <span className="text-xl leading-none mt-0.5" aria-hidden>
                      {got ? a.emoji : '🔒'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-muted">{a.description}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}


      {showBanList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[20px] bg-surface p-5 shadow-hover border border-border max-h-[80dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">封鎖名單</h2>
              <button type="button" onClick={() => setShowBanList(false)} className="text-sm px-2 text-muted" aria-label="關閉">✕</button>
            </div>
            {bannedIps.length === 0 ? (
              <p className="text-sm text-muted">而家冇封鎖任何 IP</p>
            ) : (
              <ul className="space-y-2">
                {bannedIps.map((b) => (
                  <li key={b.client_ip} className="flex items-center justify-between gap-2 rounded-2xl border border-border px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-mono truncate">{b.client_ip}</div>
                      {b.reason && <div className="text-[10px] text-muted truncate">{b.reason}</div>}
                    </div>
                    <button
                      type="button"
                      disabled={banBusy}
                      onClick={() => void unbanIp(b.client_ip)}
                      className="shrink-0 text-xs text-accent disabled:opacity-40"
                    >
                      解除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={loginAdmin}
            className="w-full max-w-sm rounded-[20px] bg-surface p-5 shadow-hover border border-border"
          >
            <h2 className="text-base font-semibold mb-3">管理員</h2>
            <input
              type="password"
              autoFocus
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="管理員密碼"
              className="w-full border border-border rounded-2xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/25 mb-2 bg-surface"
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
                className="text-sm px-3 py-1.5 rounded-xl text-muted hover:bg-black/[0.04]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={adminBusy || !adminPassword}
                className="text-sm px-3 py-1.5 rounded-xl bg-accent text-white hover:bg-[#0d6a63] disabled:opacity-50"
              >
                {adminBusy ? '登入中…' : '登入'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>

    </AppShell>
  )
}
