import * as THREE from 'three'

export interface LatLng {
  lat: number
  lng: number
}

/**
 * Matches Three.js SphereGeometry parametric layout used by the globe mesh.
 * See: x = -r·sin(φ)·cos(θ), y = r·cos(φ), z = r·sin(φ)·sin(θ)
 * with φ = colatitude from north pole, θ = (lng + 180°) in radians.
 */
export function vector3ToLatLng(vector: THREE.Vector3): LatLng {
  const n = vector.clone().normalize()
  const lat =
    Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)) * (180 / Math.PI)
  const theta = Math.atan2(n.z, -n.x)
  const lng = (theta * 180) / Math.PI - 180
  return { lat, lng }
}

export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lng + 180) * Math.PI) / 180

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}
