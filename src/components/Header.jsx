import { MoreVertical } from 'lucide-react'
import { useState } from 'react'

export default function Header({ active, onNavigate, onEmergency }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = ['Home', 'Incidents', 'Emergency', 'Feedback']
  const navigate = (link) => {
    setMenuOpen(false)
    if (link === 'Emergency') onEmergency()
    else onNavigate(link)
  }
  return <header className="topbar">
    <div className="brand" onClick={() => onNavigate('Home')}><img className="brand-logo" src="/assets/toursafe-logo.jpg" alt="TourSafe logo" /><span><strong>TourSafe</strong><small>Travel smarter. Stay safer.</small></span></div>
    <div className="header-actions"><button className="menu-trigger" aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><MoreVertical size={22} /></button>{menuOpen && <div className="nav-menu">{links.map((link, index) => <button key={link} className={active === link ? 'active' : ''} onClick={() => navigate(link)}><b>{index + 1}</b>{link}</button>)}</div>}</div>
  </header>
}
