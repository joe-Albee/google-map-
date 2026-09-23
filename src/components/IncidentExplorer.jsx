import { useEffect, useState } from 'react'
import { Filter, Plus, Trash2 } from 'lucide-react'
import MapView from './MapView'
export default function IncidentExplorer({ incidents }) {
  const [filter, setFilter] = useState('All')
  const [items, setItems] = useState(incidents)
  useEffect(() => setItems(incidents), [incidents])
  const shown = filter === 'All' ? items : items.filter((i) => i.type.toLowerCase().includes(filter.toLowerCase().replace(' road block', ' road_accident')))
  return <div className="page-content"><div className="section-intro"><div><div className="eyebrow">INCIDENT INTELLIGENCE</div><h1>Know what happened<br /><em>along the way.</em></h1><p className="muted">Historical and reported events are shown for awareness, never as a prediction.</p></div></div><div className="explorer-grid"><MapView incidents={shown} showAll /><section className="panel incident-list"><div className="panel-heading"><h2><Filter size={17} /> Incident records</h2><span className="data-label">SOURCE DATA</span></div><div className="filter-row">{['All', 'Flood', 'Landslide', 'Road Accident', 'Rockslide'].map((f) => <button className={filter === f ? 'selected' : ''} key={f} onClick={() => setFilter(f)}>{f}</button>)}</div>{shown.length === 0 && <p className="empty-services">Check a route to see reported incidents near it.</p>}{shown.map((item) => <div className="record" key={item.id}><div><strong>{item.type.replace('_', ' ')}</strong><span>{item.locationName}</span><small>{item.incidentDate} · {item.severity} severity</small></div><button onClick={() => setItems(items.filter((i) => i.id !== item.id))}><Trash2 size={15} /></button></div>)}</section></div></div>
}
