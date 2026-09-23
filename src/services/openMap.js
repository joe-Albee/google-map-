const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const PHOTON_URL = 'https://photon.komoot.io/api'
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'
const OVERPASS_URLS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast'
const ROUTE_CORRIDOR_KM = 10
const INCIDENT_CACHE_KEY = 'saferoute-historical-geocodes-v1'

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('Open map service request failed')
  return response.json()
}

export async function searchLocations(query, signal) {
  if (!query.trim()) return []
  const params = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', limit: '5' })
  try {
    const response = await fetch(`${NOMINATIM_URL}?${params}`, { signal, headers: { Accept: 'application/json' } })
    if (response.ok) return response.json()
  } catch (error) {
    if (error.name === 'AbortError') throw error
  }
  const fallback = await fetch(`${PHOTON_URL}?q=${encodeURIComponent(query)}&limit=5`, { signal, headers: { Accept: 'application/json' } })
  if (!fallback.ok) throw new Error('Failed to fetch locations. Please check your internet connection and try again.')
  const photon = await fallback.json()
  return (photon.features || []).map((feature, index) => {
    const [lng, lat] = feature.geometry.coordinates
    const properties = feature.properties || {}
    return {
      place_id: `photon-${index}-${lat}-${lng}`,
      lat: String(lat),
      lon: String(lng),
      display_name: [properties.name, properties.city || properties.county, properties.state, properties.country].filter(Boolean).join(', '),
      address: properties,
    }
  })
}

export async function geocodeLocation(query) {
  const results = await searchLocations(query)
  if (!results[0]) throw new Error(`Could not find "${query}"`)
  return { lat: Number(results[0].lat), lng: Number(results[0].lon), label: results[0].display_name }
}

export async function getRoute(start, destination) {
  const url = `${OSRM_URL}/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`
  const data = await getJson(url)
  if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No driving route was found between these locations')
  const route = data.routes[0]
  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: `${(route.distance / 1000).toFixed(1)} km`,
    duration: `${Math.round(route.duration / 3600)}h ${Math.round((route.duration % 3600) / 60)}m`,
    traffic: 'Live traffic unavailable',
    start,
    destination,
  }
}

const sampleCoordinates = (coordinates, maxPoints = 8) => {
  const step = Math.max(1, Math.ceil(coordinates.length / maxPoints))
  return coordinates.filter((_, index) => index % step === 0 || index === coordinates.length - 1)
}

const weatherCode = (code) => {
  if (code === 0) return 'Clear'
  if ([1, 2, 3].includes(code)) return 'Cloudy'
  if ([45, 48].includes(code)) return 'Foggy'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow'
  if ([95, 96, 99].includes(code)) return 'Thunderstorm'
  return 'Unknown'
}

export function calculateWeatherSeverity(weather) {
  if (weather.weatherCode >= 95 || weather.visibility < 1000 || weather.precipitation >= 10 || weather.windSpeed >= 60) return 'HIGH_RISK'
  if (weather.precipitation >= 4 || weather.rainProbability >= 60 || weather.visibility < 3000 || weather.windSpeed >= 40) return 'WARNING'
  if (weather.precipitation > 0 || weather.rainProbability >= 30 || weather.visibility < 6000 || weather.windSpeed >= 25) return 'CAUTION'
  return 'NORMAL'
}

export async function getRouteWeather(route) {
  const points = sampleCoordinates(route.coordinates)
  const latitudes = points.map(([lat]) => lat).join(',')
  const longitudes = points.map(([, lng]) => lng).join(',')
  const params = new URLSearchParams({
    latitude: latitudes, longitude: longitudes, current: 'temperature_2m,precipitation,weather_code,wind_speed_10m,visibility',
    hourly: 'precipitation_probability', forecast_days: '1', timezone: 'auto',
  })
  const response = await fetch(`${WEATHER_URL}?${params}`)
  if (!response.ok) throw new Error('Weather data temporarily unavailable')
  const payload = await response.json()
  const results = Array.isArray(payload) ? payload : [payload]
  const weatherPoints = results.map((item, index) => {
    const point = points[index]
    const current = item.current || {}
    const probability = item.hourly?.precipitation_probability?.[0] ?? 0
    const weather = {
      lat: point[0], lng: point[1], temperature: current.temperature_2m, rainProbability: probability,
      precipitation: current.precipitation || 0, windSpeed: current.wind_speed_10m || 0,
      visibility: current.visibility ? current.visibility / 1000 : null, weatherCode: current.weather_code ?? -1,
    }
    return { ...weather, condition: weatherCode(weather.weatherCode), severity: calculateWeatherSeverity(weather), updatedAt: current.time }
  })
  return weatherPoints
}

export async function nameRouteWeatherPoints(points) {
  return Promise.all(points.map(async (point) => {
    try {
      const result = await searchLocations(`${point.lat},${point.lng}`)
      const address = result[0]?.address || {}
      return { ...point, locationName: address.city || address.town || address.village || address.county || 'Route location' }
    } catch {
      return { ...point, locationName: 'Route location' }
    }
  }))
}

export function incidentsNearRoute(incidents, route, corridorKm = ROUTE_CORRIDOR_KM) {
  if (!route?.coordinates?.length) return []
  return incidents.filter((incident) => {
    const nearest = route.coordinates.reduce((distance, point) => Math.min(distance, distanceBetween([incident.lat, incident.lng], point)), Infinity)
    return nearest <= corridorKm
  })
}

export async function hydrateHistoricalIncidents(incidents) {
  const cache = JSON.parse(localStorage.getItem(INCIDENT_CACHE_KEY) || '{}')
  let changed = false
  const hydrated = await Promise.all(incidents.map(async (incident) => {
    if (!incident.geocodeRequired || (Number.isFinite(incident.lat) && Number.isFinite(incident.lng))) return incident
    const cached = cache[incident.id]
    if (cached) return { ...incident, lat: cached.lat, lng: cached.lng, geocodeRequired: false }
    try {
      const point = await geocodeLocation(incident.locationName)
      cache[incident.id] = { lat: point.lat, lng: point.lng }
      changed = true
      return { ...incident, lat: point.lat, lng: point.lng, geocodeRequired: false }
    } catch {
      return incident
    }
  }))
  if (changed) localStorage.setItem(INCIDENT_CACHE_KEY, JSON.stringify(cache))
  return hydrated
}

const emergencyTypes = {
  hospital: 'Hospital',
  police: 'Police station',
  fire_station: 'Fire station',
  clinic: 'Clinic',
  rescue_station: 'Rescue station',
  ambulance_station: 'Ambulance service',
  pharmacy: 'Pharmacy',
}

const distanceBetween = (a, b) => {
  const lat = ((a[0] + b[0]) / 2) * Math.PI / 180
  const dLat = (b[0] - a[0]) * 111.32
  const dLng = (b[1] - a[1]) * 111.32 * Math.cos(lat)
  return Math.sqrt((dLat ** 2) + (dLng ** 2))
}

const routeSamplePoints = (coordinates, spacingKm = 12, maxPoints = 38) => {
  if (coordinates.length <= 2) return coordinates
  const totalDistance = coordinates.slice(1).reduce((total, point, index) => total + distanceBetween(coordinates[index], point), 0)
  const pointCount = Math.min(maxPoints, Math.max(2, Math.ceil(totalDistance / spacingKm) + 1))
  const interval = totalDistance / (pointCount - 1)
  const points = [coordinates[0]]
  let travelled = 0
  let nextPointAt = interval

  for (let index = 1; index < coordinates.length - 1; index += 1) {
    travelled += distanceBetween(coordinates[index - 1], coordinates[index])
    if (travelled >= nextPointAt) {
      points.push(coordinates[index])
      nextPointAt += interval
    }
  }
  points.push(coordinates[coordinates.length - 1])
  return points
}

export async function findEmergencyServices(route, radiusKm = 7) {
  if (!route?.coordinates?.length) return []
  const points = routeSamplePoints(route.coordinates)
  const queries = points.map(([lat, lng]) => {
    const around = `around:${radiusKm * 1000},${lat},${lng}`
    return `nwr(${around})["amenity"~"^(hospital|police|fire_station|ambulance_station|pharmacy|clinic|rescue_station)$"];nwr(${around})["healthcare"~"^(hospital|ambulance_station|pharmacy|clinic)$"];nwr(${around})["emergency"~"^(ambulance_station|rescue_station)$"];`
  })
  const query = `[out:json][timeout:25];(${queries.join('')});out center tags;`
  const request = async (url) => {
    let timeoutId
    try {
      const controller = new AbortController()
      timeoutId = window.setTimeout(() => controller.abort(), 12000)
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        body: new URLSearchParams({ data: query }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      })
      if (!response.ok) throw new Error(`Emergency service returned ${response.status}`)
      const text = await response.text()
      if (!text.trim()) throw new Error('Emergency service returned an empty response')
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed.elements)) throw new Error('Emergency service returned invalid data')
      return parsed
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }
  let data
  try {
    // Use the first successful public endpoint so one slow or rate-limited instance cannot keep the panel loading.
    data = await Promise.any(OVERPASS_URLS.map(request))
  } catch {
    throw new Error('Emergency service search is temporarily unavailable. Please try again.')
  }
  const unique = new Map()
  data.elements.forEach((element) => {
    const lat = element.lat ?? element.center?.lat
    const lng = element.lon ?? element.center?.lon
    const tags = element.tags || {}
    const tag = [tags.amenity, tags.healthcare, tags.emergency].find((value) => emergencyTypes[value])
    if (!lat || !lng || !tag || unique.has(`${element.type}/${element.id}`)) return
    const nearest = route.coordinates.reduce((best, point, index) => {
      const distance = distanceBetween([lat, lng], point)
      return distance < best.distance ? { distance, index } : best
    }, { distance: Infinity, index: 0 })
    const address = tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city'], tags['addr:district'], tags['addr:state'], tags['addr:postcode'], tags['addr:country']].filter(Boolean).join(', ') || 'Not available'
    unique.set(`${element.type}/${element.id}`, {
      id: `${element.type}-${element.id}`, name: tags.name || 'Not available', type: emergencyTypes[tag],
      lat, lng, address, phone: tags.phone || tags['contact:phone'] || 'Not available',
      openingHours: tags.opening_hours || 'Not available', distanceFromRoute: `${nearest.distance.toFixed(1)} km`,
      section: `Near route · ${Math.round((nearest.index / Math.max(route.coordinates.length - 1, 1)) * 100)}%`,
    })
  })
  return [...unique.values()].sort((a, b) => Number.parseFloat(a.distanceFromRoute) - Number.parseFloat(b.distanceFromRoute))
}
