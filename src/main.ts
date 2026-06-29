import 'leaflet/dist/leaflet.css'
import './style.css'
import { CountryMapView } from './countryMapView'
import type { CountrySelection } from './countryPicker'
import { PlanetScene } from './planetScene'

const SCENE_TRANSITION_MS = 600

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
  private isTransitioning = false

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
    this.resetGlobeView()
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms)
    })
  }

  private resetGlobeView(): void {
    this.planetScene.clearPendingCountryOpen()
    this.countryMapView.hide()
    this.mapViewContainer.hidden = true
    this.mapViewContainer.classList.remove('scene-view--leaving', 'scene-view--entering', 'scene-view--visible')
    this.globeView.hidden = false
    this.globeView.classList.remove('scene-view--leaving', 'scene-view--entering')
    this.globeView.classList.add('scene-view--visible')
    this.planetScene.resume()
  }

  private async showCountryMapAnimated(
    selection: CountrySelection,
    bounds: [[number, number], [number, number]],
  ): Promise<void> {
    if (this.isTransitioning) return
    this.isTransitioning = true

    this.mapViewContainer.hidden = false
    this.mapViewContainer.classList.remove('scene-view--leaving', 'scene-view--visible')
    this.mapViewContainer.classList.add('scene-view--entering')
    this.countryMapView.open(selection, bounds)

    void this.mapViewContainer.offsetHeight

    this.globeView.classList.add('scene-view--leaving')
    this.mapViewContainer.classList.remove('scene-view--entering')
    this.mapViewContainer.classList.add('scene-view--visible')

    await this.wait(SCENE_TRANSITION_MS)

    this.planetScene.pause()
    this.globeView.hidden = true
    this.globeView.classList.remove('scene-view--leaving')
    this.isTransitioning = false
  }

  private async showGlobeViewAnimated(): Promise<void> {
    if (this.isTransitioning) return
    this.isTransitioning = true

    this.planetScene.clearPendingCountryOpen()
    this.globeView.hidden = false
    this.globeView.classList.remove('scene-view--leaving', 'scene-view--visible')
    this.globeView.classList.add('scene-view--entering')
    this.planetScene.resume()
    this.planetScene.resetCameraView(SCENE_TRANSITION_MS)

    void this.globeView.offsetHeight

    this.mapViewContainer.classList.add('scene-view--leaving')
    this.globeView.classList.remove('scene-view--entering')
    this.globeView.classList.add('scene-view--visible')

    await this.wait(SCENE_TRANSITION_MS)

    this.countryMapView.hide()
    this.mapViewContainer.hidden = true
    this.mapViewContainer.classList.remove('scene-view--leaving', 'scene-view--visible')
    this.isTransitioning = false
  }

  private speedFromSlider(value: number): number {
    return 0.0002 + (value / 100) * 0.003
  }

  private syncRotationSpeed(): void {
    this.planetScene.setRotationSpeed(
      this.speedFromSlider(Number(this.rotationSpeedInput.value)),
    )
  }

  private handleCountryOpen = async (selection: CountrySelection): Promise<void> => {
    try {
      const bounds = this.planetScene.countryPicker.getCountryBounds(selection.feature)
      await this.showCountryMapAnimated(selection, bounds)
    } catch (error) {
      console.error('Failed to open country map', error)
      this.resetGlobeView()
    }
  }

  private handleBackToGlobe = (): void => {
    void this.showGlobeViewAnimated()
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
