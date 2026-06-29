import 'leaflet/dist/leaflet.css'
import './style.css'
import { CountryMapView } from './countryMapView'
import type { CountrySelection } from './countryPicker'
import { PlanetScene } from './planetScene'

class App {
  private readonly globeView: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly autoRotateInput: HTMLInputElement
  private readonly rotationSpeedInput: HTMLInputElement
  private readonly showCountriesInput: HTMLInputElement
  private readonly mapViewContainer: HTMLElement
  private readonly mapElement: HTMLElement
  private readonly mapTitle: HTMLElement
  private readonly backButton: HTMLButtonElement
  private readonly planetScene: PlanetScene
  private readonly countryMapView: CountryMapView

  constructor() {
    const globeView = document.querySelector<HTMLElement>('#globe-view')
    const canvas = document.querySelector<HTMLCanvasElement>('#canvas')
    const autoRotateInput = document.querySelector<HTMLInputElement>('#auto-rotate')
    const rotationSpeedInput = document.querySelector<HTMLInputElement>('#rotation-speed')
    const showCountriesInput = document.querySelector<HTMLInputElement>('#show-countries')
    const mapViewContainer = document.querySelector<HTMLElement>('#country-map-view')
    const mapElement = document.querySelector<HTMLElement>('#country-map')
    const mapTitle = document.querySelector<HTMLElement>('#country-map-title')
    const backButton = document.querySelector<HTMLButtonElement>('#back-to-globe')

    if (
      !globeView ||
      !canvas ||
      !autoRotateInput ||
      !rotationSpeedInput ||
      !showCountriesInput ||
      !mapViewContainer ||
      !mapElement ||
      !mapTitle ||
      !backButton
    ) {
      throw new Error('Required DOM elements are missing')
    }

    this.globeView = globeView
    this.canvas = canvas
    this.autoRotateInput = autoRotateInput
    this.rotationSpeedInput = rotationSpeedInput
    this.showCountriesInput = showCountriesInput
    this.mapViewContainer = mapViewContainer
    this.mapElement = mapElement
    this.mapTitle = mapTitle
    this.backButton = backButton

    this.planetScene = new PlanetScene({
      canvas: this.canvas,
      onCountryOpen: this.handleCountryOpen,
    })
    this.countryMapView = new CountryMapView(
      this.mapViewContainer,
      this.mapElement,
      this.mapTitle,
      this.backButton,
    )
    this.countryMapView.setOnBack(this.handleBackToGlobe)

    this.bindEvents()
    this.syncRotationSpeed()
    this.planetScene.setShowCountries(this.showCountriesInput.checked)
    this.showGlobeView()
  }

  private showGlobeView(): void {
    this.planetScene.clearPendingCountryOpen()
    this.mapViewContainer.hidden = true
    this.globeView.hidden = false
    this.planetScene.resume()
  }

  private showCountryMap(): void {
    this.planetScene.pause()
    this.globeView.hidden = true
    this.mapViewContainer.hidden = false
  }

  private speedFromSlider(value: number): number {
    return 0.0002 + (value / 100) * 0.003
  }

  private syncRotationSpeed(): void {
    this.planetScene.setRotationSpeed(
      this.speedFromSlider(Number(this.rotationSpeedInput.value)),
    )
  }

  private handleCountryOpen = (selection: CountrySelection): void => {
    try {
      const bounds = this.planetScene.countryPicker.getCountryBounds(selection.feature)
      this.showCountryMap()
      this.countryMapView.open(selection, bounds)
    } catch (error) {
      console.error('Failed to open country map', error)
      this.showGlobeView()
    }
  }

  private handleBackToGlobe = (): void => {
    this.countryMapView.hide()
    this.showGlobeView()
  }

  private bindEvents(): void {
    this.autoRotateInput.addEventListener('change', this.handleAutoRotateChange)
    this.rotationSpeedInput.addEventListener('input', this.handleRotationSpeedChange)
    this.showCountriesInput.addEventListener('change', this.handleShowCountriesChange)
    window.addEventListener('resize', this.handleResize)
    window.addEventListener('beforeunload', this.handleBeforeUnload)
  }

  private handleAutoRotateChange = (): void => {
    this.planetScene.setAutoRotate(this.autoRotateInput.checked)
  }

  private handleRotationSpeedChange = (): void => {
    this.syncRotationSpeed()
  }

  private handleShowCountriesChange = (): void => {
    this.planetScene.setShowCountries(this.showCountriesInput.checked)
  }

  private handleResize = (): void => {
    this.countryMapView.resize()
  }

  private handleBeforeUnload = (): void => {
    this.dispose()
  }

  private dispose(): void {
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
    this.autoRotateInput.removeEventListener('change', this.handleAutoRotateChange)
    this.rotationSpeedInput.removeEventListener('input', this.handleRotationSpeedChange)
    this.showCountriesInput.removeEventListener('change', this.handleShowCountriesChange)
    this.countryMapView.dispose()
    this.planetScene.dispose()
  }
}

new App()
