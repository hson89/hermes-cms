import React from 'react'
import { TipTapEditor } from './TipTapEditor'
import { useAuth } from '@payloadcms/ui'

export const FieldRenderer: React.FC<{
  field: any
  value: any
  onChange: (val: any) => void
  isDrafting?: boolean
  disabled?: boolean
  tenantId?: string | number
}> = ({ field, value, onChange, isDrafting, disabled, tenantId }) => {
  const { user } = useAuth()
  const commonClasses = `w-full bg-surface-container-lowest border-none rounded-xl p-5 font-body text-sm focus:outline-none transition-all ghost-border ghost-border-focus ${disabled ? 'opacity-75 cursor-not-allowed bg-surface-container-low/50 select-none' : ''}`
  
  const isAuthor = field.name?.toLowerCase() === 'author'
  const effectiveField = isAuthor ? { ...field, type: 'relationship', relationTo: 'users' } : field

  const isTitle = effectiveField.name?.toLowerCase() === 'title'
  const isSlug = effectiveField.name?.toLowerCase() === 'slug'
  const isBody = effectiveField.type === 'richText' || effectiveField.name === 'body'
  const isMedia = effectiveField.type === 'upload'

  // Lifted Hooks & States for Relationship Field
  const relationTo = effectiveField.type === 'relationship' ? effectiveField.relationTo : undefined
  const isUsersRelation = React.useMemo(() => {
    if (!relationTo) return false
    return typeof relationTo === 'string'
      ? relationTo === 'users'
      : Array.isArray(relationTo) && relationTo[0] === 'users'
  }, [relationTo])

  const [relOptions, setRelOptions] = React.useState<Array<{ id: any; label: string }>>([])
  const [loading, setLoading] = React.useState(false)

  const selectedVal = React.useMemo(() => {
    if (!value) return ''
    if (typeof value === 'object') {
      if (value.id !== undefined && value.id !== null) {
        return String(value.id)
      }
      return ''
    }
    return String(value)
  }, [value])

  // Keep a stable ref to onChange to avoid infinite re-render loops caused by
  // the unstable inline arrow function that changes on every EditorPanel render.
  const onChangeRef = React.useRef(onChange)
  React.useLayoutEffect(() => {
    onChangeRef.current = onChange
  })

  // Pre-seed options with the current logged-in user IMMEDIATELY — before any
  // async fetch — so the select always has at least one valid option to display.
  React.useEffect(() => {
    if (!isUsersRelation || !user?.id) return
    setRelOptions((prev) => {
      if (prev.some((opt) => String(opt.id) === String(user.id))) return prev
      const userLabel = (user as any).name || user.email || String(user.id)
      return [{ id: user.id, label: `${userLabel} (You)` }, ...prev]
    })
  }, [isUsersRelation, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch full relationship options.
  // For users we intentionally omit the tenant filter so the request never
  // returns zero rows (which would leave the select blank even after the fetch).
  // The current user is always guaranteed to be in the list via the effect above.
  React.useEffect(() => {
    if (effectiveField.type !== 'relationship' || !relationTo) return
    let active = true
    setLoading(true)

    const targetUrl =
      typeof relationTo === 'string'
        ? `/api/${relationTo}?limit=100`
        : `/api/${relationTo[0]}?limit=100`

    fetch(targetUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (active && data && Array.isArray(data.docs)) {
          const parsed: Array<{ id: any; label: string }> = data.docs.map((doc: any) => {
            const label =
              doc.name || doc.title || doc.label || doc.email || doc.username || String(doc.id)
            return { id: doc.id, label }
          })

          // Merge fetched options with pre-seeded ones; never drop the current user.
          setRelOptions((prev) => {
            const merged = [...prev]
            for (const opt of parsed) {
              if (!merged.some((m) => String(m.id) === String(opt.id))) {
                merged.push(opt)
              }
            }
            // Guarantee current user stays in the list with "(You)" suffix.
            if (user && !merged.some((m) => String(m.id) === String(user.id))) {
              const userLabel = (user as any).name || user.email || String(user.id)
              merged.unshift({ id: user.id, label: `${userLabel} (You)` })
            }
            return merged
          })
        }
      })
      .catch((err) => {
        console.error('Failed to load relationship options for:', relationTo, err)
        // The pre-seeded current-user option is still present — field is not lost.
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [relationTo, user?.id, effectiveField.type]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-default / map the author value.
  // NOTE: `onChange` is intentionally accessed via `onChangeRef.current`
  // to prevent infinite re-render loops caused by potentially unstable references.
  React.useEffect(() => {
    if (effectiveField.type !== 'relationship' || !isUsersRelation || !user?.id) return

    if (!selectedVal) {
      onChangeRef.current(user.id)
      return
    }

    // If a value exists but doesn't match any option (e.g. AI returned a name
    // string like "John Doe"), try to resolve by label or fall back to current user.
    if (!loading && relOptions.length > 0) {
      const hasOption = relOptions.some((opt) => String(opt.id) === selectedVal)
      if (!hasOption) {
        // If it's a string that doesn't look like an ID (numeric or UUID-ish), try label match.
        // This handles cases where AI returns "John Doe" instead of the ID.
        const looksLikeId = typeof value === 'number' || (typeof value === 'string' && /^[0-9a-f-]{8,}$/i.test(value))
        
        const matchedOpt =
          value && typeof value === 'string' && !looksLikeId
            ? relOptions.find((opt) => {
                const labelNorm = opt.label.toLowerCase()
                const valNorm = value.toLowerCase()
                return (
                  labelNorm === valNorm ||
                  labelNorm.includes(valNorm) ||
                  valNorm.includes(labelNorm)
                )
              })
            : null

        if (matchedOpt) {
          onChangeRef.current(matchedOpt.id)
        } else {
          onChangeRef.current(user.id)
        }
      }
    }
  }, [isUsersRelation, selectedVal, loading, relOptions, user?.id, value, effectiveField.type])
  // ^ onChange intentionally omitted — using onChangeRef.current instead

  if (isTitle) {
    return (
      <h1 
        contentEditable={!disabled}
        suppressContentEditableWarning
        onBlur={(e) => !disabled && onChange(e.currentTarget.innerText)}
        className={`font-headline text-5xl text-on-surface font-bold leading-tight outline-none border-none bg-transparent m-0 transition-all ${isDrafting ? 'typing-cursor opacity-70' : ''} ${disabled ? 'opacity-80 cursor-not-allowed select-none' : ''}`}
      >
        {value || 'Untitled Entry'}
      </h1>
    )
  }

  if (isSlug) {
    return (
      <div className="relative w-full">
        <input 
          type="text" 
          value={value || ''} 
          readOnly
          className={commonClasses}
        />
      </div>
    )
  }

  if (isMedia) {
    return (
      <div className={`w-full h-80 rounded-xl bg-surface-container-high border-2 border-dashed border-outline-variant/50 flex flex-col items-center justify-center relative overflow-hidden transition-colors group ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-primary/50'}`}>
        {isDrafting ? (
          <div className="absolute inset-0 bg-surface-container-lowest/40 backdrop-blur-sm flex flex-col items-center justify-center z-10 pulse-subtle">
            <div className="w-12 h-12 rounded-full bg-primary-container text-primary flex items-center justify-center mb-3 shadow-lg">
              <span className="material-symbols-outlined !text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <span className="font-label text-sm text-primary font-medium tracking-wide">AI Generating Image...</span>
            <span className="text-xs text-on-surface-variant mt-1 font-body">"Abstract visualization of cognitive computing..."</span>
          </div>
        ) : value ? (
          <div className="relative w-full h-full">
            <img 
              src={typeof value === 'string' ? value : (value.url || '')} 
              alt="AI Generated" 
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="bg-white text-on-surface px-4 py-2 rounded-lg font-label text-xs font-bold shadow-sm border-none cursor-pointer">
                  Regenerate with AI
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">image</span>
            <span className="font-body text-sm text-outline-variant">Image Placeholder</span>
          </div>
        )}
      </div>
    )
  }

  if (isBody) {
    return (
      <TipTapEditor
        value={value || ''}
        onChange={onChange}
        isDrafting={isDrafting}
        disabled={disabled}
        placeholder="Start writing or let AI draft content for you..."
      />
    )
  }

  switch (effectiveField.type) {
    case 'text':
      return (
        <input 
          type="text" 
          value={value || ''} 
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
        />
      )
    case 'textarea':
      return (
        <textarea 
          value={value || ''} 
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${commonClasses} min-h-[120px] resize-y`}
        />
      )
    case 'date':
      let dateVal = ''
      if (value) {
        try {
          dateVal = new Date(value).toISOString().split('T')[0]
        } catch (e) {
          dateVal = value
        }
      }
      return (
        <input 
          type="date" 
          value={dateVal} 
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
        />
      )
    case 'boolean':
      const checked = !!value
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 border-none cursor-pointer flex items-center ${
            checked ? 'bg-primary' : 'bg-surface-container-high'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`w-6 h-6 rounded-full bg-white transition-transform duration-300 transform ${
              checked ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      )
    case 'number':
      return (
        <input 
          type="number" 
          value={value !== undefined && value !== null ? value : ''} 
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className={commonClasses}
        />
      )
    case 'select':
      return (
        <select
          value={value !== undefined && value !== null ? String(value) : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${commonClasses} appearance-none bg-no-repeat bg-[right_1.25rem_center]`}
          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundSize: '1.25rem' }}
        >
          <option value="" disabled>Select an option...</option>
          {effectiveField.options?.map((opt: any) => {
            const optVal = typeof opt === 'string' ? opt : opt.value
            const optLabel = typeof opt === 'string' ? opt : opt.label
            return (
              <option key={optVal} value={optVal}>{optLabel}</option>
            )
          })}
        </select>
      )
    case 'relationship': {
      return (
        <div className="relative w-full">
          <select
            value={selectedVal}
            disabled={disabled || loading}
            onChange={(e) => {
              const val = e.target.value
              const matchedOption = relOptions.find((opt) => String(opt.id) === val)
              onChange(matchedOption ? matchedOption.id : val)
            }}
            className={`${commonClasses} appearance-none bg-no-repeat bg-[right_1.25rem_center]`}
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, 
              backgroundSize: '1.25rem' 
            }}
          >
            {relOptions.length === 0 && (
              <option value="" disabled>
                {loading ? 'Loading options...' : 'Select related item...'}
              </option>
            )}
            {relOptions.map((opt) => (
              <option key={String(opt.id)} value={String(opt.id)}>
                {opt.label}
              </option>
            ))}
          </select>
          {loading && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      )
    }
    case 'array':
      const rows = Array.isArray(value) ? value : []
      return (
        <div className="flex flex-col gap-4 w-full">
          {rows.map((rowVal: any, idx: number) => (
            <div 
              key={idx} 
              className="p-5 rounded-2xl bg-surface-container-low/40 border border-outline-variant/15 flex flex-col gap-4 relative transition-all"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                <span className="font-label text-xs font-bold text-on-surface-variant">Item #{idx + 1}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => {
                      const newRows = rows.filter((_, i) => i !== idx)
                      onChange(newRows)
                    }}
                    className="text-error hover:bg-error/10 p-1.5 rounded-lg border-none bg-transparent cursor-pointer flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined !text-sm">delete</span>
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-4">
                {effectiveField.fields?.map((subField: any) => (
                  <div key={subField.name} className="flex flex-col gap-1.5">
                    <label className="font-label text-[10px] uppercase tracking-widest text-outline">
                      {subField.label || subField.name}
                    </label>
                    <FieldRenderer
                      field={subField}
                      value={rowVal?.[subField.name]}
                      isDrafting={isDrafting}
                      disabled={disabled}
                      onChange={(val) => {
                        const newRows = [...rows]
                        newRows[idx] = { ...newRows[idx], [subField.name]: val }
                        onChange(newRows)
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                onChange([...rows, {}])
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-outline-variant/40 hover:border-primary/50 hover:bg-primary/5 text-xs font-label font-bold text-outline hover:text-primary transition-all cursor-pointer bg-transparent"
            >
              <span className="material-symbols-outlined !text-sm">add</span>
              Add Item
            </button>
          )}
        </div>
      )
    default:
      return (
        <div className={`${commonClasses} bg-surface-container-low italic text-on-surface-variant/40`}>
          Field type "{effectiveField.type}" renderer not implemented yet.
        </div>
      )
  }
}
