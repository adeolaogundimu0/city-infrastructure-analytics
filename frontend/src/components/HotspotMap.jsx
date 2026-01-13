import React, { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'

function radiusFromCount(count) {
  const c = Math.max(1, Number(count) || 1)
  return Math.min(26, 4 + Math.sqrt(c) * 2)
}

export default function HotspotMap({ rows, colorMap }) {
  const center = useMemo(() => {
    if (!rows || rows.length === 0) return [45.4215, -75.6972]
    return [rows[0].lat, rows[0].lon]
  }, [rows])

  return (
    <div style={{ height: 420, overflow: 'hidden', borderRadius: 12 }}>
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {(rows || []).map((r, i) => {
          const color = (colorMap && colorMap[r.type]) || '#60a5fa'
          return (
            <CircleMarker
              key={`${r.type}-${r.month}-${i}`}
              center={[r.lat, r.lon]}
              radius={radiusFromCount(r.count)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.55,
              }}
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 700 }}>{r.type}</div>
                  <div><b>Month:</b> {new Date(r.month).toISOString().slice(0, 10)}</div>
                  <div><b>Count:</b> {r.count}</div>
                  <div><b>Lat/Lon:</b> {r.lat.toFixed(5)}, {r.lon.toFixed(5)}</div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
