import './style.css'
import { PlanetScene } from './planetScene'

class App {
  private readonly canvas: HTMLCanvasElement
  private readonly autoRotateInput: HTMLInputElement
  private readonly rotationSpeedInput: HTMLInputElement
  private readonly showCountriesInput: HTMLInputElement
  private planetScene: PlanetScene

  constructor() {
    const canvas = document.querySelector<HTMLCanvasElement>('#canvas')
    const autoRotateInput = document.querySelector<HTMLInputElement>('#auto-rotate')
    const rotationSpeedInput = document.querySelector<HTMLInputElement>('#rotation-speed')
    const showCountriesInput = document.querySelector<HTMLInputElement>('#show-countries')

    if (!canvas || !autoRotateInput || !rotationSpeedInput || !showCountriesInput) {
      throw new Error('Required DOM elements are missing')
    }

    this.canvas = canvas
    this.autoRotateInput = autoRotateInput
    this.rotationSpeedInput = rotationSpeedInput
    this.showCountriesInput = showCountriesInput
    this.planetScene = new PlanetScene({ canvas: this.canvas })

    this.bindEvents()
    this.syncRotationSpeed()
    this.planetScene.setShowCountries(this.showCountriesInput.checked)
  }

  private speedFromSlider(value: number): number {
    return 0.0002 + (value / 100) * 0.003
  }

  private syncRotationSpeed(): void {
    this.planetScene.setRotationSpeed(
      this.speedFromSlider(Number(this.rotationSpeedInput.value)),
    )
  }

  private bindEvents(): void {
    this.autoRotateInput.addEventListener('change', this.handleAutoRotateChange)
    this.rotationSpeedInput.addEventListener('input', this.handleRotationSpeedChange)
    this.showCountriesInput.addEventListener('change', this.handleShowCountriesChange)
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

  private handleBeforeUnload = (): void => {
    this.dispose()
  }

  private dispose(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
    this.autoRotateInput.removeEventListener('change', this.handleAutoRotateChange)
    this.rotationSpeedInput.removeEventListener('input', this.handleRotationSpeedChange)
    this.showCountriesInput.removeEventListener('change', this.handleShowCountriesChange)
    this.planetScene.dispose()
  }
}

new App()
