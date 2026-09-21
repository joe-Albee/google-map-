import { Menu } from 'lucide-react'

export default function Header({ active, onNavigate, onEmergency }) {
  const links = ['Home', 'Incidents', 'Emergency']
  return <header className="topbar">
    <div className="brand" onClick={() => onNavigate('Home')}><img className="brand-logo" src="/assets/toursafe-logo.jpg" alt="TourSafe logo" /><span><strong>TourSafe</strong><small>Travel smarter. Stay safer.</small></span></div>
    <nav>{links.map((link) => <button key={link} className={active === link ? 'active' : ''} onClick={() => onNavigate(link)}>{link}</button>)}</nav>
    <div className="header-actions"><button className="emergency-button" onClick={onEmergency}>Emergency <span>↗</span></button><button className="mobile-menu"><Menu size={20} /></button></div>
  </header>
}
