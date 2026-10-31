'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
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
import { applyTheme, resolveTheme, readThemePreference, setThemePreference, type ThemeMode } from '@/lib/theme'
import { AppShell } from '@/components/shell/app-shell'
import { NewbieGuide } from '@/components/shell/newbie-guide'
import { DisclaimerShort } from '@/components/legal/site-disclaimer'
import { computeStreak, trainedToday } from '@/lib/fitness/streaks'
import { getDailyTopic, topicStarterLine } from '@/lib/fitness/daily-topic'
import {
  blockUsername,
  loadBlockedUsernames,
  listBlockedUsers,
  unblockUsername,
} from '@/lib/chat/moderation'
import { MessageModActions } from '@/components/chat/message-mod-actions'
import { StarterChipsBar } from '@/components/chat/starter-chips-bar'

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
  const [trainStreak, setTrainStreak] = useState(0)
  useEffect(() => {
    setShowTrainedBadge(trainedToday())
    setTrainStreak(computeStreak())
    setBlockedNames(loadBlockedUsernames())
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
  const [messagesLoaded, setMessagesLoaded] = useState(!isSupabaseConfigured)
  const [justSent, setJustSent] = useState(false)
  const [showBanList, setShowBanList] = useState(false)
  const [bannedIps, setBannedIps] = useState<
    { client_ip: string; reason: string | null; created_at: string; source_message_id: number | null }[]
  >([])
  const [banBusy, setBanBusy] = useState(false)
  const [blockedNames, setBlockedNames] = useState<Set<string>>(() => new Set())
  const [showBlockedUsers, setShowBlockedUsers] = useState(false)
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
    const mode = resolveTheme(readThemePreference())
    setThemeMode(mode)
    applyTheme(mode)
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
      setMessagesLoaded(true)
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
        setSendError(data.error || '送唔出去，再試多次啦')
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
      setJustSent(true)
      window.setTimeout(() => setJustSent(false), 420)
      requestAnimationFrame(() => scrollToLatest('smooth'))
    } catch {
      setNewMessage(draft)
      setReplyToId(reply_to)
      setSendError('網絡唔得，再試多次啦')
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
      banIp
        ? '刪除呢條訊息，同時封鎖對方 IP？\n\n封鎖後呢個 IP 暫時唔可以再發言。假封鎖請小心。'
        : '確定刪除呢條訊息？\n\n刪除後傾偈室其他人唔會再見到。'
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
    if (
      !window.confirm(
        '只封鎖呢條訊息嘅 IP（唔刪訊息）？\n\n封鎖後呢個 IP 暫時唔可以再發言；訊息會留低畀人睇。'
      )
    )
      return
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
    setThemePreference(next)
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
              className="h-8 min-w-8 px-2 rounded-xl text-[11px] text-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
              aria-label={themeMode === 'dark' ? '轉日間模式' : '轉夜間模式'}
              title={themeMode === 'dark' ? '日間' : '夜間'}
            >
              {themeMode === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              onClick={() => setShowBadges(true)}
              className="h-8 px-2.5 rounded-xl text-[11px] text-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
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
            <p
              className="mt-0.5 inline-flex items-center justify-center gap-1.5 text-[11px] text-accent tabular-nums font-medium"
              aria-live="polite"
            >
              <span
                className={
                  onlineCount != null && onlineCount > 0
                    ? 'online-dot online-dot-live'
                    : 'online-dot'
                }
                aria-hidden
              />
              {onlineCount == null
                ? '連線中…'
                : onlineCount <= 0
                  ? '而家靜靜地 · 等人上線'
                  : onlineCount === 1
                    ? '得你一個喺度'
                    : `而家 ${onlineCount} 人喺線`}
            </p>
          </div>
          <div className="absolute right-0 flex items-center gap-2 pr-11">
            {isAdmin ? (
              <>
                <Link
                  href="/admin"
                  className="text-[11px] text-accent font-medium"
                >
                  數據
                </Link>
                <button
                  type="button"
                  onClick={() => void loadBans()}
                  className="text-[11px] text-warning font-medium"
                >
                  IP 封鎖名單
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

      <DailyTopicBanner
        onUseTopic={(line) => {
          setNewMessage((prev) => (prev ? `${prev} ${line}` : line))
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
      />

      {!isSupabaseConfigured && (
        <div className="mx-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          傾偈後台未開好。要喺 Vercel 加
          <code className="mx-1">NEXT_PUBLIC_SUPABASE_URL</code>
          同
          <code className="mx-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          ，再照 README 起 messages 表。
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <div
          ref={listRef}
          onScroll={onListScroll}
          className="chat-messages h-full overflow-y-auto p-4 sm:p-5 space-y-4"
        >
          {!messagesLoaded && (
            <div className="space-y-4 pt-2" aria-busy="true" aria-label="載入訊息中">
              {[0.92, 0.7, 0.84].map((w, i) => (
                <div key={i} className="flex flex-col gap-1.5" style={{ maxWidth: `${w * 100}%` }}>
                  <div className="h-2.5 w-16 rounded-full bg-[#f0efee] skeleton-pulse" />
                  <div className="h-14 rounded-2xl bg-[#f0efee] skeleton-pulse border border-border/50" />
                </div>
              ))}
            </div>
          )}
          {messagesLoaded && messages.length === 0 && (
            <div className="flex h-full min-h-[220px] items-center justify-center px-2">
              <div className="welcome-card w-full max-w-sm rounded-[20px] border border-border/80 bg-surface px-6 py-7 text-center shadow-soft">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent text-lg" aria-hidden>
                  💬
                </div>
                <h3 className="font-serif text-xl tracking-tight">歡迎嚟 Talk tgt la</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  香港人傾偈室。入花名開波；下面亦可記訓練、影餐。
                </p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full bg-accent px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-[#0d6a63] transition touch-manipulation"
                    onClick={() => {
                      const topic = getDailyTopic()
                      setNewMessage(topicStarterLine(topic))
                      requestAnimationFrame(() => inputRef.current?.focus())
                    }}
                  >
                    用今日話題開波
                  </button>
                  <Link
                    href="/train"
                    className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:border-accent hover:bg-accent-soft hover:text-accent transition touch-manipulation"
                  >
                    去訓練
                  </Link>
                  <Link
                    href="/eat"
                    className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:border-accent hover:bg-accent-soft hover:text-accent transition touch-manipulation"
                  >
                    去飲食
                  </Link>
                </div>
                <div className="mt-4 text-left">
                  <StarterChipsBar
                    onPick={(line) => {
                      setNewMessage(line)
                      requestAnimationFrame(() => inputRef.current?.focus())
                    }}
                  />
                </div>
                {(() => {
                  const topic = getDailyTopic()
                  return (
                    <div className="mt-4 rounded-2xl border border-accent/20 bg-accent-soft/40 px-3.5 py-3 text-left">
                      <div className="text-[10px] font-semibold text-accent tracking-wide mb-1">今日話題 · 一掣開波</div>
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none" aria-hidden>{topic.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{topic.title}</div>
                          <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{topic.hint}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex items-center justify-center rounded-xl bg-accent px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#0d6a63] transition touch-manipulation"
                        onClick={() => {
                          const line = topicStarterLine(topic)
                          setNewMessage(line)
                          requestAnimationFrame(() => inputRef.current?.focus())
                        }}
                      >
                        用呢個話題開波
                      </button>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
          {messagesLoaded &&
            messages.length > 0 &&
            messages.every((msg) => blockedNames.has(msg.username.trim().toLowerCase())) && (
            <div className="flex h-full min-h-[180px] items-center justify-center px-2">
              <div className="w-full max-w-sm rounded-[20px] border border-dashed border-border bg-surface px-5 py-7 text-center shadow-soft">
                <div className="mx-auto mb-2 text-2xl" aria-hidden>🙈</div>
                <h3 className="font-serif text-lg tracking-tight">訊息被你封鎖晒</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  呢度有人講過嘢，但花名喺你本機封鎖清單。解除之後就見返。
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center rounded-full bg-accent px-3.5 py-2 text-[11px] font-semibold text-white touch-manipulation"
                  onClick={() => setShowBlockedUsers(true)}
                >
                  睇封鎖清單
                </button>
              </div>
            </div>
          )}
          {messages
            .filter((msg) => !blockedNames.has(msg.username.trim().toLowerCase()))
            .map((msg) => {
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
                    <div className="mb-2 rounded-xl border-l-2 border-accent bg-surface-muted px-2.5 py-1.5 text-xs text-muted">
                      <div className="font-medium text-foreground/80">
                        回覆 {parent.username}
                      </div>
                      <div className="truncate">{previewText(parent.content)}</div>
                    </div>
                  )}
                  {!parent && msg.reply_to != null && (
                    <div className="mb-2 rounded-xl border-l-2 border-border px-2.5 py-1.5 text-xs text-muted">
                      回覆緊上一句
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
                  {!msg.is_admin && (
                    <MessageModActions
                      messageId={msg.id}
                      username={msg.username}
                      content={msg.content}
                      onBlocked={(name) => {
                        setBlockedNames(blockUsername(name))
                      }}
                    />
                  )}
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => void deleteMessage(msg.id, false)}
                        className="text-xs text-danger hover:underline"
                        title="只刪除訊息"
                      >
                        刪除訊息
                      </button>
                      <button
                        type="button"
                        disabled={banBusy}
                        onClick={() => void deleteMessage(msg.id, true)}
                        className="text-xs text-danger hover:underline disabled:opacity-40"
                        title="刪除訊息並封鎖 IP"
                      >
                        刪除並封鎖 IP
                      </button>
                      <button
                        type="button"
                        disabled={banBusy}
                        onClick={() => void banMessageIp(msg.id)}
                        className="text-xs text-warning hover:underline disabled:opacity-40"
                        title="只封鎖 IP，保留訊息"
                      >
                        只封鎖 IP
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
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground/92 text-background text-xs px-3.5 py-1.5 shadow-hover backdrop-blur-md active:scale-95 transition-transform jump-in"
          >
            最新 ↓
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
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent text-[11px] font-semibold px-3 py-1 border border-border">
              💪 今日練咗
            </span>
            {trainStreak > 1 && (
              <span className="inline-flex items-center rounded-full bg-[#f0efee] text-muted text-[11px] font-medium px-2.5 py-1 border border-border">
                連續 {trainStreak} 日
              </span>
            )}
            <span className="text-[10px] text-muted">發言可以帶「今日爆機」感覺～</span>
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
              placeholder="花名"
              value={username}
              maxLength={MAX_USERNAME_LENGTH}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent/25 bg-surface transition"
            />
          )}
        </div>

        <StarterChipsBar
          onPick={(line) => {
            setNewMessage((prev) => (prev ? `${prev} ${line}` : line))
            requestAnimationFrame(() => inputRef.current?.focus())
          }}
        />

        {showSlang && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HK_SLANG.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => insertSlang(phrase)}
                className="shrink-0 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs text-foreground hover:bg-accent-soft active:scale-95 transition-all"
              >
                {phrase}
              </button>
            ))}
          </div>
        )}

        {showEmoji && (
          <div className="emoji-picker mb-2 max-h-36 overflow-y-auto overscroll-contain flex flex-wrap gap-1 rounded-2xl border border-border bg-surface-muted p-2">
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
            className={`shrink-0 bg-accent text-white px-4 py-2 rounded-full hover:bg-[#0d6a63] active:scale-95 transition-all disabled:opacity-50 h-10 text-sm shadow-soft ${
              justSent ? 'send-pop' : ''
            }`}
          >
            {sending ? '…' : justSent ? '✓' : '送'}
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

      <footer className="px-3 py-1.5 border-t border-border bg-surface-muted/95 shrink-0">
        <DisclaimerShort expanded={showTerms} onToggle={() => setShowTerms((v) => !v)} />
      </footer>

      <NewbieGuide open={showWelcome} onClose={closeWelcome} />

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


            {showBlockedUsers && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3">
          <div className="w-full max-w-sm rounded-[20px] border border-border bg-surface p-4 shadow-hover max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">你封鎖咗嘅花名</h2>
              <button type="button" onClick={() => setShowBlockedUsers(false)} className="text-sm px-2 text-muted" aria-label="關閉">✕</button>
            </div>
            <p className="text-[11px] text-muted mb-3 leading-relaxed">
              只影響你部機——封鎖後唔會見到佢哋訊息。解除隨時得。
            </p>
            {listBlockedUsers().length === 0 ? (
              <p className="text-sm text-muted">而家未有封鎖任何人</p>
            ) : (
              <ul className="space-y-2">
                {listBlockedUsers().map((b) => (
                  <li key={b.username} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                    <span className="text-sm font-medium truncate">{b.username}</span>
                    <button
                      type="button"
                      className="text-xs text-accent font-medium shrink-0"
                      onClick={() => setBlockedNames(unblockUsername(b.username))}
                    >
                      解除封鎖
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
                className="text-sm px-3 py-1.5 rounded-xl text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
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


function DailyTopicBanner({ onUseTopic }: { onUseTopic: (line: string) => void }) {
  const [topic, setTopic] = useState<ReturnType<typeof getDailyTopic> | null>(null)
  useEffect(() => {
    setTopic(getDailyTopic())
  }, [])
  if (!topic) {
    return (
      <div className="mx-3 mt-2 h-[58px] rounded-2xl border border-border/60 bg-surface/80 skeleton-pulse" aria-hidden />
    )
  }
  return (
    <div className="mx-3 mt-2 mb-0 rounded-2xl border border-border/80 bg-surface/95 px-3.5 py-2.5 shadow-soft flex items-center gap-3">
      <div className="text-lg shrink-0" aria-hidden>
        {topic.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold text-accent tracking-wide">今日話題</div>
        <div className="text-sm font-medium truncate">{topic.title}</div>
        <div className="text-[11px] text-muted truncate">{topic.hint}</div>
      </div>
      <button
        type="button"
        onClick={() => onUseTopic(topicStarterLine(topic))}
        className="shrink-0 rounded-xl bg-accent-soft px-2.5 py-1.5 text-[11px] font-semibold text-accent hover:bg-[#b7f0e6] transition touch-manipulation"
      >
        用呢句
      </button>
    </div>
  )
}
