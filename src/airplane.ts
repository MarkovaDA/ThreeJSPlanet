import * as THREE from 'three'
import { latLngToVector3 } from './geoMath'

const FLIGHT_ALTITUDE = 1.045
const ORBIT_DURATION_S = 3.5
const ORBIT_LAT = 12

export class Airplane {
  private readonly group = new THREE.Group()
  private readonly orbitStartDir = new THREE.Vector3()
  private readonly orbitAxis = new THREE.Vector3(0, 1, 0)
  private readonly position = new THREE.Vector3()
  private readonly nextPos = new THREE.Vector3()
  private readonly tangent = new THREE.Vector3()
  private readonly up = new THREE.Vector3()
  private readonly right = new THREE.Vector3()
  private readonly forward = new THREE.Vector3()
  private readonly rotationMatrix = new THREE.Matrix4()

  private enabled = false
  private progress = 0
  private lastTime = 0

  constructor(parent: THREE.Object3D) {
    this.orbitStartDir.copy(latLngToVector3(ORBIT_LAT, 0, 1)).normalize()

    this.group.add(this.createAirplaneMesh())
    this.group.visible = false
    parent.add(this.group)
  }

  setEnabled(value: boolean): void {
    this.enabled = value
    this.group.visible = value

    if (value) {
      this.progress = 0
      this.lastTime = performance.now()
      this.updateTransform(0)
    }
  }

  update(): void {
    if (!this.enabled) return

    const now = performance.now()
    const delta = this.lastTime === 0 ? 0 : (now - this.lastTime) / 1000
    this.lastTime = now

    this.progress += delta / ORBIT_DURATION_S
    if (this.progress >= 1) {
      this.progress -= 1
    }

    this.updateTransform(this.progress)
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        const { material } = child
        if (Array.isArray(material)) {
          material.forEach((entry) => entry.dispose())
        } else {
          material.dispose()
        }
      }
    })
    this.group.removeFromParent()
  }

  private updateTransform(t: number): void {
    const angle = t * Math.PI * 2
    const lookAhead = angle + 0.1

    this.position
      .copy(this.orbitStartDir)
      .applyAxisAngle(this.orbitAxis, angle)
      .multiplyScalar(FLIGHT_ALTITUDE)
    this.group.position.copy(this.position)

    this.nextPos
      .copy(this.orbitStartDir)
      .applyAxisAngle(this.orbitAxis, lookAhead)
      .multiplyScalar(FLIGHT_ALTITUDE)

    this.tangent.copy(this.nextPos).sub(this.position).normalize()

    this.up.copy(this.position).normalize()
    this.right.crossVectors(this.up, this.tangent).normalize()
    this.forward.crossVectors(this.right, this.up).normalize()

    const negRight = this.right.clone().negate()
    this.rotationMatrix.makeBasis(this.forward, this.up, negRight)
    this.group.quaternion.setFromRotationMatrix(this.rotationMatrix)

    const bank = Math.sin(angle * 2) * 0.12
    this.group.rotateZ(bank)
  }

  private createAirplaneMesh(): THREE.Group {
    const plane = new THREE.Group()

    const hull = new THREE.MeshPhongMaterial({
      color: 0xf8fafc,
      emissive: 0x0f172a,
      emissiveIntensity: 0.15,
      shininess: 90,
      specular: 0x94a3b8,
    })
    const wing = new THREE.MeshPhongMaterial({
      color: 0x2563eb,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.25,
      shininess: 70,
      specular: 0x60a5fa,
    })
    const accent = new THREE.MeshPhongMaterial({
      color: 0x38bdf8,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.35,
      shininess: 80,
    })
    const glass = new THREE.MeshPhongMaterial({
      color: 0x1e3a5f,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.4,
      shininess: 120,
      transparent: true,
      opacity: 0.88,
    })
    const engine = new THREE.MeshPhongMaterial({
      color: 0x475569,
      emissive: 0x1e293b,
      emissiveIntensity: 0.2,
      shininess: 50,
    })

    const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.042, 6, 16), hull)
    fuselage.rotation.z = Math.PI / 2
    plane.add(fuselage)

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.0055, 0.016, 12), hull)
    nose.rotation.z = -Math.PI / 2
    nose.position.x = 0.036
    plane.add(nose)

    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.0052, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
      glass,
    )
    cockpit.rotation.z = -Math.PI / 2
    cockpit.position.set(0.022, 0.0032, 0)
    plane.add(cockpit)

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.0068, 0.0072), accent)
    stripe.position.set(-0.002, 0.0005, 0)
    plane.add(stripe)

    const wings = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.0014, 0.038), wing)
    wings.position.set(-0.003, -0.0012, 0)
    wings.rotation.set(0.1, 0.14, 0.06)
    plane.add(wings)

    const wingTipLeft = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0018, 0.006), accent)
    wingTipLeft.position.set(0.004, -0.001, 0.02)
    wingTipLeft.rotation.set(0.1, 0.14, 0.06)
    plane.add(wingTipLeft)

    const wingTipRight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0018, 0.006), accent)
    wingTipRight.position.set(0.004, -0.001, -0.02)
    wingTipRight.rotation.set(0.1, 0.14, 0.06)
    plane.add(wingTipRight)

    const engineLeft = new THREE.Mesh(new THREE.CapsuleGeometry(0.0028, 0.011, 4, 8), engine)
    engineLeft.rotation.z = Math.PI / 2
    engineLeft.position.set(-0.001, -0.0055, 0.013)
    plane.add(engineLeft)

    const engineRight = new THREE.Mesh(new THREE.CapsuleGeometry(0.0028, 0.011, 4, 8), engine)
    engineRight.rotation.z = Math.PI / 2
    engineRight.position.set(-0.001, -0.0055, -0.013)
    plane.add(engineRight)

    const intakeLeft = new THREE.Mesh(new THREE.TorusGeometry(0.0028, 0.0007, 6, 12), accent)
    intakeLeft.rotation.y = Math.PI / 2
    intakeLeft.position.set(0.006, -0.0055, 0.013)
    plane.add(intakeLeft)

    const intakeRight = new THREE.Mesh(new THREE.TorusGeometry(0.0028, 0.0007, 6, 12), accent)
    intakeRight.rotation.y = Math.PI / 2
    intakeRight.position.set(0.006, -0.0055, -0.013)
    plane.add(intakeRight)

    const verticalTail = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.024, 0.0016), wing)
    verticalTail.position.set(-0.033, 0.013, 0)
    verticalTail.rotation.z = -0.32
    plane.add(verticalTail)

    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.012, 0.0012), accent)
    tailFin.position.set(-0.029, 0.019, 0)
    tailFin.rotation.z = -0.32
    plane.add(tailFin)

    const horizontalTail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.0012, 0.017), wing)
    horizontalTail.position.set(-0.035, 0.0035, 0)
    horizontalTail.rotation.y = 0.18
    plane.add(horizontalTail)

    plane.scale.setScalar(1.15)
    return plane
  }
}
