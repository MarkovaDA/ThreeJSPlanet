import * as THREE from 'three'

export interface LatLng {
  lat: number
  lng: number
}

export function vector3ToLatLng(vector: THREE.Vector3): LatLng {
  const normalized = vector.clone().normalize()
  const lat =
    Math.asin(THREE.MathUtils.clamp(normalized.y, -1, 1)) * (180 / Math.PI)
  const lng = Math.atan2(normalized.x, normalized.z) * (180 / Math.PI)
  return { lat, lng }
}

export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180
  const cosLat = Math.cos(latRad)

  return new THREE.Vector3(
    cosLat * Math.sin(lngRad) * radius,
    Math.sin(latRad) * radius,
    cosLat * Math.cos(lngRad) * radius,
  )
}
