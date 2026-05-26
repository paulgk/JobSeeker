'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { EditNeededBadge } from '@/components/edit-needed-badge'

export function EditableApplicationHeader({
  id,
  initialCompany,
  initialJobTitle,
}: {
  id: string
  initialCompany: string
  initialJobTitle: string
}) {
  const [company, setCompany] = useState(initialCompany)
  const [jobTitle, setJobTitle] = useState(initialJobTitle)
  const [editingField, setEditingField] = useState<'company' | 'jobTitle' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(field: 'company' | 'jobTitle', value: string) {
    if (value.trim() === '') {
      field === 'company' ? setCompany(initialCompany) : setJobTitle(initialJobTitle)
      setEditingField(null)
      return
    }
    const prev = field === 'company' ? company : jobTitle
    setError(null)
    setSaving(true)
    const res = await fetch(`/api/applications/${id}/metadata`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, jobTitle }),
    })
    setSaving(false)
    if (!res.ok) {
      field === 'company' ? setCompany(prev) : setJobTitle(prev)
      setError("Couldn't save. Try again.")
    } else {
      setEditingField(null)
    }
  }

  return (
    <div>
      {editingField === 'company' ? (
        <Input
          value={company}
          className="text-2xl font-semibold tracking-tight"
          autoFocus
          disabled={saving}
          onChange={(e) => setCompany(e.target.value)}
          onBlur={() => handleSave('company', company)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setCompany(initialCompany)
              setEditingField(null)
            }
          }}
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <h1
            className="text-2xl font-semibold tracking-tight text-foreground truncate cursor-pointer"
            onClick={() => { setEditingField('company'); setError(null) }}
          >
            {company}
          </h1>
          {company === 'Unknown Company' && (
            <span onClick={() => { setEditingField('company'); setError(null) }}>
              <EditNeededBadge />
            </span>
          )}
        </div>
      )}

      {editingField === 'jobTitle' ? (
        <Input
          value={jobTitle}
          className="text-base text-muted-foreground mt-1"
          autoFocus
          disabled={saving}
          onChange={(e) => setJobTitle(e.target.value)}
          onBlur={() => handleSave('jobTitle', jobTitle)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setJobTitle(initialJobTitle)
              setEditingField(null)
            }
          }}
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <p
            className="text-base text-muted-foreground truncate mt-1 cursor-pointer"
            onClick={() => { setEditingField('jobTitle'); setError(null) }}
          >
            {jobTitle}
          </p>
          {jobTitle === 'Unknown Role' && (
            <span onClick={() => { setEditingField('jobTitle'); setError(null) }}>
              <EditNeededBadge />
            </span>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}
