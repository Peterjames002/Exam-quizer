/**
 * Cursor debug ingest — localhost only; skip in production builds.
 * Off unless NEXT_PUBLIC_AGENT_DEBUG_INGEST=1: requests to a dead port stall ~2s each on Windows.
 */
const URL =
  'http://127.0.0.1:7731/ingest/9d3ff6af-b06f-4c75-9603-c2a423cad0ff' as const
const SESSION_ID = '213eda' as const

export function agentDebugIngest(init: RequestInit): void {
  if (process.env.NODE_ENV !== 'development') return
  if (process.env.NEXT_PUBLIC_AGENT_DEBUG_INGEST !== '1') return
  if (typeof window === 'undefined') return
  void fetch(URL, init).catch(() => {})
}

export function agentDebugIngestJson(body: Record<string, unknown>): void {
  agentDebugIngest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      timestamp: Date.now(),
      ...body,
    }),
  })
}
