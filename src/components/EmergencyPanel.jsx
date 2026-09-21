import { Ambulance, Flame, MapPin, Phone, Shield, Siren, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'

const filters = [['All', null], ['Hospitals', 'Hospital'], ['Police', 'Police'], ['Fire', 'Fire Station'], ['Clinics', 'Clinic'], ['Rescue', 'Rescue']]
const icons = { Hospital: Ambulance, Police: Shield, 'Fire Station': Flame, Clinic: TriangleAlert, Rescue: Siren }
export default function EmergencyPanel({ compact = false, services = [], currentLocation, startPoint }) {
  const [filter, setFilter] = useState(null)
  const visible = useMemo(() => filter ? services.filter((service) => service.type === filter) : services, [filter, services])
  const sections = visible.reduce((groups, service) => ({ ...groups, [service.section]: [...(groups[service.section] || []), service] }), {})
  const directions = (service) => {
    const from = currentLocation || startPoint
    const target = `${service.lat},${service.lng}`
    window.open(from ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat},${from.lng};${target}` : `https://www.openstreetmap.org/?mlat=${service.lat}&mlon=${service.lng}#map=17/${service.lat}/${service.lng}`, '_blank', 'noopener,noreferrer')
  }
  return <section className={`panel emergency-panel ${compact ? 'compact' : ''}`}><div className="panel-heading"><div><div className="eyebrow">ROUTE-AWARE SUPPORT</div><h2>Emergency services</h2></div><span className="emergency-badge">{services.length ? 'LIVE OSM' : 'SEARCHING'}</span></div><p className="route-service-count"><Siren size={15} /> {services.length} services found near your route</p><div className="service-filters">{filters.map(([label, value]) => <button key={label} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>{services.length === 0 && <p className="empty-services">Emergency services along the route will appear after route search.</p>}{Object.entries(sections).map(([section, items]) => <div className="service-section" key={section}><strong>{section}</strong>{items.map((service) => { const Icon = icons[service.type] || Siren; return <div className="service-row" key={service.id}><div className="service-icon"><Icon size={18} /></div><div><strong>{service.name}</strong><span>{service.type} · {service.distanceFromRoute} from route</span>{service.address && <small>{service.address}</small>}{service.phone && <small><Phone size={11} /> {service.phone}</small>}</div><button className="directions-button" onClick={() => directions(service)}><MapPin size={13} /> Directions</button></div> })}</div>)}<p className="disclaimer"><Shield size={14} /> OpenStreetMap/Overpass data. Missing details are not invented.</p></section>
}
