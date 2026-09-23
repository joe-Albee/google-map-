import { Ambulance, Flame, MapPin, Phone, Pill, Search, Shield, Siren } from 'lucide-react'
import { useMemo, useState } from 'react'

const filters = [['All', null], ['Hospitals', 'Hospital'], ['Police', 'Police station'], ['Fire', 'Fire station'], ['Ambulance', 'Ambulance service'], ['Pharmacies', 'Pharmacy']]
const icons = { Hospital: Ambulance, 'Police station': Shield, 'Fire station': Flame, 'Ambulance service': Siren, Pharmacy: Pill }

export default function EmergencyPanel({ compact = false, services = [], loading = false, error = '', hasRoute = false, onRetry, currentLocation, startPoint }) {
  const [filter, setFilter] = useState(null)
  const [query, setQuery] = useState('')
  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return services.filter((service) => {
      const matchesFilter = !filter || service.type === filter
      const searchableText = [service.name, service.type, service.address, service.section].join(' ').toLowerCase()
      return matchesFilter && (!normalizedQuery || searchableText.includes(normalizedQuery))
    })
  }, [filter, query, services])
  const sections = visible.reduce((groups, service) => ({ ...groups, [service.section]: [...(groups[service.section] || []), service] }), {})
  const directions = (service) => {
    const from = currentLocation || startPoint
    const target = `${service.lat},${service.lng}`
    const url = from
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat},${from.lng};${target}`
      : `https://www.openstreetmap.org/?mlat=${service.lat}&mlon=${service.lng}#map=17/${service.lat}/${service.lng}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const emptyMessage = !hasRoute
    ? 'Choose a start and destination, then check the route to find emergency services.'
    : error || 'No emergency services were found near this route in OpenStreetMap.'

  return <section className={`panel emergency-panel ${compact ? 'compact' : ''}`}>
    <div className="panel-heading"><div><div className="eyebrow">ROUTE-AWARE SUPPORT</div><h2>Emergency services</h2></div><span className="emergency-badge">{loading ? 'SEARCHING' : services.length ? 'LIVE OSM' : 'NO RESULTS'}</span></div>
    <p className="route-service-count"><Siren size={15} /> {loading ? 'Searching along your route…' : `${services.length} services found near your route`}</p>
    <label className="service-search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emergency services" aria-label="Search emergency services" disabled={!services.length} /></label>
    <div className="service-filters">{filters.map(([label, value]) => <button key={label} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)} disabled={!services.length}>{label}</button>)}</div>
    {loading && services.length === 0 && <p className="empty-services">Searching OpenStreetMap for hospitals, police, fire, ambulance services and pharmacies along this route…</p>}
    {!loading && services.length === 0 && <div className="empty-services"><p>{emptyMessage}</p>{hasRoute && error && <button className="retry-button" onClick={onRetry}>Try again</button>}</div>}
    {services.length > 0 && visible.length === 0 && <p className="empty-services">No emergency services match your search.</p>}
    {Object.entries(sections).map(([section, items]) => <div className="service-section" key={section}><strong>{section}</strong>{items.map((service) => {
      const Icon = icons[service.type] || Siren
      return <div className="service-row" key={service.id}><div className="service-icon"><Icon size={18} /></div><div><strong>{service.name}</strong><span>{service.type} · {service.distanceFromRoute} from route</span><small>{service.address}</small><small><Phone size={11} /> {service.phone}</small></div><button className="directions-button" onClick={() => directions(service)}><MapPin size={13} /> Directions</button></div>
    })}</div>)}
    <p className="disclaimer"><Shield size={14} /> Emergency service locations from OpenStreetMap via Overpass.</p>
  </section>
}
