import { GLTFLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/GLTFLoader.js";

const taichiFloorTexture = new THREE.TextureLoader().load('/game/assets/material/taichi_base.jpg')
taichiFloorTexture.wrapS = taichiFloorTexture.wrapT = THREE.ClampToEdgeWrapping

const MIN_ACTIVE_INTENSITY = 0.0
const MAX_ACTIVE_INTENSITY = 5.0

class HintBird {
  constructor(taichiFloor, birdId, buttonId, gltfLoader) {
    this.taichiFloor = taichiFloor
    this.birdId = birdId
    this.buttonId = buttonId
    this.mixer = null
    this.mesh = null

    this.maxRadius = 4.0
    this.minRadius = 0.2
    this.radius = this.maxRadius
    this.theta = birdId * Math.PI * 2 / 3

    this.rotateSpeed = 0.6

    this.activate = false
    this.gather = false

    const object = this
    gltfLoader.load('/game/assets/mesh/bird.glb', function (gltf){
      object.mesh = gltf.scene
      object.setPose()
      gltf.scene.scale.set(1, 1, 1)
      gltf.scene.traverse( function ( child ) {
        if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x9370DB,
              emissive: 0x9370DB,
              emissiveIntensity: 0.0,
              transparent: true,
              opacity: 0.1,
            })
        }
      } );

      object.mixer = new THREE.AnimationMixer(gltf.scene)
      const action = object.mixer.clipAction(gltf.animations[0])
      action.setLoop(THREE.LoopPingPong)
      action.play()
      object.taichiFloor.buttons[buttonId].add(gltf.scene)

    }, undefined, function (error) {
      console.error(error)
    })
  }

  setPose(){
    const thetaOffset = (this.buttonId % 2 == 0) ? 0 : Math.PI
    this.mesh.rotation.set(Math.PI / 2, this.theta, 0)
    this.mesh.position.set(this.radius * Math.cos(this.theta + thetaOffset), this.radius * Math.sin(this.theta + thetaOffset), 10)
  }

  reset(){
    this.radius = this.maxRadius
    this.theta = this.birdId * Math.PI * 2 / 3
    this.setActivate(false)
    this.setGather(false)
  }

  update(deltaTime){
    if (this.mesh){
      this.theta += this.rotateSpeed * deltaTime * ((this.buttonId % 2 == 0) ? 1: -1)
      if (this.mixer){
        this.mixer.update(deltaTime)
      }
      if (this.gather){
        this.radius = Math.max(this.minRadius, this.radius - deltaTime / 0.5 * (this.maxRadius - this.minRadius))
      }
      else{
        this.radius = Math.min(this.maxRadius, this.radius + deltaTime / 0.5 * (this.maxRadius - this.minRadius))
      }
      this.setPose()
    }
  }

  setActivate(activate){
    this.activate = activate
    this.mesh.traverse( function ( child ) {
      if (child.isMesh) {
        if (activate){
          child.material.opacity = 0.9
          child.material.emissiveIntensity = 0.5
        }
        else{
          child.material.opacity = 0.1
          child.material.emissiveIntensity = 0.1
        }
      }
    } );
    if (~activate){
      this.setGather(false)
    }
  }
  setGather(gather){
    this.gather = gather
  }
}

class TaichiFloor extends THREE.Mesh {
  constructor(game, radius) {
    const floorGeometry = new THREE.CircleGeometry(radius*2, 32)
    const floorMaterial = new THREE.MeshBasicMaterial({map: taichiFloorTexture})
    super(floorGeometry, floorMaterial)
    this.game = game
    this.radius = radius
    this.rotation.x = -Math.PI / 2
    this.position.y = 0.02

    this.startRotate = false
    this.rotateMaxSpeed = 0.3
    this.rotateSpeed = 0.0

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
      this.buttonCenters.push(new THREE.Vector3(0.0, this.buttonPositionY[i], 0.01))
    }

    this.effectActives = [false, false]
    this.effectPressed = [null, null]
    this.activeTimes = [0.0, 0.0]

    this.maxSuperCount = 3
    const gltfLoader = new GLTFLoader()
    this.hintBirds = []
    for (var i = 0; i < this.buttonNum; i++){
      this.hintBirds.push([])
      for (var j = 0; j < this.maxSuperCount; j++){
        this.hintBirds[i].push(new HintBird(this, j, i, gltfLoader))
      }
    }
  }

  reset(){
    this.startRotate = false
    this.rotateSpeed = 0.0
    for (var i = 0; i < this.buttonEffects.length; i++){
      this.buttonCounts[i] = 0
      this.effectActives[i] = false
      this.effectPressed[i] = null
      this.buttonEffects[i].material.color.set(0x404000)
      this.buttonEffects[i].material.emissive.set(0x404000)
      this.buttonEffects[i].material.emissiveIntensity = 0.0
    }
    for (var i = 0; i < this.buttonNum; i++){
      for (var j = 0; j < this.maxSuperCount; j++){
        if (this.hintBirds[i][j].mixer){
          this.hintBirds[i][j].reset()
        }
      }
    }
  }

  update(deltaTime){
    for (var i = 0; i < this.buttonNum; i++){
      for (var j = 0; j < this.maxSuperCount; j++){
        this.hintBirds[i][j].update(deltaTime)
      }
    }
    if (this.startRotate){
      if (this.rotateSpeed < this.rotateMaxSpeed){
        this.rotateSpeed += this.rotateMaxSpeed * deltaTime / 20.0
      }
      this.rotateZ(this.rotateSpeed * deltaTime)
    }
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

  getButtonCenter(id){
    return this.buttonCenters[id].clone().applyMatrix4(this.matrixWorld)
  }

  setCount(id, cnt){
    this.buttonCounts[id] = Math.min(cnt, this.maxSuperCount)
    this.effectActives[id] = (this.buttonCounts[id] >= this.maxSuperCount)
    for (var j = 0; j < this.maxSuperCount; j++){
      this.hintBirds[id][j].setActivate(j < cnt)
    }
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
        for (var j = 0; j < this.maxSuperCount; j++){
          this.hintBirds[id][j].setGather(true)
        }
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
    this.game.createSuperBullet(this.getButtonCenter(id).add(new THREE.Vector3(0, 10, 0)), this.effectPressed[id])
    this.effectPressed[id] = null
  }

}

export default TaichiFloor
