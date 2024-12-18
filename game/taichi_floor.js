const taichiFloorTexture = new THREE.TextureLoader().load('/game/assets/material/taichi_base.jpg')
taichiFloorTexture.wrapS = taichiFloorTexture.wrapT = THREE.ClampToEdgeWrapping

const MIN_ACTIVE_INTENSITY = 0.0
const MAX_ACTIVE_INTENSITY = 5.0

class TaichiFloor extends THREE.Mesh {
  constructor(game, radius) {
    const floorGeometry = new THREE.CircleGeometry(radius*2, 32)
    const floorMaterial = new THREE.MeshBasicMaterial({map: taichiFloorTexture})
    super(floorGeometry, floorMaterial)
    this.game = game
    this.radius = radius
    this.rotation.x = -Math.PI / 2
    this.position.y = 0.02

    const buttonEffectGeometry = new THREE.CylinderGeometry(radius / 8.0, radius / 8.0, 0.2, 32, 1)
    buttonEffectGeometry.rotateX(Math.PI / 2)
    this.buttonRaidus = radius / 8.0
    this.buttonNum = 2
    this.buttonPositionY = [-radius, radius]
    this.buttons = []
    this.buttonEffects = []
    this.buttonCounts = []
    this.buttonCenters = []

    for (var i = 0; i < this.buttonNum; i++){
      const buttonEffectMaterial = new THREE.MeshStandardMaterial({
          color: 0x404000,
          emissive: 0x404000,
          emissiveIntensity: 0.0,
          transparent: true,
          opacity: 0.8,
      })
      const button = new THREE.Mesh(
          new THREE.CircleGeometry(this.buttonRaidus, 16),
          new THREE.MeshPhysicalMaterial({
              color: 0x808080,
              side: THREE.DoubleSide,
              metalness: 0.0, 
              roughness: 1.0
          })
      )
      button.position.y = this.buttonPositionY[i]
      button.position.z = 0.01
      const buttonEffect = new THREE.Mesh(buttonEffectGeometry, buttonEffectMaterial)
      button.add(buttonEffect)
      this.add(button)
      this.buttons.push(button)
      this.buttonEffects.push(buttonEffect)
      this.buttonCounts.push(0)
      this.buttonCenters.push(new THREE.Vector3(0.0, 0.01, -this.buttonPositionY[i]))
    }

    this.effectActives = [false, false]
    this.effectPressed = [null, null]
    this.activeTimes = [0.0, 0.0]

    this.buttonCount1 = 0
    this.buttonCount2 = 0
  }

  reset(){
    for (var i = 0; i < this.buttonEffects.length; i++){
      this.buttonCounts[i] = 0
      this.effectActives[i] = false
      this.effectPressed[i] = null
      this.buttonEffects[i].material.color.set(0x404000)
      this.buttonEffects[i].material.emissive.set(0x404000)
      this.buttonEffects[i].material.emissiveIntensity = 0.0
    }
  }

  update(deltaTime){
    // console.log(this.buttonCounts, this.effectActives, this.effectPressed)
    for (var i = 0; i < this.buttonEffects.length; i++){
      if (this.effectActives[i] && this.effectPressed[i] == null){
        this.activeTimes[i] += deltaTime
        this.buttonEffects[i].material.emissiveIntensity = Math.sin(this.activeTimes[i] * 10.0) * (MAX_ACTIVE_INTENSITY - MIN_ACTIVE_INTENSITY) / 2 + MIN_ACTIVE_INTENSITY
      }
      else if (this.effectActives[i] && this.effectPressed[i] != null){
        this.buttonEffects[i].material.emissiveIntensity = MAX_ACTIVE_INTENSITY
      }
      else{
        this.buttonEffects[i].material.emissiveIntensity = 0.0
      }
    }
  }

  setCount(id, cnt){
    this.buttonCounts[id] = cnt
    this.effectActives[id] = (this.buttonCounts[id] >= 3)
  }

  updateCount(id){
    this.setCount(id, this.buttonCounts[id] + 1)
    this.buttonCounts[id] += 1
  }

  updatePress(id, state, pressId){
    if (this.effectActives[id]){
      if (state && this.effectPressed[id] == null){
        this.effectPressed[id] = pressId
        this.buttonEffects[id].material.color.set(0x008000)
        this.buttonEffects[id].material.emissive.set(0x008000)
        this.game.playAudio('/game/assets/sound/reverse_explosion.ogg')
      }
      else if (!state && this.effectPressed[id] != null){
        this.buttonEffects[id].material.color.set(0x404000)
        this.buttonEffects[id].material.emissive.set(0x404000)
        this.releaseSuperBullet(id)
      }
    }
  }

  releaseSuperBullet(id){
    console.log("Super!")
    this.setCount(id, 0)
    this.game.playAudio('/game/assets/sound/cherrybomb.ogg')
    this.game.createSuperBullet(this.buttonCenters[id].clone().add(new THREE.Vector3(0, 5, 0)), this.effectPressed[id])
    this.effectPressed[id] = null
  }

}

export default TaichiFloor
