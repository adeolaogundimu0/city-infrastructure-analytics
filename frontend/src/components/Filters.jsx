import React, { useMemo } from 'react'

function clampDate(value, min, max) {
  if (!value) return ''
  if (min && value < min) return min
  if (max && value > max) return max
  return value
}

function clampNumber(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  if (min != null && n < min) return String(min)
  if (max != null && n > max) return String(max)
  return String(n)
}

export default function Filters({
  from,
  setFrom,
  to,
  setTo,
  dateRange,
  types,
  setTypes,
  typeOptions,
  epsKm,
  setEpsKm,
  minPoints,
  setMinPoints,
  onRefresh,
}) {
  const minDate = useMemo(() => {
    if (!dateRange?.min) return ''
    return new Date(dateRange.min).toISOString().slice(0, 10)
  }, [dateRange])

  const maxDate = useMemo(() => {
    if (!dateRange?.max) return ''
    return new Date(dateRange.max).toISOString().slice(0, 10)
  }, [dateRange])

  // If there are lots of types, use 2 columns to reduce scrolling
  const twoColumnTypes = (typeOptions?.length || 0) >= 16

  // Dynamic height: avoid huge empty box when only a few options exist.
  // HTML select "size" controls how many rows are visible.
  const typeSelectSize = useMemo(() => {
    const n = typeOptions?.length || 0
    if (n <= 0) return 4
    if (n < 6) return n 
    return Math.min(n, 10) // cap visible rows (still scrolls if more)
  }, [typeOptions])

  function onTypeChange(e) {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value)
    setTypes(selected)
  }

  function onFromChange(v) {
    const next = clampDate(v, minDate || null, maxDate || null)
    setFrom(next)
    if (to && next && to < next) setTo(next)
  }

  function onToChange(v) {
    const next = clampDate(v, minDate || null, maxDate || null)
    setTo(next)
    if (from && next && next < from) setFrom(next)
  }

  function onEpsChange(v) {
    // eps in km; 
    const cleaned = v === '' ? '' : clampNumber(v, 0.5, 100)
    setEpsKm(cleaned)
  }

  function onMinPointsChange(v) {
    // minPoints should be integer-ish; clamp 2..200
    const cleaned = v === '' ? '' : clampNumber(v, 2, 200)
    setMinPoints(cleaned)
  }

  return (
    <>
      {/* DATES */}
      <div className="grid2" style={{ width: '100%', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <label className="label">From</label>
          <input
            className="input"
            type="date"
            value={from}
            min={minDate || undefined}
            max={maxDate || undefined}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label className="label">To</label>
          <input
            className="input"
            type="date"
            value={to}
            min={minDate || undefined}
            max={maxDate || undefined}
            onChange={(e) => onToChange(e.target.value)}
          />
        </div>
      </div>

      <div className="hint" style={{ marginTop: 8, marginBottom: 10 }}>
        Date range in dataset: <b>{minDate || '—'}</b> to <b>{maxDate || '—'}</b>
      </div>

     
      <select
        className={`input typeSelect ${twoColumnTypes ? 'typeSelect--twoCol' : ''}`}
        multiple
        size={typeSelectSize}
        value={types}
        onChange={onTypeChange}
        style={{
          
          width: '100%',
        }}
      >
        {typeOptions?.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <div className="hint" style={{ marginTop: 6 }}>
        Hold <b>Shift</b> to select a range. Hold <b>Ctrl/Cmd</b> to toggle items. (No selection = all mappable types)
      </div>

      
      <div className="grid2" style={{ marginTop: 12, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <label className="label">Distance (km)</label>
          <input
            className="input"
            type="number"
            step="0.5"
            min="0.5"
            max="100"
            value={epsKm}
            onChange={(e) => onEpsChange(e.target.value)}
            placeholder="2"
          />
          <div className="hint">
            {epsKm ? (
              <>
                <b>{epsKm}</b> km = <b>{Math.round(Number(epsKm) * 1000)}</b> meters
              </>
            ) : (
              'Example: 0.15 km = 150 meters'
            )}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <label className="label">{"Min Points (>=2)"}</label>
          <input
            className="input"
            type="number"
            step="1"
            min="2"
            max="200"
            value={minPoints}
            onChange={(e) => onMinPointsChange(e.target.value)}
            placeholder="8"
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </>
  )
}
