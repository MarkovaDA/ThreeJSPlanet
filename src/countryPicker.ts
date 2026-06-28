import centroid from '@turf/centroid'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import {
  applyLabelColor,
  colorFromCountryId,
  pushColor,
} from './countryColors'
import { latLngToVector3 } from './geoMath'

const COUNTRIES_URL =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson'

const BORDER_RADIUS = 1.009
const LABEL_RADIUS = 1.018

export class CountryPicker {
  private readonly parent: THREE.Object3D
  private readonly layerGroup = new THREE.Group()
  private readonly labelObjects: CSS2DObject[] = []

  private countries: Feature<Polygon | MultiPolygon>[] = []
  private built = false
  private visible = false

  private borders: THREE.LineSegments | null = null
  private borderMaterial: THREE.LineBasicMaterial | null = null

  constructor(parent: THREE.Object3D) {
    this.parent = parent
    this.layerGroup.visible = false
    this.parent.add(this.layerGroup)
  }

  async load(): Promise<void> {
    const response = await fetch(COUNTRIES_URL)
    if (!response.ok) {
      throw new Error(`Failed to load countries GeoJSON: ${response.status}`)
    }

    const data = (await response.json()) as FeatureCollection<Polygon | MultiPolygon>
    this.countries = data.features.filter(
      (feature) =>
        feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon',
    )

    this.buildLayer()
  }

  setShowAllCountries(show: boolean): void {
    this.visible = show
    this.layerGroup.visible = show
    for (const label of this.labelObjects) {
      label.visible = show
    }
  }

  update(camera: THREE.Camera): void {
    if (!this.visible) return
    this.updateLabelVisibility(camera)
  }

  dispose(): void {
    for (const label of this.labelObjects) {
      this.parent.remove(label)
      label.element.remove()
    }
    this.labelObjects.length = 0

    if (this.borders) {
      this.layerGroup.remove(this.borders)
      this.borders.geometry.dispose()
      this.borders = null
    }

    this.borderMaterial?.dispose()
    this.borderMaterial = null

    this.parent.remove(this.layerGroup)
    this.countries = []
    this.built = false
  }

  private buildLayer(): void {
    if (this.built) return

    this.borderMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    })

    const borderGeometry = this.buildBordersGeometry()
    this.borders = new THREE.LineSegments(borderGeometry, this.borderMaterial)

    this.layerGroup.add(this.borders)
    this.buildLabels()
    this.built = true
    this.layerGroup.visible = this.visible
  }

  private buildBordersGeometry(): THREE.BufferGeometry {
    const positions: number[] = []
    const colors: number[] = []

    const addRing = (ring: number[][], color: THREE.Color) => {
      if (ring.length < 2) return

      for (let i = 0; i < ring.length; i += 1) {
        const [lngA, latA] = ring[i]
        const [lngB, latB] = ring[(i + 1) % ring.length]
        const a = latLngToVector3(latA, lngA, BORDER_RADIUS)
        const b = latLngToVector3(latB, lngB, BORDER_RADIUS)
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
        pushColor(colors, color, 2)
      }
    }

    for (const feature of this.countries) {
      const color = colorFromCountryId(this.getCountryId(feature))
      const polygons =
        feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates

      for (const polygon of polygons) {
        addRing(polygon[0], color)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return geometry
  }

  private buildLabels(): void {
    for (const feature of this.countries) {
      const name = this.getCountryName(feature)
      if (!name || name === 'Unknown') continue

      const color = colorFromCountryId(this.getCountryId(feature))
      const center = centroid(feature)
      const [lng, lat] = center.geometry.coordinates
      const position = latLngToVector3(lat, lng, LABEL_RADIUS)

      const element = document.createElement('span')
      element.className = 'country-tag'
      element.textContent = name
      applyLabelColor(element, color)

      const label = new CSS2DObject(element)
      label.position.copy(position)
      label.visible = this.visible
      this.parent.add(label)
      this.labelObjects.push(label)
    }
  }

  private updateLabelVisibility(camera: THREE.Camera): void {
    const cameraPosition = new THREE.Vector3()
    camera.getWorldPosition(cameraPosition)

    for (const label of this.labelObjects) {
      const labelPosition = new THREE.Vector3()
      label.getWorldPosition(labelPosition)

      const normal = labelPosition.clone().normalize()
      const toCamera = cameraPosition.clone().sub(labelPosition).normalize()
      label.visible = normal.dot(toCamera) > 0.2
    }
  }

  private getCountryId(feature: Feature): string {
    const properties = feature.properties ?? {}
    return String(properties.ISO_A3 ?? properties.ADM0_A3 ?? properties.NAME ?? properties.name ?? '')
  }

  private getCountryName(feature: Feature): string {
    const properties = feature.properties ?? {}
    return (
      properties.NAME ??
      properties.ADMIN ??
      properties.name ??
      properties.NAME_EN ??
      'Unknown'
    )
  }
}
