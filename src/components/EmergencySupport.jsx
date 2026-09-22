import { useEffect, useRef, useState } from 'react'
import { HeartHandshake, LifeBuoy, MessageSquare, PhoneCall, Send, Shield, Truck, UsersRound, Waves } from 'lucide-react'

const resources = [
  { title: 'Women Help', description: 'India women-safety contacts for urgent help and support.', icon: UsersRound, action: 'Open support options', liveOptions: [{ label: 'Call 112 Emergency', href: 'tel:112' }, { label: 'Call 181 Women Helpline', href: 'tel:181' }, { label: 'Official support website', href: 'https://www.ncw.gov.in/' }] },
  { title: 'Emergency Shelters', description: 'Find emergency shelters and assistance through connected local services.', icon: LifeBuoy, phoneLabel: 'Call 112 Emergency', phone: 'tel:112' },
  { title: 'Emergency Transport', description: 'Request emergency ambulance or transport assistance.', icon: Truck, phoneLabel: 'Call 102 Ambulance', phone: 'tel:102' },
  { title: 'Relief Materials', description: 'Get assistance related to emergency relief and disaster support.', icon: HeartHandshake, phoneLabel: 'Call 1070 Relief Support', phone: 'tel:1070' },
  { title: 'Psychological Counselling', description: 'Access mental health counselling and emotional support.', icon: MessageSquare, phoneLabel: 'Call 14416 Tele-MANAS', phone: 'tel:14416' },
  { title: 'Help Desk', description: 'Contact emergency support services for immediate assistance.', icon: Send, phoneLabel: 'Call 112 Emergency', phone: 'tel:112' },
  { title: 'Coastal Security', description: 'Get emergency assistance for coastal and sea-related situations.', icon: Waves, phoneLabel: 'Call 112 Emergency', phone: 'tel:112' },
]

export default function EmergencySupport({ onNotice }) {
  const [holding, setHolding] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const timer = useRef(null)
  const startHold = () => {
    setHolding(true); setSeconds(0)
    timer.current = window.setInterval(() => setSeconds((value) => {
      if (value >= 2) {
        window.clearInterval(timer.current)
        setHolding(false)
        onNotice('SOS prepared. Confirm your emergency call and location sharing before contacting local services.')
        return 3
      }
      return value + 1
    }), 1000)
  }
  const stopHold = () => {
    if (seconds < 3) window.clearInterval(timer.current)
    setHolding(false)
    setSeconds(0)
  }
  useEffect(() => () => window.clearInterval(timer.current), [])
  return <section className="support-area">
    <div className="sos-card">
      <div><div className="eyebrow">QUICK ACTION</div><h2>SOS Emergency</h2><p>Press and hold for 3 seconds to prepare an emergency call and location-sharing action.</p></div>
      <button className={`sos-button ${holding ? 'holding' : ''}`} onPointerDown={startHold} onPointerUp={stopHold} onPointerLeave={stopHold} aria-label="Press and hold SOS Emergency">{holding ? `${Math.min(seconds + 1, 3)}s` : 'SOS'}</button>
    </div>
    <div className="support-grid">{resources.map(({ title, description, icon: Icon, action, phoneLabel, phone, liveOptions }) => <article className="support-card" key={title}><div className="support-icon"><Icon size={19} /></div><h3>{title}</h3><p>{description}</p>{liveOptions ? <div className="support-links">{liveOptions.map((option) => <a href={option.href} target={option.href.startsWith('http') ? '_blank' : undefined} rel={option.href.startsWith('http') ? 'noreferrer' : undefined} key={option.label}><PhoneCall size={13} /> {option.label}</a>)}</div> : phone ? <a className="support-action" href={phone}><PhoneCall size={13} /> {phoneLabel}</a> : <button onClick={() => onNotice(`${title}: ${action}. Live provider integration is not connected.`)}>{title === 'Emergency Transport' ? <PhoneCall size={13} /> : <Shield size={13} />} {action}</button>}</article>)}</div>
  </section>
}
