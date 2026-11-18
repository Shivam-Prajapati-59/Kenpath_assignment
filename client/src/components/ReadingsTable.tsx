import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReadingForm } from '@/components/ReadingForm'
import { api } from '@/lib/api'
import { SLOTS, formatDate, type Reading } from '@/lib/readings'

interface Page {
  data: Reading[]
  pagination: { page: number; totalPages: number; total: number }
}

export function ReadingsTable({ version, onChange }: { version: number; onChange: () => void }) {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<Page | null>(null)
  const [editing, setEditing] = useState<Reading | null>(null)

  useEffect(() => {
    api<Page>(`/readings?page=${page}&limit=10`).then(setResult).catch(() => setResult(null))
  }, [page, version])

  async function handleDelete(r: Reading) {
    if (!window.confirm(`Delete the ${SLOTS[r.slot]} reading on ${formatDate(r.date)}?`)) return
    await api(`/readings/${r.id}`, { method: 'DELETE' })
    onChange()
  }

  const rows = result?.data ?? []
  const { totalPages = 1, total = 0 } = result?.pagination ?? {}

  return (
    <Card>
      <CardHeader>
        <CardTitle>All readings {total > 0 && <span className="text-muted-foreground">({total})</span>}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No readings yet. Add your first one!</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead className="text-right">mg/dl</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell>{SLOTS[r.slot]}</TableCell>
                  <TableCell className="text-right font-medium">{r.value}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(r)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit reading</DialogTitle>
          </DialogHeader>
          {editing && (
            <ReadingForm
              key={editing.id}
              submitLabel="Save changes"
              initial={{ date: editing.date, slot: editing.slot, value: String(editing.value) }}
              onSubmit={async (data) => {
                await api(`/readings/${editing.id}`, { method: 'PUT', body: data })
                setEditing(null)
                onChange()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
