import React, { useCallback, useEffect, useMemo, useState } from 'react'
import './leafletIconFix.js'
import Filters from './components/Filters.jsx'
import HotspotMap from './components/HotspotMap.jsx'
import TopTypesChart from './components/TopTypesChart.jsx'
import { getJSON, buildQuery } from './api/client.js'

const BACKEND_BASE = 'https://city-infrastructure-analytics.onrender.com'




// Keep a shared palette so the map + chart match.
const PALETTE = [
  '#60a5fa', '#fb923c', '#f87171', '#34d399', '#a78bfa',
  '#fbbf24', '#22d3ee', '#f472b6', '#94a3b8', '#c084fc',
]


function buildColorMapFromTypes(typeList) {
  const m = {}
  ;(typeList || []).forEach((t, idx) => {
    m[t] = PALETTE[idx % PALETTE.length]
  })
  return m
}

export default function App() {

  const [backendReady, setBackendReady] = useState(false)
  // DBSCAN-only mode now
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // multi-select types (comma-separated list for backend)
  const [types, setTypes] = useState([])

  // eps shown in KM (UI), converted to meters for API
  const [epsKm, setEpsKm] = useState('2') // 0.15 km = 150m
  const [minPoints, setMinPoints] = useState('3')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  // for type list + “mappable only”
  const [typeCoverage, setTypeCoverage] = useState([])
  const [dateRange, setDateRange] = useState({ min: null, max: null })

  // chart filter toggle
  const [onlyMappableChart, setOnlyMappableChart] = useState(false)

  // top-types data (so one  can derive a consistent color map)
  const [topTypes, setTopTypes] = useState([])

  const typeOptions = useMemo(() => {
    // show only mappable types in dropdown
    return (typeCoverage || [])
      .filter((r) => r.has_location)
      .map((r) => r.type)
  }, [typeCoverage])

  const typeCoverageMap = useMemo(() => {
    const m = new Map()
    for (const r of typeCoverage || []) m.set(r.type, r)
    return m
  }, [typeCoverage])

  // Build a color map from the chart’s displayed types first
  // (so map colors match chart colors)
  const colorMap = useMemo(() => {
    const chartTypes = (topTypes || []).map((r) => r.type).filter(Boolean)
    return buildColorMapFromTypes(chartTypes)
  }, [topTypes])

  // Fetch dataset date range + type coverage (respecting selected from/to)
  const refreshMeta = useCallback(async () => {
    try {
      const dr = await getJSON('/api/analytics/date-range')
      setDateRange(dr)

      const cov = await getJSON(
        `/api/analytics/type-location-coverage${buildQuery({
          from: from || null,
          to: to || null,
          minGeom: 3,
        })}`
      )
      setTypeCoverage(cov.rows || [])

      // Drop selected types that are no longer “mappable” in this date range
      const allowed = new Set((cov.rows || []).filter((x) => x.has_location).map((x) => x.type))
      const filtered = (types || []).filter((t) => allowed.has(t))
      if (filtered.length !== (types || []).length) setTypes(filtered)
    } catch (e) {
      console.warn('Meta fetch failed:', e.message)
    }
  }, [from, to, types])

  const refreshHotspots = useCallback(async () => {
    setLoading(true)
    setErr(null)

    try {
      const epsMeters = Math.round((Number(epsKm) || 0) * 1000)
      const safeEpsMeters = Number.isFinite(epsMeters) && epsMeters > 0 ? epsMeters : 150

      const url = `/api/hotspots${buildQuery({
        from: from || null,
        to: to || null,
        type: types.length ? types.join(',') : null,
        eps: safeEpsMeters,
        minPoints: Number(minPoints) || 8,
      })}`

      const res = await getJSON(url)
      setRows(res.rows || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [from, to, types, epsKm, minPoints])

  // Fetch top-types whenever date/types/chart toggle changes
  const refreshTopTypes = useCallback(async () => {
    try {
      const url = `/api/analytics/top-types${buildQuery({
        from: from || null,
        to: to || null,
        
        
        limit: 10,
      })}`
      const res = await getJSON(url)
      setTopTypes(res.rows || [])
    } catch (e) {
      console.warn('Top-types fetch failed:', e.message)
    }
  }, [from, to])

  useEffect(() => {
  fetch(`${BACKEND_BASE}/health`, { cache: 'no-store' })
    .then(() => {
      setBackendReady(true)
      console.log('Backend is ready')
    })
    .catch(() => {
      console.log('Backend still starting')
    })
}, [])


  useEffect(() => {
    refreshMeta()
  }, [refreshMeta])

  useEffect(() => {
    refreshHotspots()
  }, [refreshHotspots])

  useEffect(() => {
    refreshTopTypes()
  }, [refreshTopTypes])

  return (
    <div className="page">
      <div className="container">
        <div className="card">
          <h1 style={{ marginTop: 0 , textAlign: 'center' , fontSize: '1.8rem', color: '#2e6f40'}}>
            Ottawa 311 Hotspot Explorer (Density Based Scanning)
          </h1>
          {!backendReady && (
          <div className="hint" style={{ marginTop: 8, marginBottom: 12 }}>
            <b>Backend startup:</b> The backend is hosted on Render and may take up to <b>50 seconds</b> to wake up.
            If the map or charts are empty, click{' '}
            <a
              href={`${BACKEND_BASE}/health`}
              target="_blank"
              rel="noreferrer"
            >
              this link
            </a>{' '}
            to start it, then return here.
          </div>
        )}


          <Filters
            from={from}
            setFrom={setFrom}
            to={to}
            setTo={setTo}
            dateRange={dateRange}
            types={types}
            setTypes={setTypes}
            typeOptions={typeOptions}
            epsKm={epsKm}
            setEpsKm={setEpsKm}
            minPoints={minPoints}
            setMinPoints={setMinPoints}
            onRefresh={refreshHotspots}
          />

          {loading ? <div className="hint">Loading hotspots…</div> : null}
          {err ? <div className="error">Error: {err}</div> : null}
        </div>

        
        <div className="card">
          <h3 style={{ marginTop: 0, color: '#2e6f40' }}>Density Base Scanning (what the values mean)</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              <b>distance (km)</b>: how close points must be to count as “neighbors”.
              Higher distance connects farther-apart points → bigger clusters.
            </li>
            <li>
              <b>minPoints</b>: minimum points required to form a cluster.
              Higher minPoints makes clustering stricter.
            </li>
            <li>
              Only showing types with at least <b>3</b> requests that have coordinates in the selected date range.
            </li>
          </ul>
        </div>

        <div className="layout">
          <div className="left">
            <div className="card">
              <h2 style={{ marginTop: 0,color: '#2e6f40' }}>Map</h2>
              <div className="hint" style={{ marginTop: 0 }}>
                Colors match the bar chart (by type).
              </div>

              
              <HotspotMap rows={rows} colorMap={colorMap} />
            </div>
          </div>

          <div className="right">
            <TopTypesChart
              from={from || null}
              to={to || null}
              selectedTypes={types}
              coverageMap={typeCoverageMap}
              onlyMappable={onlyMappableChart}
              setOnlyMappable={setOnlyMappableChart}
              // provide data + palette map
              rowsOverride={topTypes}
              colorMap={colorMap}
            />
          </div>
        </div>

        
      </div>
    </div>
  )
}
