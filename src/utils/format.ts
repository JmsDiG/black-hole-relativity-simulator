export function formatSeconds(value: number) {
  if (Math.abs(value) < 1e-3) {
    return `${(value * 1e6).toFixed(2)} µs`
  }

  if (Math.abs(value) < 1) {
    return `${(value * 1e3).toFixed(2)} ms`
  }

  if (Math.abs(value) < 120) {
    return `${value.toFixed(2)} s`
  }

  return `${(value / 60).toFixed(2)} min`
}

export function formatFactor(value: number) {
  return `${value.toFixed(3)}×`
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

export function formatDistanceRs(value: number) {
  return `${value.toFixed(2)} Rs`
}
