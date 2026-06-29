import type { Feature, MultiPolygon, Polygon } from 'geojson'
import L from 'leaflet'
import { colorFromCountryId } from './countryColors'
import type { CountrySelection } from './countryPicker'

export class CountryMapView {
  private readonly container: HTMLElement
  private readonly mapElement: HTMLElement
  private readonly titleElement: HTMLElement
  private readonly backButton: HTMLButtonElement
  private map: L.Map | null = null
  private countryLayer: L.GeoJSON | null = null
  private onBack: (() => void) | null = null

  constructor(
    container: HTMLElement,
    mapElement: HTMLElement,
    titleElement: HTMLElement,
    backButton: HTMLButtonElement,
  ) {
    this.container = container
    this.mapElement = mapElement
    this.titleElement = titleElement
    this.backButton = backButton
    this.backButton.addEventListener('click', this.handleBack)
  }

  setOnBack(handler: () => void): void {
    this.onBack = handler
  }

  open(selection: CountrySelection, bounds: [[number, number], [number, number]]): void {
    this.titleElement.textContent = selection.name

    const map = this.ensureMap()

    if (this.countryLayer) {
      this.countryLayer.remove()
      this.countryLayer = null
    }

    const color = colorFromCountryId(selection.id)
    const borderColor = color.getStyle()

    this.countryLayer = L.geoJSON(selection.feature as Feature<Polygon | MultiPolygon>, {
      style: {
        color: borderColor,
        weight: 2.5,
        opacity: 0.95,
        fillColor: borderColor,
        fillOpacity: 0.22,
      },
    }).addTo(map)

    requestAnimationFrame(() => {
      map.invalidateSize()
      map.fitBounds(bounds, { padding: [36, 36] })
    })
  }

  hide(): void {
    this.container.hidden = true
  }

  resize(): void {
    if (this.container.hidden || !this.map) return
    this.map.invalidateSize()
  }

  dispose(): void {
    this.backButton.removeEventListener('click', this.handleBack)
    this.countryLayer?.remove()
    this.countryLayer = null
    this.map?.remove()
    this.map = null
  }

  private ensureMap(): L.Map {
    if (this.map) return this.map

    this.map = L.map(this.mapElement, {
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map)

    this.map.setView([20, 0], 2)

    return this.map
  }

  private handleBack = (): void => {
    this.onBack?.()
  }
}
