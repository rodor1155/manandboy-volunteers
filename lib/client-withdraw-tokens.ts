const STORAGE_KEY = 'mb_withdraw_tokens'

export function getWithdrawToken(signupId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, string>
    return map[signupId] ?? null
  } catch {
    return null
  }
}

export function setWithdrawToken(signupId: string, token: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    map[signupId] = token
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore quota / private mode
  }
}

export function clearWithdrawToken(signupId: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string, string>
    delete map[signupId]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}
