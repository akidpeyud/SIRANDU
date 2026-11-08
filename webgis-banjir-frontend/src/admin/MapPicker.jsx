import { useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, GeoJSON, Marker, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import { KECAMATAN, KOTA, boundsOf, kecamatanAt } from '../components/map/kecamatan.js'

/**
 * Peta pemilih lokasi untuk formulir admin.
 * mode "point": klik peta / seret penanda untuk menaruh titik.
 * mode "line": klik berurutan untuk menggambar ruas jalan (minimal 2 titik).
 * Berbeda dengan peta publik, di sini klik memang dipakai untuk menaruh data.
 */
const TILES = {
  satelit: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  jalan: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
}
const pinIcon = L.divIcon({ className: '', html: '<span class="ad-pin"></span>', iconSize: [28, 28], iconAnchor: [14, 26] })

function Clicks({ onClick }) { useMapEvents({ click: (e) => onClick(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)) }); return null }
function Fit({ point, line }) {
  const map = useMap()
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 15))
    else if (line?.length > 1) map.fitBounds(line.map(([lng, lat]) => [lat, lng]), { padding: [30, 30] })
    else map.fitBounds(boundsOf(KOTA), { padding: [10, 10] })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function MapPicker({ mode = 'point', point, onPoint, line = [], onLine, others = [] }) {
  const [base, setBase] = useState('satelit')
  const add = (lat, lng) => (mode === 'point' ? onPoint({ lat, lng }) : onLine([...line, [lng, lat]]))
  const kec = point ? kecamatanAt(point.lat, point.lng) : null

  return (
    <div className="ad-picker">
      <MapContainer center={[-1.61, 103.61]} zoom={12} className="ad-map" zoomControl>
        <TileLayer key={base} url={TILES[base]} maxNativeZoom={19} maxZoom={19} attribution="&copy; Esri" />
        <GeoJSON data={KECAMATAN} interactive={false} style={() => ({ color: '#ffffff', weight: 1.4, opacity: 0.9, fill: false })} />
        <GeoJSON data={KOTA} interactive={false} style={() => ({ color: '#6EC1E4', weight: 3, fill: false })} />
        {others.map((o, i) => <CircleMarker key={i} center={[o.lat, o.lng]} radius={4} pathOptions={{ color: '#fff', weight: 1, fillColor: '#94a3b8', fillOpacity: 0.9 }} interactive={false} />)}
        <Clicks onClick={add} />
        <Fit point={point} line={line} />
        {mode === 'point' && point && (
          <Marker position={[point.lat, point.lng]} icon={pinIcon} draggable
            eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onPoint({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }) } }} />
        )}
        {mode === 'line' && line.length > 0 && (
          <>
            <Polyline positions={line.map(([lng, lat]) => [lat, lng])} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
            <Polyline positions={line.map(([lng, lat]) => [lat, lng])} pathOptions={{ color: '#e11d48', weight: 5 }} />
            {line.map(([lng, lat], i) => <CircleMarker key={i} center={[lat, lng]} radius={5} pathOptions={{ color: '#fff', weight: 2, fillColor: '#e11d48', fillOpacity: 1 }} />)}
          </>
        )}
      </MapContainer>
      <div className="ad-picker-bar">
        <span>{mode === 'point'
          ? (point ? <>Titik di <b>{kec ? `Kec. ${kec}` : 'luar Kota Jambi'}</b> · seret penanda untuk menggeser</> : 'Klik peta untuk menaruh titik')
          : (line.length ? <><b>{line.length}</b> titik ruas · klik untuk menambah</> : 'Klik peta berurutan untuk menggambar ruas jalan')}</span>
        <div>
          {mode === 'line' && line.length > 0 && <>
            <button type="button" onClick={() => onLine(line.slice(0, -1))}>Urungkan</button>
            <button type="button" onClick={() => onLine([])}>Hapus</button>
          </>}
          <button type="button" className={base === 'satelit' ? 'on' : ''} onClick={() => setBase(base === 'satelit' ? 'jalan' : 'satelit')}>{base === 'satelit' ? 'Satelit' : 'Jalan'}</button>
        </div>
      </div>
    </div>
  )
}
