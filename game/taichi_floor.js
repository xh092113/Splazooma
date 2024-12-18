import { emissive } from "three/webgpu"

const taichiFloorTexture = new THREE.TextureLoader().load('/game/assets/material/taichi_base.jpg')
taichiFloorTexture.wrapS = taichiFloorTexture.wrapT = THREE.ClampToEdgeWrapping

const MIN_ACTIVE_INTENSITY = 3.0
const MAX_ACTIVE_INTENSITY = 5.0

class TaichiFloor extends THREE.Mesh {
  constructor(radius) {
    const floorGeometry = new THREE.CircleGeometry(radius*2, 32)
    const floorMaterial = new THREE.MeshBasicMaterial({map: taichiFloorTexture})
    super(floorGeometry, floorMaterial)
    this.rotation.x = -Math.PI / 2
    this.position.y = 0.02

    const buttonEffectGeometry = new THREE.CylinderGeometry(radius / 8.0, radius / 8.0, 0.2, 32, 1)
    buttonEffectGeometry.rotateX(Math.PI / 2)
    const buttonEffectMaterial = new THREE.MeshStandardMaterial({
        color: 0x404000,
        emissive: 0x404000,
        emissiveIntensity: 5,
        transparent: true,
        opacity: 0.8,
    })

    this.button1 = new THREE.Mesh(
        new THREE.CircleGeometry(radius/8.0, 16),
        new THREE.MeshPhysicalMaterial({
            color: 0x808080,
            side: THREE.DoubleSide,
            metalness: 0.0, 
            roughness: 1.0
        })
    )
    this.button1.position.y = -radius
    this.button1.position.z = 0.01
    const buttonEffect1 = new THREE.Mesh(buttonEffectGeometry, buttonEffectMaterial)
    this.button1.add(buttonEffect1)
    this.add(this.button1)

    this.button2 = new THREE.Mesh(
        new THREE.CircleGeometry(radius/8.0, 16),
        new THREE.MeshPhysicalMaterial({
            color: 0x808080,
            side: THREE.DoubleSide,
            metalness: 0.0, 
            roughness: 1.0
        })
    )
    this.button2.position.y = radius
    this.button2.position.z = 0.01
    const buttonEffect2 = new THREE.Mesh(buttonEffectGeometry, buttonEffectMaterial)
    this.button2.add(buttonEffect2)
    this.add(this.button2)
    this.effectActives = [false, false]
    this.activeTimes = [0.0, 0.0]
    this.buttonEffects = [buttonEffect1, buttonEffect2]
  }

  update(deltaTime){
    for (var i = 0; i < this.buttonEffects.length; i++){
        this.activeTimes[i] += deltaTime
        this.buttonEffects[i].material.emissiveIntensity = Math.cos(this.activeTimes[i] * 10.0) * (MAX_ACTIVE_INTENSITY - MIN_ACTIVE_INTENSITY) / 2 + MIN_ACTIVE_INTENSITY
    }
  }

}

export default TaichiFloor
