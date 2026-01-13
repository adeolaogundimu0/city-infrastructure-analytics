export async function getJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed ${res.status}: ${url}`)
  return res.json()
}

export function buildQuery(params) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue
    q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}
