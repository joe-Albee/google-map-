export function analyzeRoute(incidents, weather, start = 'Chennai', destination = 'Ooty') {
  const nearby = incidents.filter((item) => ['landslide', 'flood', 'road_accident', 'rockslide'].includes(item.type))
  const counts = nearby.reduce((acc, item) => ({ ...acc, [item.type]: (acc[item.type] || 0) + 1 }), {})
  const reasons = []
  let score = 0
  if (weather.rainProbability >= 60) { score += 2; reasons.push('Heavy rainfall detected along the route') }
  if (counts.landslide || counts.rockslide) { const total = (counts.landslide || 0) + (counts.rockslide || 0); score += total; reasons.push(`${total} historical landslide or rockslide incident${total > 1 ? 's' : ''} near route`) }
  if (counts.flood) { score += counts.flood; reasons.push(`${counts.flood} historical flood incident${counts.flood > 1 ? 's' : ''} near route`) }
  if (counts.road_accident) { score += counts.road_accident; reasons.push(`${counts.road_accident} historical road accident${counts.road_accident > 1 ? 's' : ''} near route`) }
  const level = score >= 6 ? 'HIGH' : score >= 3 ? 'MEDIUM' : 'LOW'
  return { level, reasons: reasons.length ? reasons : ['No significant historical or current risk signals found'], counts, nearby, start, destination }
}
