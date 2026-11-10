export function pickAllowedFields<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
  allowed: readonly (keyof T)[]
): Partial<T> {
  const out: Partial<T> = {}
  for (const key of allowed) {
    const k = key as string
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      out[key] = body[k] as T[keyof T]
    }
  }
  return out
}
