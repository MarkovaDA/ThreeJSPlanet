import * as THREE from 'three'

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function colorFromCountryId(id: string): THREE.Color {
  const hash = hashString(id)
  const hue = ((hash * 137.508) % 360) / 360
  const saturation = 0.58 + (hash % 27) / 100
  const lightness = 0.42 + (hash % 18) / 100
  return new THREE.Color().setHSL(hue, saturation, lightness)
}

export function applyLabelColor(element: HTMLElement, color: THREE.Color): void {
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)

  const hue = Math.round(hsl.h * 360)
  const sat = Math.round(Math.min(hsl.s * 100 + 12, 100))
  const light = Math.round(Math.min(hsl.l * 100 + 32, 90))

  element.style.borderColor = `hsla(${hue}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%, 0.75)`
  element.style.color = `hsl(${hue}, ${sat}%, ${light}%)`
  element.style.textShadow = `0 0 8px hsla(${hue}, ${sat}%, ${light}%, 0.55)`
}

export function pushColor(colors: number[], color: THREE.Color, times = 1): void {
  for (let i = 0; i < times; i += 1) {
    colors.push(color.r, color.g, color.b)
  }
}
