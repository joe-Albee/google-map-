import { CarFront, Clock3, Route, ShieldCheck } from 'lucide-react'
import StatusPill from './StatusPill'
export default function RouteSummary({ risk, route }) {
  return <section className="panel route-summary"><div className="panel-heading"><div><div className="eyebrow">ROUTE OVERVIEW</div><h2>{risk.start} <span>→</span> {risk.destination}</h2></div><StatusPill level={risk.level}>{risk.level === 'MEDIUM' ? 'CAUTION' : risk.level}</StatusPill></div><div className="metrics"><div><Route /><strong>{route?.distance || '287 km'}</strong><small>Distance</small></div><div><Clock3 /><strong>{route?.duration || '7h 10m'}</strong><small>Estimated time</small></div><div><CarFront /><strong>{route?.traffic || 'Moderate'}</strong><small>Traffic</small></div></div><div className="route-note"><ShieldCheck size={17} /><span>Route checked against <b>5 demo incidents</b> and current demo weather.</span><small>{route ? 'LIVE' : 'DEMO'}</small></div></section>
}
