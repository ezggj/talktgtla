/** Local "remind me before this meetup" — survives refresh, fires while the app is open. */

const KEY = 'talktgtla-meetup-remind-v1'

export type MeetupReminder = {
  id: string
  slotAt: string
  label: string
}

const LEAD_MS = 15 * 60 * 1000

export function reminderFireAt(slotAt: string) {
  const slot = new Date(slotAt).getTime()
  if (!Number.isFinite(slot)) return null
  return slot - LEAD_MS
}

export function loadMeetupReminders(): MeetupReminder[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MeetupReminder[]
    return Array.isArray(parsed) ? parsed.filter((r) => r && r.id && r.slotAt) : []
  } catch {
    return []
  }
}

function write(list: MeetupReminder[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40)))
  } catch {
    /* ignore */
  }
}

export function upsertMeetupReminder(reminder: MeetupReminder) {
  const list = loadMeetupReminders().filter((r) => r.id !== reminder.id)
  list.push(reminder)
  write(list)
}

export function removeMeetupReminder(id: string) {
  write(loadMeetupReminders().filter((r) => r.id !== id))
}
