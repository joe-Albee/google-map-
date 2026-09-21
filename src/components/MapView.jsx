import { useEffect } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Hospital, Siren } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const markerColors = { landslide: '#d66b4c', rockslide: '#a66b4c', flood: '#4c9fa5', road_accident: '#d66b4c', 'Road Blockage': '#d39b3c', Accident: '#d66b4c', 'Heavy Rain': '#688eb6' }
const icon = (color) => L.divIcon({ className: 'safe-marker', html: `<span style="background:${color}"></span>`, iconSize: [20, 20], iconAnchor: [10, 10] })
function FitRoute({ route }) {
  const map = useMap()
  useEffect(() => { if (route?.coordinates?.length) map.fitBounds(route.coordinates, { padding: [35, 35] }) }, [map, route])
  return null
}

const emergencyColors = { Hospital: '#4b83a9', Police: '#506db1', 'Fire Station': '#d6634d', Clinic: '#8b6bb0', Rescue: '#c18a3c' }
const directionsUrl = (from, service) => from ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat},${from.lng};${service.lat},${service.lng}` : `https://www.openstreetmap.org/?mlat=${service.lat}&mlon=${service.lng}#map=17/${service.lat}/${service.lng}`
export default function MapView({ incidents, showAll = false, onMarkerClick, start, destination, route, emergencyServices = [], weatherPoints = [], currentLocation }) {
  const center = route?.coordinates?.[Math.floor(route.coordinates.length / 2)] || [11.35, 76.79]
  return <div className="map-shell">
    <div className="map-toolbar"><span className="map-provider"><span className="map-dot" /> OpenStreetMap</span><span className="live-pill"><i /> {route ? 'LIVE ROUTE' : 'LIVE MAP'}</span></div>
    <MapContainer center={center} zoom={9} scrollWheelZoom className="leaflet-map">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {route?.coordinates && <><Polyline positions={route.coordinates} pathOptions={{ color: '#16836d', weight: 6 }} /><FitRoute route={route} /></>}
      {start && <Marker position={[start.lat, start.lng]} icon={icon('#16836d')}><Popup>Starting location</Popup></Marker>}
      {destination && <Marker position={[destination.lat, destination.lng]} icon={icon('#d66b4c')}><Popup>Destination</Popup></Marker>}
      {incidents.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng)).map((item) => <CircleMarker key={item.id} center={[item.lat, item.lng]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: markerColors[item.type] || '#d66b4c', fillOpacity: 1 }} eventHandlers={{ click: () => onMarkerClick?.(item) }}><Popup><b>{item.type.replace('_', ' ')}</b><br />{item.locationName}<br />{item.incidentDate}<br />{item.description}<br /><a href={item.sourceUrl} target="_blank" rel="noreferrer">View source</a></Popup></CircleMarker>)}
      {emergencyServices.map((service) => <CircleMarker key={service.id} center={[service.lat, service.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: emergencyColors[service.type] || '#4b83a9', fillOpacity: 1 }}><Popup><b>{service.name}</b><br />{service.type}<br />{service.address || 'Address unavailable'}<br /><small>{service.distanceFromRoute} from route</small>{service.phone && <><br />{service.phone}</>} {service.openingHours && <><br />{service.openingHours}</>}<br /><a href={directionsUrl(currentLocation || start, service)} target="_blank" rel="noreferrer">Get Directions</a></Popup></CircleMarker>)}
      {weatherPoints.filter((point) => point.severity !== 'NORMAL').map((point) => <CircleMarker key={`weather-${point.lat}-${point.lng}`} center={[point.lat, point.lng]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#4c9fa5', fillOpacity: 1 }}><Popup><b>{point.locationName}</b><br />{point.condition} · {point.severity.replace('_', ' ')}<br />Rain probability: {point.rainProbability}%<br />Source: Open-Meteo</Popup></CircleMarker>)}
      {showAll && <><Marker position={[11.35, 76.79]} icon={icon('#4b7ca5')}><Popup><Hospital size={14} /> Nearby hospital</Popup></Marker><Marker position={[11.39, 76.76]} icon={icon('#4b7ca5')}><Popup><Siren size={14} /> Nearby police station</Popup></Marker></>}
    </MapContainer>
    <div className="map-legend"><span><i className="dot green" /> Low</span><span><i className="dot yellow" /> Caution</span><span><i className="dot red" /> High</span></div>
  </div>
}
