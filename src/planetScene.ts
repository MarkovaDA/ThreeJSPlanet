import * as THREE from 'three'
import centroid from '@turf/centroid'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { CountryPicker, type CountrySelection } from './countryPicker'
import { latLngToVector3, vector3ToLatLng } from './geoMath'
 
const TEXTURE_BASE = 'https://threejs.org/examples/textures/planets/'
const SPHERE_SEGMENTS = 128
const CLICK_MOVE_THRESHOLD_PX = 6
const COUNTRY_OPEN_DELAY_MS = 750
const COUNTRY_FOCUS_DISTANCE = 1.72

export interface PlanetSceneOptions {
  canvas: HTMLCanvasElement
  onLoadProgress?: (loaded: number, total: number) => void
  onCountryOpen?: (selection: CountrySelection) => void
}

class Starfield {
  readonly object: THREE.Points

  constructor(count = 3500) {
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i += 1) {
      const radius = 40 + Math.random() * 80
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.12,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    })

    this.object = new THREE.Points(geometry, material)
  }

  dispose(): void {
    this.object.geometry.dispose()
    ;(this.object.material as THREE.Material).dispose()
  }
}

export class PlanetScene {
  private readonly canvas: HTMLCanvasElement
  private readonly onCountryOpen?: (selection: CountrySelection) => void
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly labelRenderer: CSS2DRenderer
  private readonly controls: OrbitControls
  private readonly earth: THREE.Mesh
  private readonly clouds: THREE.Mesh
  private readonly starfield: Starfield
  readonly countryPicker: CountryPicker
  private readonly textures: THREE.Texture[]
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly localIntersection = new THREE.Vector3()

  private autoRotate = false
  private rotationSpeed = 0.0012
  private frameId = 0
  private active = true
  private countriesReady = false
  private pointerDownX = 0
  private pointerDownY = 0
  private countryOpenTimer = 0
  private focusAnimationId = 0
  private readonly defaultCameraPosition = new THREE.Vector3()
  private readonly defaultControlsTarget = new THREE.Vector3()

  constructor({ canvas, onLoadProgress, onCountryOpen }: PlanetSceneOptions) {
    this.canvas = canvas
    this.onCountryOpen = onCountryOpen
    this.scene = new THREE.Scene()
    this.textures = []

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200)
    this.camera.position.set(0, 0.15, 2.8)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    this.renderer.setClearColor(0x020617, 1)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3))

    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.domElement.className = 'country-labels-layer'
    canvas.parentElement?.appendChild(this.labelRenderer.domElement)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.minDistance = 1.6
    this.controls.maxDistance = 6
    this.controls.autoRotate = false

    this.starfield = new Starfield()
    this.scene.add(this.starfield.object)

    const { earth, clouds } = this.createPlanetMeshes(onLoadProgress)
    this.earth = earth
    this.clouds = clouds
    this.scene.add(this.earth, this.clouds)

    this.countryPicker = new CountryPicker(this.earth)
    void this.loadCountries()

    this.setupLights()
    this.bindPointerEvents()
    this.resize()
    this.defaultCameraPosition.copy(this.camera.position)
    this.defaultControlsTarget.copy(this.controls.target)
    window.addEventListener('resize', this.handleResize)
    this.animate()
  }

  setAutoRotate(value: boolean): void {
    this.autoRotate = value
  }

  setRotationSpeed(value: number): void {
    this.rotationSpeed = value
  }

  setShowCountries(value: boolean): void {
    this.countryPicker.setShowAllCountries(value)
  }

  pause(): void {
    this.active = false
    this.labelRenderer.domElement.style.display = 'none'
  }

  resume(): void {
    this.active = true
    this.labelRenderer.domElement.style.display = ''
    this.resize()
  }

  clearPendingCountryOpen(): void {
    window.clearTimeout(this.countryOpenTimer)
    this.countryOpenTimer = 0
    this.cancelFocusAnimation()
    this.countryPicker.clearSelectionHighlight()
  }

  resetCameraView(duration = 600): void {
    this.animateCameraTo(
      this.defaultControlsTarget,
      this.defaultCameraPosition,
      duration,
    )
  }

  dispose(): void {
    this.clearPendingCountryOpen()
    this.cancelFocusAnimation()
    window.cancelAnimationFrame(this.frameId)
    window.removeEventListener('resize', this.handleResize)
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.countryPicker.dispose()
    this.controls.dispose()
    this.renderer.dispose()
    this.labelRenderer.domElement.remove()
    this.earth.geometry.dispose()
    this.clouds.geometry.dispose()
    ;(this.earth.material as THREE.Material).dispose()
    ;(this.clouds.material as THREE.Material).dispose()
    this.textures.forEach((texture) => texture.dispose())
    this.starfield.dispose()
  }

  private async loadCountries(): Promise<void> {
    try {
      await this.countryPicker.load()
      this.countriesReady = true
    } catch (error) {
      console.error('Failed to load country borders', error)
    }
  }

  private bindPointerEvents(): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown)
    this.canvas.addEventListener('pointerup', this.handlePointerUp)
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.pointerDownX = event.clientX
    this.pointerDownY = event.clientY
  }

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.active || !this.countriesReady) return

    const deltaX = event.clientX - this.pointerDownX
    const deltaY = event.clientY - this.pointerDownY
    if (deltaX * deltaX + deltaY * deltaY > CLICK_MOVE_THRESHOLD_PX * CLICK_MOVE_THRESHOLD_PX) {
      return
    }

    this.openCountryAtPointer(event)
  }

  private openCountryAtPointer(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObject(this.earth, false)
    if (hits.length === 0) return

    this.localIntersection.copy(this.earth.worldToLocal(hits[0].point.clone()))
    const latLng = vector3ToLatLng(this.localIntersection)
    const selection = this.countryPicker.pickCountry(latLng)
    if (!selection) return

    this.countryPicker.highlightSelection(selection)
    this.focusOnCountry(selection)
    window.clearTimeout(this.countryOpenTimer)
    this.countryOpenTimer = window.setTimeout(() => {
      this.countryPicker.clearSelectionHighlight()
      this.onCountryOpen?.(selection)
    }, COUNTRY_OPEN_DELAY_MS)
  }

  private createPlanetMeshes(
    onLoadProgress?: (loaded: number, total: number) => void,
  ): { earth: THREE.Mesh; clouds: THREE.Mesh } {
    const loadingManager = new THREE.LoadingManager()
    if (onLoadProgress) {
      loadingManager.onProgress = (_url, loaded, total) => {
        onLoadProgress(loaded, total)
      }
    }

    const loader = new THREE.TextureLoader(loadingManager)
    const earthMap = loader.load(`${TEXTURE_BASE}earth_atmos_2048.jpg`)
    const earthNormal = loader.load(`${TEXTURE_BASE}earth_normal_2048.jpg`)
    const earthSpecular = loader.load(`${TEXTURE_BASE}earth_specular_2048.jpg`)
    const cloudsMap = loader.load(`${TEXTURE_BASE}earth_clouds_1024.png`)

    this.textures.push(earthMap, earthNormal, earthSpecular, cloudsMap)
    this.configureColorTexture(earthMap)
    this.configureDataTexture(earthNormal)
    this.configureDataTexture(earthSpecular)
    this.configureColorTexture(cloudsMap)

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
      new THREE.MeshPhongMaterial({
        map: earthMap,
        normalMap: earthNormal,
        specularMap: earthSpecular,
        specular: new THREE.Color(0x333333),
        shininess: 18,
      }),
    )

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.012, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
      new THREE.MeshPhongMaterial({
        map: cloudsMap,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      }),
    )

    return { earth, clouds }
  }

  private configureColorTexture(texture: THREE.Texture): void {
    texture.colorSpace = THREE.SRGBColorSpace
    this.applySharpTextureSettings(texture)
  }

  private configureDataTexture(texture: THREE.Texture): void {
    texture.colorSpace = THREE.NoColorSpace
    this.applySharpTextureSettings(texture)
  }

  private applySharpTextureSettings(texture: THREE.Texture): void {
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.55)
    const sun = new THREE.DirectionalLight(0xffffff, 1.35)
    sun.position.set(5, 1.5, 3)
    this.scene.add(ambient, sun)
  }

  private handleResize = (): void => {
    this.resize()
  }

  private resize(): void {
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    if (width === 0 || height === 0) return

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    this.labelRenderer.setSize(width, height)
  }

  private animate = (): void => {
    this.frameId = window.requestAnimationFrame(this.animate)
    if (!this.active) return

    if (this.autoRotate) {
      this.earth.rotation.y += this.rotationSpeed
      this.clouds.rotation.y += this.rotationSpeed * 1.12
    }

    this.countryPicker.update(this.camera)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.labelRenderer.render(this.scene, this.camera)
  }

  private focusOnCountry(selection: CountrySelection): void {
    const center = centroid(selection.feature)
    const [lng, lat] = center.geometry.coordinates
    const target = latLngToVector3(lat, lng, 1)

    const offset = this.camera.position.clone().sub(this.controls.target)
    if (offset.lengthSq() === 0) {
      offset.set(0, 0, 1)
    }

    const endPosition = target
      .clone()
      .add(offset.normalize().multiplyScalar(COUNTRY_FOCUS_DISTANCE))

    this.animateCameraTo(target, endPosition, COUNTRY_OPEN_DELAY_MS)
  }

  private animateCameraTo(
    target: THREE.Vector3,
    position: THREE.Vector3,
    duration: number,
  ): void {
    this.cancelFocusAnimation()

    const startTarget = this.controls.target.clone()
    const startPosition = this.camera.position.clone()
    const startTime = performance.now()

    const step = (): void => {
      const progress = Math.min((performance.now() - startTime) / duration, 1)
      const eased = progress * progress * (3 - 2 * progress)

      this.controls.target.lerpVectors(startTarget, target, eased)
      this.camera.position.lerpVectors(startPosition, position, eased)
      this.controls.update()

      if (progress < 1) {
        this.focusAnimationId = window.requestAnimationFrame(step)
      }
    }

    this.focusAnimationId = window.requestAnimationFrame(step)
  }

  private cancelFocusAnimation(): void {
    window.cancelAnimationFrame(this.focusAnimationId)
    this.focusAnimationId = 0
  }
}
