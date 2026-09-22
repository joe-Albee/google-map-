import { useEffect, useState } from 'react'
import { ArrowUpRight, CheckCircle2, Info, LockKeyhole, ShieldCheck } from 'lucide-react'
import Header from './components/Header'
import RouteSearch from './components/RouteSearch'
import MapView from './components/MapView'
import RouteSummary from './components/RouteSummary'
import WeatherCard from './components/WeatherCard'
import RiskCards from './components/RiskCards'
import IncidentPanel from './components/IncidentPanel'
import EmergencyPanel from './components/EmergencyPanel'
import EmergencySupport from './components/EmergencySupport'
import IncidentExplorer from './components/IncidentExplorer'
import seed from './data/historical_route_incidents_seed.json'
import { analyzeRoute } from './services/riskAnalysis'
import { findEmergencyServices, getRoute, getRouteWeather, geocodeLocation, hydrateHistoricalIncidents, incidentsNearRoute, nameRouteWeatherPoints } from './services/openMap'

export default function App() {
  const [active, setActive] = useState('Home')
  const [start, setStart] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [notice, setNotice] = useState('')
  const [route, setRoute] = useState(null)
  const [startPoint, setStartPoint] = useState(null)
  const [destinationPoint, setDestinationPoint] = useState(null)
  const [emergencyServices, setEmergencyServices] = useState([])
  const [emergencyLoading, setEmergencyLoading] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [weatherPoints, setWeatherPoints] = useState([])
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState('')
  const [historicalIncidents, setHistoricalIncidents] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [feedbackSending, setFeedbackSending] = useState(false)
  useEffect(() => {
    let cancelled = false
    hydrateHistoricalIncidents(seed.incidents).then((records) => {
      if (!cancelled) setHistoricalIncidents(records)
    }).catch(() => {}).finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => { cancelled = true }
  }, [])
  const routeIncidents = incidentsNearRoute(historicalIncidents, route)
  const risk = analyzeRoute(routeIncidents, weatherPoints[0] || { rainProbability: 0 }, start, destination)
  useEffect(() => {
    if (!route) return
    let cancelled = false
    setWeatherLoading(true); setWeatherError(''); setWeatherPoints([])
    getRouteWeather(route).then((points) => nameRouteWeatherPoints(points)).then((points) => {
      if (!cancelled) setWeatherPoints(points)
    }).catch((error) => {
      if (!cancelled) setWeatherError(error.message || 'Weather data temporarily unavailable')
    }).finally(() => { if (!cancelled) setWeatherLoading(false) })
    return () => { cancelled = true }
  }, [route])
  useEffect(() => {
    if (!route) return
    let cancelled = false
    setEmergencyLoading(true)
    findEmergencyServices(route).then((services) => {
      if (!cancelled) setEmergencyServices(services)
    }).catch((error) => {
      if (!cancelled) setNotice(error.message || 'Could not load emergency services along this route.')
    }).finally(() => { if (!cancelled) setEmergencyLoading(false) })
    return () => { cancelled = true }
  }, [route])
  const search = async () => {
    if (!start.trim() || !destination.trim()) return setNotice('Please enter both a starting location and a destination.')
    setLoading(true); setNotice('Finding locations and calculating the route…')
    setRoute(null); setStartPoint(null); setDestinationPoint(null); setEmergencyServices([])
    try {
      const [origin, target] = await Promise.all([
        start === 'My current location' && startPoint ? Promise.resolve(startPoint) : geocodeLocation(start),
        geocodeLocation(destination),
      ])
      const calculated = await getRoute(origin, target)
      setStartPoint(origin); setDestinationPoint(target); setRoute(calculated); setSearched(true); setNotice('')
    } catch (error) { setNotice(error.message || 'Unable to calculate this route. Please try another location.') }
    finally { setLoading(false) }
  }
  const locate = () => { if (!navigator.geolocation) return setNotice('Location services are unavailable. Please enter your starting location manually.'); navigator.geolocation.getCurrentPosition(({ coords }) => { const point = { lat: coords.latitude, lng: coords.longitude, label: 'My current location' }; setCurrentLocation(point); setStart('My current location'); setStartPoint(point); setNotice('Current location added as your starting point. Enter a destination and check the route.') }, () => setNotice('Location permission was denied. You can enter a location manually.')) }
  const sendFeedback = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const email = String(form.get('email') || '').trim()
    const feedbackText = String(form.get('feedback') || '').trim()
    if (!name || !email || !feedbackText) return setNotice('Name, email, and feedback are required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setNotice('Please enter a valid email or Gmail address.')
    const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY
    if (!accessKey) return setNotice('Feedback service is not configured yet.')
    setFeedbackSending(true)
    setNotice('')
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `TourSafe feedback from ${name}`,
          name,
          email,
          message: feedbackText,
          from_name: 'TourSafe Feedback',
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || 'Feedback submission failed.')
      event.currentTarget.reset()
      setNotice('Feedback submitted successfully!')
    } catch (error) {
      setNotice(error.message || 'Unable to send feedback right now. Please try again later.')
    } finally {
      setFeedbackSending(false)
    }
  }
  const navigate = (page) => setActive(page === 'Route Safety' ? 'Home' : page)
  const emergency = () => setActive('Emergency')
  if (active === 'Incidents') return <><Header active={active} onNavigate={navigate} onEmergency={emergency} /><IncidentExplorer /></>
  if (active === 'Feedback') return <><Header active={active} onNavigate={navigate} onEmergency={emergency} /><main className="page-content feedback-page"><div className="section-intro"><div><div className="eyebrow">TOURSAFE FEEDBACK</div><h1>Help us make<br /><em>travel safer.</em></h1><p className="muted">Report incorrect safety information or share feedback about your route experience.</p></div></div><section className="feedback-card feedback-session"><div><div className="eyebrow">REPORT AN ISSUE</div><h2>Send feedback</h2><p>Your feedback will be delivered to our support team.</p></div><form className="feedback-form" onSubmit={sendFeedback}><div className="feedback-fields"><input name="name" type="text" placeholder="Your name" required /><input name="email" type="email" placeholder="Email / Gmail address" required /><textarea name="feedback" placeholder="Describe the issue or feedback…" rows="5" required /></div><button className="primary-button" type="submit" disabled={feedbackSending}><Info size={14} /> {feedbackSending ? 'Sending feedback…' : 'Submit feedback'}</button></form>{notice && <div className="notice"><Info size={16} /> {notice}</div>}</section></main></>
  if (active === 'Emergency') return <><Header active={active} onNavigate={navigate} onEmergency={emergency} /><main className="page-content"><div className="section-intro"><div><div className="eyebrow">EMERGENCY SUPPORT</div><h1>Help is closer<br /><em>than you think.</em></h1><p className="muted">Find nearby services along the selected route, not just at its endpoints.</p></div><div className="emergency-callout"><LockKeyhole size={15} /> {emergencyLoading ? 'Searching along route…' : 'OpenStreetMap data'}</div></div><div className="emergency-layout"><MapView incidents={routeIncidents} showAll start={startPoint} destination={destinationPoint} route={route} emergencyServices={emergencyServices} weatherPoints={weatherPoints} currentLocation={currentLocation} /><EmergencyPanel services={emergencyServices} currentLocation={currentLocation} startPoint={startPoint} /></div><EmergencySupport onNotice={setNotice} />{notice && <div className="notice"><Info size={16} /> {notice}</div>}</main></>
  return <><Header active={active} onNavigate={navigate} onEmergency={emergency} /><main><div className="hero-layout"><RouteSearch start={start} destination={destination} setStart={setStart} setDestination={setDestination} onSearch={search} onLocate={locate} loading={loading} /><div className="hero-aside"><div className="trust-badge"><ShieldCheck size={16} /> ROUTE AWARENESS PLATFORM</div><p>We combine current conditions and reported history to help you make informed travel decisions.</p><div className="source-list"><span><CheckCircle2 size={15} /> Historical context</span><span><CheckCircle2 size={15} /> Weather signals</span><span><CheckCircle2 size={15} /> Reported incidents</span></div></div></div>{notice && <div className="notice"><Info size={16} /> {notice}</div>}{searched && <div className="dashboard"><div className="dashboard-title"><div><div className="eyebrow">LIVE ROUTE CHECK <span className="live-dot" /></div><h2>Your safety overview</h2></div><div className="demo-disclaimer"><Info size={14} /> Live conditions and historical route data</div></div>            <div className="map-summary"><MapView incidents={routeIncidents} start={startPoint} destination={destinationPoint} route={route} emergencyServices={emergencyServices} weatherPoints={weatherPoints} currentLocation={currentLocation} onMarkerClick={(item) => setNotice(`${item.type} near ${item.location}: ${item.description}`)} /><RouteSummary risk={risk} route={route} /></div><div className="content-grid"><div><WeatherCard points={weatherPoints} loading={weatherLoading} error={weatherError} /><RiskCards risk={risk} loading={!route || weatherLoading} /></div><IncidentPanel incidents={risk.nearby} onViewAll={() => setActive('Incidents')} /></div><div className="bottom-grid"><EmergencyPanel compact services={emergencyServices} currentLocation={currentLocation} startPoint={startPoint} /><section className="panel responsible"><div className="panel-heading"><div><div className="eyebrow">OUR PROMISE</div><h2>Awareness, not prediction.</h2></div><ArrowUpRight size={18} /></div><p>SafeRoute highlights available signals and historical reports. Conditions can change quickly — verify with local authorities before travelling.</p><span><ShieldCheck size={16} /> Built for more informed journeys</span></section></div></div>}</main><footer><span><img className="footer-logo" src="/assets/toursafe-logo.jpg" alt="" /> TourSafe</span><span>© 2026 TOUR SAFE. All rights reserved.</span></footer></>
}
