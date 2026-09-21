import { useEffect, useRef, useState } from 'react'
import { ArrowRight, MapPin, Navigation, Search } from 'lucide-react'
import { searchLocations } from '../services/openMap'

export default function RouteSearch({ start, destination, setStart, setDestination, onSearch, onLocate, loading }) {
  const [suggestions, setSuggestions] = useState({ field: '', items: [] })
  const timer = useRef(null)
  const lookup = (field, value) => {
    field === 'start' ? setStart(value) : setDestination(value)
    clearTimeout(timer.current)
    if (value.trim().length < 3) return setSuggestions({ field, items: [] })
    timer.current = setTimeout(async () => {
      try { setSuggestions({ field, items: await searchLocations(value) }) } catch { setSuggestions({ field, items: [] }) }
    }, 350)
  }
  const choose = (field, item) => {
    const value = item.display_name
    field === 'start' ? setStart(value) : setDestination(value)
    setSuggestions({ field: '', items: [] })
  }
  const input = (field, value) => <div className="autocomplete-wrap"><input value={value} onChange={(e) => lookup(field, e.target.value)} onFocus={() => value.length >= 3 && lookup(field, value)} placeholder="Search a city, address or landmark" />{suggestions.field === field && suggestions.items.length > 0 && <div className="suggestions">{suggestions.items.map((item) => <button type="button" key={item.place_id} onMouseDown={() => choose(field, item)}>{item.display_name}</button>)}</div>}</div>

  return <section className="search-card">
    <div className="eyebrow">PLAN YOUR JOURNEY</div>
    <h1>Know the road<br /><em>before you go.</em></h1>
    <p className="muted">Check real-world signals, weather and history to make a more informed journey.</p>
    <div className="route-inputs">
      <label><span><MapPin size={16} /> Starting location</span>{input('start', start)}</label>
      <button className="swap"><ArrowRight size={16} /></button>
      <label><span><Navigation size={16} /> Destination</span>{input('destination', destination)}</label>
    </div>
    <div className="search-actions"><button className="secondary-button" onClick={onLocate}><Navigation size={16} /> Use my location</button><button className="primary-button" onClick={onSearch} disabled={loading}><Search size={17} /> {loading ? 'Checking route…' : 'Check route safety'}</button></div>
  </section>
}
