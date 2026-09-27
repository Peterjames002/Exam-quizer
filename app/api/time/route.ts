// Server clock for the exam start countdown, so a student's wrong device
// clock can't make an open link look expired (or the other way round).
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } })
}
