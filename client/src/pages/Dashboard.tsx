import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReadingForm } from '@/components/ReadingForm'
import { ReadingsTable } from '@/components/ReadingsTable'
import { ReportView, type ReportType } from '@/components/ReportView'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { todayString } from '@/lib/readings'

const REPORTS: { type: ReportType; label: string }[] = [
  { type: 'daily', label: 'Daily' },
  { type: 'mtd', label: 'Month to date' },
  { type: 'monthly', label: 'Previous month' },
]

export function Dashboard() {
  const { user, logout } = useAuth()
  const [selectedDate, setSelectedDate] = useState(todayString())
  // Bumped after every add/edit/delete so reports and the table refetch.
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-semibold">🩸 Sweety</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">Hi, {user?.name}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add a reading</CardTitle>
          </CardHeader>
          <CardContent>
            <ReadingForm
              onSubmit={async (data) => {
                await api('/readings', { method: 'POST', body: data })
                refresh()
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg font-semibold">Reports</h2>
              <div className="flex items-center gap-2">
                <Label htmlFor="report-date" className="text-sm">
                  Selected date
                </Label>
                <Input
                  id="report-date"
                  type="date"
                  className="w-auto"
                  max={todayString()}
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                />
              </div>
            </div>
            <Tabs defaultValue="daily">
              <TabsList>
                {REPORTS.map((r) => (
                  <TabsTrigger key={r.type} value={r.type}>
                    {r.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {REPORTS.map((r) => (
                <TabsContent key={r.type} value={r.type}>
                  <ReportView type={r.type} date={selectedDate} version={version} />
                </TabsContent>
              ))}
            </Tabs>
          </section>

          <ReadingsTable version={version} onChange={refresh} />
        </div>
      </main>
    </div>
  )
}
