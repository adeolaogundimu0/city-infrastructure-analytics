import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { getJSON, buildQuery } from '../api/client.js'

function muted(hex, alpha = 0.35) {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return `rgba(255,255,255,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function shortLabel(s, max = 14) {
  if (!s) return ''
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}


export default function TopTypesChart({
  from,
  to,
  selectedTypes,
  coverageMap,
  onlyMappable,
  setOnlyMappable,

 
  rowsOverride = null,
  colorMap = null,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  
  useEffect(() => {
    if (Array.isArray(rowsOverride)) {
      setRows(rowsOverride)
      return
    }

    let alive = true
    async function run() {
      setLoading(true)
      try {
        const data = await getJSON(`/api/analytics/top-types${buildQuery({ from, to, limit: 10 })}`)
        if (!alive) return
        setRows(data.rows || [])
      } finally {
        if (alive) setLoading(false)
      }
    }

    run()
    return () => {
      alive = false
    }
  }, [from, to, rowsOverride])

  const chartRows = useMemo(() => {
    let list = [...(rows || [])].map((r) => ({
      ...r,
      count: Number(r.count || 0),
    }))

    // If user selected types, chart should reflect that
    if (selectedTypes?.length) {
      const s = new Set(selectedTypes)
      list = list.filter((r) => s.has(r.type))
    }

    // Optional toggle: chart only shows mappable types
    if (onlyMappable) {
      list = list.filter((r) => (coverageMap.get(r.type)?.has_location ?? false))
    }

    // Attach color + coverage stats
    return list.map((r, i) => {
      const base = (colorMap && colorMap[r.type]) || '#60a5fa'
      const hasLoc = coverageMap.get(r.type)?.has_location ?? false

      return {
        ...r,
        _base: base,
        _hasLoc: hasLoc,
        _color: hasLoc ? base : muted(base),
        _withGeom: coverageMap.get(r.type)?.with_geom ?? null,
        _total: coverageMap.get(r.type)?.total_requests ?? null,
      }
    })
  }, [rows, selectedTypes, onlyMappable, coverageMap, colorMap])

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8, color: '#2e6f40' }}>Top Request Types</h2>

        <label className="pill" style={{ userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={onlyMappable}
            onChange={(e) => setOnlyMappable(e.target.checked)}
          />
          Show only mappable
        </label>
      </div>

      {loading ? <div className="hint">Loading chart…</div> : null}

      <div style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
              data={chartRows}
              margin={{ top: 10, right: 10, left: 10, bottom: 110 }}  
            >
              <XAxis
                dataKey="type"
                interval={0}
                angle={-35}                 
                textAnchor="end"
                height={110}                
                tickMargin={12}             
                tick={{ fontSize: 13, fill: '#e8eef6' }}
                tickFormatter={(v) => shortLabel(v, 16)}

              />

            <YAxis
              tick={{ fontSize: 13, fill: '#e8eef6' }}
              label={{
                value: 'Count',
                angle: -90,
                position: 'insideLeft',
                fill: '#e8eef6',
                fontSize: 16,
              }}
            />

            <Tooltip
              contentStyle={{
                background: '#ffffff',
                color: '#000000',
                borderRadius: 10,
                border: '1px solid #ddd',
              }}
              labelStyle={{ color: '#000000', fontWeight: 800 }}
              itemStyle={{ color: '#000000' }}
              formatter={(value, name, props) => {
                const r = props?.payload
                if (r?._withGeom != null && r?._total != null) {
                  return [`${value} (coords: ${r._withGeom}/${r._total})`, 'Count']
                }
                return [value, 'Count']
              }}
            />

            <Bar dataKey="count">
              {chartRows.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry._color} />
              ))}
              <LabelList dataKey="count" position="top" fill="#ffffff" fontSize={16} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="hint">
        Bright bars have enough coordinate data (≥3) in the selected date range. Muted bars don’t.
      </div>
    </div>
  )
}
