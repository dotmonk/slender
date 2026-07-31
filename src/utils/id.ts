/** Generates a short random ID — not cryptographic, fine for local entity keys. */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
