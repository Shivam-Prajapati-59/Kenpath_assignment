import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { SLOTS, formatDate, type Reading } from '@/lib/readings'

export type ReportType = 'daily' | 'mtd' | 'monthly'

interface Report {
  type: ReportType
  from: string
  to: string
  count: number
  highest: number | null
  lowest: number | null
  average: number | null
  readings: Reading[]
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}

/** Average per day, for the month line chart. */
function dailyAverages(readings: Reading[]) {
  const byDay = new Map<string, number[]>()
  readings.forEach((r) => byDay.set(r.date, [...(byDay.get(r.date) || []), r.value]))
  return [...byDay].map(([date, values]) => ({
    day: Number(date.slice(8)),
    avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
  }))
}

export function ReportView({ type, date, version }: { type: ReportType; date: string; version: number }) {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api<Report>(`/reports/${type}?date=${date}`)
      .then((r) => active && (setReport(r), setError('')))
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [type, date, version])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!report) return <p className="text-sm text-muted-foreground">Loading…</p>

  const range = report.from === report.to ? formatDate(report.from) : `${formatDate(report.from)} – ${formatDate(report.to)}`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{range}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.count === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-3xl">🍬</p>
            <p className="mt-2 font-medium">No readings for this period yet.</p>
            <p className="text-sm">Add a reading to see your report here.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Highest" value={`${report.highest} mg/dl`} />
              <Stat label="Lowest" value={`${report.lowest} mg/dl`} />
              <Stat label="Average" value={`${report.average!.toFixed(1)} mg/dl`} />
              <Stat label="Readings" value={report.count} />
            </div>

            {type === 'daily' ? (
              <ul className="divide-y rounded-lg border">
                {report.readings.map((r) => (
                  <li key={r.id} className="flex items-center justify-between p-3 text-sm">
                    <span>{SLOTS[r.slot]}</span>
                    <Badge variant="secondary">{r.value} mg/dl</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-56">
                <p className="mb-2 text-xs text-muted-foreground">Daily average (mg/dl)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyAverages(report.readings)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" fontSize={12} />
                    <YAxis domain={[40, 'auto']} fontSize={12} width={36} />
                    <Tooltip labelFormatter={(d) => `Day ${d}`} />
                    <Line type="monotone" dataKey="avg" stroke="#e11d48" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
