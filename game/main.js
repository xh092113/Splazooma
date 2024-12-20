import Grass from './grass.js'
import TaichiFloor from './taichi_floor.js'
import { fireVertexShader, fireFragmentShader } from './fire_shader.js'
import { GLTFLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/GLTFLoader.js";


class UI{
    constructor(game){
        this.game = game
        const singlePlayBtn = document.getElementById('singlePlayBtn')
        const battlePlayBtn = document.getElementById('battlePlayBtn')
        singlePlayBtn.addEventListener('click', this.playSingleBtnPressed.bind(this))
        battlePlayBtn.addEventListener('click', this.playBattleBtnPressed.bind(this))
    }

    set visible(value){
        const singlePlayBtn = document.getElementById('singlePlayBtn')
        const battlePlayBtn = document.getElementById('battlePlayBtn')
        const ui = document.getElementById('ui')
        const display = (value) ? 'block' : 'none'
        singlePlayBtn.style.display = display
        battlePlayBtn.style.display = display
        ui.style.display = display
    }

    playSingleBtnPressed(){
        const singlePlayBtn = document.getElementById('singlePlayBtn')
        const battlePlayBtn = document.getElementById('battlePlayBtn')
        singlePlayBtn.style.display = 'none'
        battlePlayBtn.style.display = 'none'
        this.game.GameStart([true, false])
    }

    playBattleBtnPressed(){
        const singlePlayBtn = document.getElementById('singlePlayBtn')
        const battlePlayBtn = document.getElementById('battlePlayBtn')
        singlePlayBtn.style.display = 'none'
        battlePlayBtn.style.display = 'none'
        this.game.GameStart([true, true])
    }

    showGameOver(){
        // const gameover = document.getElementById('gameover')
        // gameover.style.display = 'block'
        setTimeout(hideGameOver, 3000)

        function hideGameOver(){
            // gameover.style.display = 'none'
            const ui = document.getElementById('ui')
            const singlePlayBtn = document.getElementById('singlePlayBtn')
            const battlePlayBtn = document.getElementById('battlePlayBtn')
            // ui.style.display = 'block'
            singlePlayBtn.style.display = 'block'
            battlePlayBtn.style.display = 'block'
        }
    }
}

class Bullet {
    constructor(scene, shooter, bulletRadius, bulletColor, bulletColorID, initBulletPosition, initBulletQuaternion, speed=80) {
      this.scene = scene
      this.shoorter = shooter
      this.radius = bulletRadius
      this.color = bulletColor
      this.colorID = bulletColorID
      this.bulletMesh = createSphere(scene, bulletRadius, bulletColor, 1.0, initBulletPosition, initBulletQuaternion)
      this.speed = speed
      this.outBoundary = false
      this.toDestroy = false
      this.forwardDirection = getForwardVector(this.bulletMesh)
    }

    fly(deltaTime){
        if (this.toDestroy){
            return
        }
        const curPosition = new THREE.Vector3(this.bulletMesh.position.x, this.bulletMesh.position.y, this.bulletMesh.position.z)
        const nextPosition = curPosition.add(this.forwardDirection.clone().multiplyScalar(this.speed * deltaTime))
        this.bulletMesh.position.set(nextPosition.x, nextPosition.y, nextPosition.z)
        this.outBoundary = nextPosition.x < -200 || nextPosition.x > 200 || nextPosition.z < -200 || nextPosition.z > 200
        this.toDestroy |= this.outBoundary
    }

    detectWallCollision(wallAxis, wallPosition){
        if (detectSurfaceCollision(this.bulletMesh, this.radius, wallAxis, wallPosition)){
            if (wallAxis == 0){
                this.forwardDirection.x = -this.forwardDirection.x
            }
            if (wallAxis == 1){
                this.forwardDirection.z = -this.forwardDirection.z
            }
        }
    }

    detectSnakeCollision(snake){
        if (this.toDestroy){
            return
        }
        for (var i = 0; i < snake.spheres.length; i++){
            const bodySphere = snake.spheres[i]
            if (detectSphereCollision(bodySphere, snake.bodyRadius, this.bulletMesh, this.radius)){
                snake.processBulletShot(this, i)
                this.toDestroy = true
                break
            }
        }
    }

    detectBulletCollision(bullet){
        if (detectSphereCollision(this.bulletMesh, this.radius, bullet.bulletMesh, bullet.radius)){
            [this.forwardDirection, bullet.forwardDirection] = [bullet.forwardDirection, this.forwardDirection]
        }
    }

    destroy(){
        this.scene.remove(this.bulletMesh)
        this.bulletMesh.material.dispose()
        this.bulletMesh.geometry.dispose()
        this.bulletMesh = null
    }
}



class SuperBullet {
    constructor(scene, shooter, targetSnake, initBulletPosition, bulletRadius=1.0, speed=10) {
      this.scene = scene
      this.shoorter = shooter
      this.targetSnake = targetSnake
      this.radius = bulletRadius
      this.color = new THREE.Color(0x9370DB)
      this.bulletMesh = createSphere(scene, bulletRadius, this.color, 1.0, initBulletPosition)
      this.speed = speed
      this.outBoundary = false
      this.toDestroy = false
      this.forwardDirection = getForwardVector(this.bulletMesh)
      this.targetPosition = new THREE.Vector3(0.0, 0.0, 0.0)
    }

    computeMergeCount(colors, excludeL, excludeR){
        if (excludeL == 0 || excludeR == colors.length){
            return 0
        }
        const color = colors[excludeR]
        if (colors[excludeL-1] != color){
            return 0
        }
        var newExcludeL = excludeL-1
        var newExcludeR = excludeR+1
        while (newExcludeL-1 >= 0 && colors[newExcludeL-1] == color){
            newExcludeL -= 1
        }
        while (newExcludeR < colors.length && colors[newExcludeR] == color){
            newExcludeR += 1
        }
        if ((newExcludeR - newExcludeL) - (excludeR - excludeL) <= 2){
            return 2
        }
        return (newExcludeR - newExcludeL) - (excludeR - excludeL) + this.computeMergeCount(colors, newExcludeL, newExcludeR)
    }

    updateTargetPosition(){
        var colors = this.targetSnake.sphereColorIDs
        var targetId = 0
        colors[0] = (colors[0] + 1) % 2
        var maxTargetDestroy = 0
        var initCount = 1
        while(initCount <= colors.length && colors[initCount] == colors[0]){
            initCount += 1
        }
        if (initCount >= 3){
            maxTargetDestroy = initCount + this.computeMergeCount(colors, 0, initCount)
        }
        colors[0] = (colors[0] + 1) % 2
        
        for (var i = 1; i < colors.length; i++){
            colors[i] = (colors[i] + 1) % 2
            var initLeft = i
            while(initLeft > 0 && colors[initLeft-1] == colors[i]){
                initLeft -= 1
            }
            var initRight = i+1
            while(initRight <= colors.length && colors[initRight] == colors[i]){
                initRight += 1
            }
            if (initRight - initLeft >= 3){
                const targetDestroy = initRight - initLeft + this.computeMergeCount(colors, initLeft, initRight)
                if (targetDestroy > maxTargetDestroy){
                    targetId = i
                    maxTargetDestroy = targetDestroy
                }
            }
            colors[i] = (colors[i] + 1) % 2
        }
        const target = this.targetSnake.spheres[targetId]
        this.targetPosition = new THREE.Vector3(target.position.x, target.position.y * 2.9, target.position.z)
    }
  
    fly(deltaTime){
        if (this.toDestroy){
            return
        }
        this.updateTargetPosition()
        const curPosition = new THREE.Vector3(this.bulletMesh.position.x, this.bulletMesh.position.y, this.bulletMesh.position.z)
        const flyDirection = this.targetPosition.clone().sub(curPosition).normalize()
        const nextPosition = curPosition.add(flyDirection.clone().multiplyScalar(this.speed * deltaTime))
        this.bulletMesh.position.set(nextPosition.x, nextPosition.y, nextPosition.z)
        this.outBoundary = nextPosition.x < -200 || nextPosition.x > 200 || nextPosition.z < -200 || nextPosition.z > 200
        this.toDestroy |= this.outBoundary
    }
  
    detectWallCollision(wallAxis, wallPosition){
        if (detectSurfaceCollision(this.bulletMesh, this.radius, wallAxis, wallPosition)){
            if (wallAxis == 0){
                this.forwardDirection.x = -this.forwardDirection.x
            }
            if (wallAxis == 1){
                this.forwardDirection.z = -this.forwardDirection.z
            }
        }
    }
  
    detectSnakeCollision(snake){
        if (this.toDestroy){
            return
        }
        for (var i = 0; i < snake.spheres.length; i++){
            const bodySphere = snake.spheres[i]
            if (detectSphereCollision(bodySphere, snake.bodyRadius, this.bulletMesh, this.radius)){
                snake.processSuperBulletShot(this, i)
                this.toDestroy = true
                break
            }
        }
    }
  
    detectBulletCollision(bullet){
        if (detectSphereCollision(this.bulletMesh, this.radius, bullet.bulletMesh, bullet.radius)){
            [this.forwardDirection, bullet.forwardDirection] = [bullet.forwardDirection, this.forwardDirection]
        }
    }
  
    destroy(){
        this.scene.remove(this.bulletMesh)
        this.bulletMesh.material.dispose()
        this.bulletMesh.geometry.dispose()
        this.bulletMesh = null
    }
  }


class Snake{
    constructor(playerId, game, initPosition, controlKeys, sphere_num = 8, sphere_radius = 1, sphere_speed = 6, sphere_rot_speed = 3, sphere_overlap_ratio = 0.2, isAI = false){
        this.playerId = playerId
        this.game = game
        this.scene = game.scene
        this.isAI = isAI
        this.camera = game.cameras[playerId]
        this.controlKeys = controlKeys
        this.sphereColors = [
            0xff0000, // 红色
            0x0000ff, // 蓝色
            // 0xffa500, // 橙色
            // 0x00ff00,  // 绿色
        ]
        this.spheres = []
        this.sphereColorIDs = []
        this.sphere_num = sphere_num
        this.bodyRadius = sphere_radius
        this.bulletRadius = sphere_radius
        this.sphere_speed = sphere_speed
        this.sphere_rot_speed = sphere_rot_speed
        this.sphere_overlap_ratio = sphere_overlap_ratio
        this.processingBody = false
        for (var i = 0; i < this.sphere_num; i++){
            var colorID = null
            if (i == 0){
                colorID = Math.floor(Math.random() * this.sphereColors.length)
            }
            else{
                colorID = Math.floor(Math.random() * (this.sphereColors.length-1))
                if (colorID >= this.sphereColorIDs[i-1]){
                    colorID += 1
                }
            }
            const color = this.sphereColors[colorID]
            const initOffset = new THREE.Vector3(-i*this.bodyRadius*(2-this.sphere_overlap_ratio), this.bodyRadius, 0)
            const sphere = createSphere(this.scene, this.bodyRadius, color, 1.0, initOffset.clone().add(initPosition))
            this.spheres.push(sphere)
            this.sphereColorIDs.push(colorID)
        }
        
        // Create hint ball
        this.bulletColorID = Math.floor(Math.random() * this.sphereColors.length)
        this.bulletColor = this.sphereColors[this.bulletColorID]
        this.hintBall = createSphere(this.scene, this.bodyRadius * 0.5, this.bulletColor, 0.5, 
                                        new THREE.Vector3(this.spheres[0].position.x, this.spheres[0].position.y + this.bodyRadius*(1+0.5), this.spheres[0].z))
        this.bulletMaxCD = 1.0
        this.bulletCD = -0.01

        this.mergeCount = 0

        this.liveTime = 0.0
        this.turnLeftTime = -1.0
        this.turnRightTime = -1.0
        this.idleTime = -1.0

        this.speedup = false
        this.speeedUpTime = 0.0

        this.shootShakeMaxTime = 0.3
        this.shootShakeTime = -1.0

        this.mergeMaxCD = 1.0
        this.mergeCD = this.mergeMaxCD
        this.mergeCombo = 0
    }

    getHeadQuat(){
        return new THREE.Quaternion(this.spheres[0].quaternion.x, this.spheres[0].quaternion.y, this.spheres[0].quaternion.z, this.spheres[0].quaternion.w)
    }

    // Point forward
    getHeadDirection(){
        const headSphere = this.spheres[0]
        const forwardDirection = getForwardVector(headSphere)
        return forwardDirection
    }

    //Pointing backward
    getTailDirection(){
        if (this.spheres.length == 1){
            return this.getHeadDirection()
        }
        const tailDirection = getPosition(this.spheres[this.spheres.length-1]).sub(getPosition(this.spheres[this.spheres.length-2])).normalize()
        return tailDirection
    }

    getSpeedFactor(){
        var speedupFactor = (Math.exp((this.spheres.length - 1.0)* Math.log(0.8) / 7.0) + 0.2)
        speedupFactor *= (1 + this.liveTime / 240)
        if (this.speedup){
            speedupFactor *= 1.5
        }
        return speedupFactor * 0.8
    }

    AImove(deltaTime, snakes){
        const localForwardVector = new THREE.Vector3(1, 0, 0)
        var deltaDistance = 0.2
        var dieAngle = null
        var dieIndex = null
        var minDieDistance = null
        var leftLiveCount = 0
        var rightLiveCount = 0
        const dieDistances = [0]
        const originHeadQuat = new THREE.Quaternion(this.spheres[0].quaternion.x, this.spheres[0].quaternion.y, this.spheres[0].quaternion.z, this.spheres[0].quaternion.w)
        const originHeadPosition = getPosition(this.spheres[0])
        
        var maxDistance = 1.0 * this.sphere_speed * this.getSpeedFactor()
        for (var startAngle = -Math.PI / 4; startAngle < Math.PI / 4; startAngle += 0.05){
            this.spheres[0].position.set(originHeadPosition.x, originHeadPosition.y, originHeadPosition.z)
            this.spheres[0].quaternion.set(originHeadQuat.x, originHeadQuat.y, originHeadQuat.z, originHeadQuat.w)
            this.spheres[0].rotateY(startAngle)
            var cumDistance = 0
            while (cumDistance + deltaDistance < maxDistance){
                cumDistance += deltaDistance
                this.spheres[0].translateOnAxis(localForwardVector, deltaDistance)
                if (game.detectSnakeDeath(this.playerId)){
                    if (minDieDistance == null || minDieDistance > cumDistance){
                        minDieDistance = cumDistance
                        dieAngle = startAngle
                        dieIndex = dieDistances.length
                    }
                    break
                }
            }
            // if (cumDistance > maxDistance * 0.9){
            //     if (startAngle < 0.0){
            //         leftLiveCount += 1
            //     }
            //     else{
            //         rightLiveCount += 1
            //     }
            // }
            dieDistances.push(cumDistance)
        }
        dieDistances.push(0)
        
        this.spheres[0].position.set(originHeadPosition.x, originHeadPosition.y, originHeadPosition.z)
        this.spheres[0].quaternion.set(originHeadQuat.x, originHeadQuat.y, originHeadQuat.z, originHeadQuat.w)
        if (dieIndex != null){
            this.speedup = false

            for (var i = 0; i < dieDistances.length; i++){
                if (dieDistances[i] > dieDistances[dieIndex] * 1.2 || dieDistances[i] > maxDistance - deltaDistance){
                    if (i*2 < dieDistances.length){
                        leftLiveCount += 1
                    }
                    else{
                        rightLiveCount += 1
                    }
                }
            }

            if (this.turnLeftTime < 0.0 && this.turnRightTime < 0.0){
                if (leftLiveCount > rightLiveCount){
                    this.turnLeftTime = -1.0
                    this.turnRightTime = 0.5
                    this.idleTime = -1.0
                }
                else{
                    this.turnLeftTime = 0.5
                    this.turnRightTime = -1.0
                    this.idleTime = -1.0
                }
            }
            else {
                // console.log(leftLiveCount, rightLiveCount, this.turnLeftTime, this.turnRightTime)
                if (leftLiveCount > rightLiveCount + 2){
                    this.turnLeftTime = -1.0
                    this.turnRightTime = 0.5
                    this.idleTime = -1.0
                }
                else if (rightLiveCount > leftLiveCount + 2){
                    this.turnLeftTime = 0.5
                    this.turnRightTime = -1.0
                    this.idleTime = -1.0
                }
            }
        }
        else{
            this.speedup = true
            if (this.idleTime < 0 && this.turnLeftTime < 0 && this.turnRightTime < 0){
                var superBulletActivate = false
                var superBulletDistance = null
                var superBulletPosition = null
                for (var i = 0; i < this.game.taichiFloor.effectActives.length; i++){
                    if (this.game.taichiFloor.effectActives[i]){
                        const pos = this.game.taichiFloor.getButtonCenter(i)
                        const dis = pos.clone().sub(originHeadPosition).length()
                        if (superBulletDistance == null || superBulletDistance > dis){
                            superBulletActivate = true
                            superBulletDistance = dis
                            superBulletPosition = pos
                        }
                    }
                }
                if (superBulletActivate){
                    const offset = superBulletPosition.sub(originHeadPosition)
                    if (offset.clone().cross(this.getHeadDirection()).y > 0){
                        this.turnLeftTime = -1.0
                        this.turnRightTime = 0.3
                        this.idleTime = -1.0
                    }
                    else{
                        this.turnLeftTime = 0.3
                        this.turnRightTime = -1.0
                        this.idleTime = -1.0
                    }
                }
                else{
                    const turnSignal = Math.random()
                    if (turnSignal < 1.0){
                        var leftSnakeCount = 0
                        var rightSnakeCount = 0
                        for (var i = 0; i < snakes.length; i++){
                            if (i != this.playerId){
                                for (var j = 0; j < snakes[i].spheres.length; j++){
                                    if (snakes[i].sphereColorIDs[j] == this.bulletColorID){
                                        const offset = getPosition(snakes[i].spheres[j]).sub(originHeadPosition)
                                        if (offset.clone().cross(this.getHeadDirection()).y > 0){
                                            rightSnakeCount++
                                        }
                                        else{
                                            leftSnakeCount++
                                        }
                                    }
                                }
                            }
                        }
                        // if (this.playerId == 0){
                        //     console.log(leftSnakeCount, rightSnakeCount)
                        // }
                        if (leftSnakeCount > rightSnakeCount){
                            // if (this.playerId == 0){
                            //     console.log("left")
                            // }
                            this.turnLeftTime = 0.5
                            this.turnRightTime = -1.0
                            this.idleTime = -1.0
                        }
                        else if (leftSnakeCount < rightSnakeCount){
                            // if (this.playerId == 0){
                            //     console.log("right")
                            // }
                            this.turnLeftTime = -1.0
                            this.turnRightTime = 0.5
                            this.idleTime = -1.0
                        }
                    }
                    else{
                        this.idleTime = 0.5
                    }
                }
            }
        }
        if (this.turnLeftTime > 0){
            this.turnLeftTime -= deltaTime
            this.spheres[0].rotateY(this.sphere_rot_speed * this.getSpeedFactor() * deltaTime)
        }
        if (this.turnRightTime > 0){
            this.turnRightTime -= deltaTime
            this.spheres[0].rotateY(-this.sphere_rot_speed * this.getSpeedFactor() * deltaTime)
        }
        if (this.idleTime > 0){
            this.idleTime -= deltaTime
        }

    }
    AIshoot(targetSphereIndex, sceneSpheres, sceneSphereColorIds, bullets, snakes){
        if (targetSphereIndex != null){
            if (sceneSphereColorIds[targetSphereIndex] == this.bulletColorID && targetSphereIndex > this.spheres.length-2){
                this.shoot(bullets)
            }
            else if (sceneSphereColorIds[targetSphereIndex] != this.bulletColorID && targetSphereIndex <= this.spheres.length-2){
                this.shoot(bullets)
            }
        }
        else{
            var leftSnakeCount = 0
            var rightSnakeCount = 0
            for (var i = 0; i < snakes.length; i++){
                if (i != this.playerId){
                    for (var j = 0; j < snakes[i].spheres.length; j++){
                        if (snakes[i].sphereColorIDs[j] == this.bulletColorID){
                            rightSnakeCount++
                        }
                    }
                }
            }
            if (rightSnakeCount + leftSnakeCount == 0){
                this.shoot(bullets)
            }
        }
    }

    update(deltaTime, keyPressed, snakes, bullets){
        // Control head sphere
        if (this.spheres.length == 0){
            return
        }
        this.liveTime += deltaTime
        if (this.shootShakeTime > 0){
            this.shootShakeTime -= deltaTime
        }
        const localForwardVector = new THREE.Vector3(1, 0, 0)
        if (!this.isAI){
            if (keyPressed[this.controlKeys[0]]){
                this.spheres[0].rotateY(this.sphere_rot_speed * this.getSpeedFactor() * deltaTime)
            }
            if (keyPressed[this.controlKeys[1]]){
                this.spheres[0].rotateY(-this.sphere_rot_speed * this.getSpeedFactor() * deltaTime)
            }
        }
        else{
            this.AImove(deltaTime, snakes)
        }

        this.spheres[0].translateOnAxis(localForwardVector, this.sphere_speed * this.getSpeedFactor() * deltaTime)
        // Control following spheres
        for (var i = 1; i < this.spheres.length; i++){
            moveFollowingSphere(this.spheres[i], this.spheres[i-1], this.sphere_speed * deltaTime, this.bodyRadius, this.sphere_overlap_ratio)
        }

        this.bulletCD = Math.max(this.bulletCD - deltaTime, -0.01)
        // Detect shooting
        if (!this.isAI){
            this.speedup = keyPressed[this.controlKeys[2]]
            if (this.speedup){
                this.speeedUpTime = Math.min(0.2, this.speeedUpTime + deltaTime)
            }
            else{
                this.speeedUpTime = Math.max(0.0, this.speeedUpTime - deltaTime)
            }
            if (keyPressed[this.controlKeys[3]]){
                this.shoot(bullets)
            }
        }

        // Update player camera
        this.attachCameraToActor()

        this.processMerge(deltaTime)
        if (this.spheres.length == 0){
            return
        }

        // Update hint ball
        const sceneSpheres = this.spheres.slice(1)
        const sceneSphereColorIds = this.sphereColorIDs.slice(1)
        for (var i = 0; i < snakes.length; i++){
            if (i != this.playerId){
                for (var j = 0; j < snakes[i].spheres.length; j++){
                    sceneSpheres.push(snakes[i].spheres[j])
                    sceneSphereColorIds.push(snakes[i].sphereColorIDs[j])
                }
            }
        }
        const targetSphereIndex = this.updateHintBall(this.hintBall, this.spheres[0], sceneSpheres, this.bodyRadius, this.bulletColor, this.bulletCD < 0)
        if (this.isAI){
            this.AIshoot(targetSphereIndex, sceneSpheres, sceneSphereColorIds, bullets, snakes)
        }
    }

    updateHintBall(hintBall, headSphere, collSpheres, sphere_radius, bulletColor, shootReady){
        if (!shootReady){
            // Hide hint ball if CD not ready
            hintBall.position.set(0, -3, 0)
            return null
        }
        hintBall.material.color = new THREE.Color(bulletColor)
    
        var targetSphereIndex = null
        const forwardDirection = getForwardVector(headSphere)
        const headPosition = new THREE.Vector3(headSphere.position.x, headSphere.position.y, headSphere.position.z)
        var minCollDistance = null
    
        for (var i = 0; i < collSpheres.length; i++){
            const collDistance = getSpheresCollDistance(headPosition, forwardDirection, collSpheres[i].position, sphere_radius*(1+0.5))
            if (collDistance != null && collDistance > 0){
                if (minCollDistance == null || collDistance < minCollDistance){
                    minCollDistance = collDistance
                    targetSphereIndex = i
                }
            }
        }
        if (minCollDistance == null){
            hintBall.position.set(headSphere.position.x, headSphere.position.y + sphere_radius*(1+0.5), headSphere.position.z)
        }
        else{
            var hitPoint = new THREE.Vector3(0, 0, 0)
            // forwardRay.at(minCollDistance - sphere_radius*0.5, hitPoint)
            hitPoint = headPosition.clone().add(forwardDirection.clone().multiplyScalar(minCollDistance))
            hintBall.position.set(hitPoint.x, hitPoint.y, hitPoint.z)
        }
        return targetSphereIndex
    }

    // Attach camera to sphere
    attachCameraToActor(){
        const actor = this.spheres[0]
        var relativeCameraOffset = new THREE.Vector3(-12, 6, 0)
        if (this.shootShakeTime > 0.0){
            const lambda = 1 - Math.abs(this.shootShakeTime - this.shootShakeMaxTime/2.0) / (this.shootShakeMaxTime/2.0)
            const maxShakeDistance = 1.0
            const shakeOffset = new THREE.Vector3(
                -maxShakeDistance * lambda,
                0.0,
                0.0,
            )
            relativeCameraOffset = relativeCameraOffset.add(shakeOffset)
        }
        
        relativeCameraOffset.x *= 1 + 0.2 * this.speeedUpTime / 0.2

        const globalCameraPose = relativeCameraOffset.applyMatrix4(actor.matrixWorld)
        const sceneBound = this.game.sceneSize / 2.0 - 2.0
        globalCameraPose.x = Math.max(Math.min(globalCameraPose.x, sceneBound), -sceneBound)
        globalCameraPose.z = Math.max(Math.min(globalCameraPose.z, sceneBound), -sceneBound)
        this.camera.position.set(globalCameraPose.x, globalCameraPose.y, globalCameraPose.z)
        this.camera.lookAt(actor.position)
    }

    detectSelfCollision(){
        for (var i = 2; i < this.spheres.length; i++){
            if (detectSphereCollision(this.spheres[0], this.bodyRadius, this.spheres[i], this.bodyRadius)){
                return true
            }
        }
        return false
    }
    
    detectSnakeCollision(snake){
        for (var i = 0; i < snake.spheres.length; i++){
            if (detectSphereCollision(this.spheres[0], this.bodyRadius, snake.spheres[i], snake.bodyRadius)){
                return true
            }
        }
        return false
    }

    detectWallCollision(wallAxis, wallPosition){
        return detectSurfaceCollision(this.spheres[0], this.bodyRadius, wallAxis, wallPosition)
    }

    shoot(bullets){
        if (this.bulletCD < 0){
            const headSphere = this.spheres[0]
            const forwardDirection = getForwardVector(headSphere)
            const headPosition = new THREE.Vector3(headSphere.position.x, headSphere.position.y, headSphere.position.z)
            const initBulletPosition = headPosition.clone().add(forwardDirection.clone().multiplyScalar(this.bodyRadius+this.bulletRadius+0.01))
            const initBulletQuaternion = new THREE.Quaternion(headSphere.quaternion.x, headSphere.quaternion.y, headSphere.quaternion.z, headSphere.quaternion.w)
            const bullet = new Bullet(this.scene, this, this.bulletRadius, this.bulletColor, this.bulletColorID, initBulletPosition, initBulletQuaternion)
            bullets.push(bullet)
            this.bulletColorID = Math.floor(Math.random() * this.sphereColors.length)
            this.bulletColor = this.sphereColors[this.bulletColorID]
            this.bulletCD = this.bulletMaxCD
            this.shootShakeTime = this.shootShakeMaxTime

            this.game.playAudio('throw.ogg', false, 1.0)
        }
    }

    processShootReward(reward, combo){
        combo = Math.min(combo-1, 1)
        if (this.spheres.length == 0){
            return
        }
        console.log(this.playerId, reward, combo)
        for (var i = 0; i < reward + combo; i++){
            var colorID = Math.floor(Math.random() * (this.sphereColors.length-1))
            if (colorID >= this.sphereColorIDs[this.spheres.length-1]){
                colorID += 1
            }
            this.appendBody(this.spheres.length, colorID)
            this.game.taichiFloor.updateCount(this.playerId)
        }
    }

    processBulletShot(bullet, shotIndex){
        while(this.processingBody){
            console.log("Waiting Shot")
        }
        this.processingBody = true
        var headDistance = null
        var tailDistance = null
        if (shotIndex > 0){
            headDistance = getPosition(this.spheres[shotIndex-1]).add(getPosition(this.spheres[shotIndex])).multiplyScalar(0.5).sub(getPosition(bullet.bulletMesh)).length()
        }
        else{
            headDistance = getPosition(this.spheres[shotIndex]).add(this.getHeadDirection().clone().multiplyScalar(this.bodyRadius)).sub(getPosition(bullet.bulletMesh)).length()
        }
        if (shotIndex < this.spheres.length - 1){
            tailDistance = getPosition(this.spheres[shotIndex+1]).add(getPosition(this.spheres[shotIndex])).multiplyScalar(0.5).sub(getPosition(bullet.bulletMesh)).length()
        }
        else{
            tailDistance = getPosition(this.spheres[shotIndex]).add(this.getTailDirection().clone().multiplyScalar(this.bodyRadius)).sub(getPosition(bullet.bulletMesh)).length()
        }

        if (headDistance < tailDistance){
            this.appendBody(shotIndex, bullet.colorID)
        }
        else{
            this.appendBody(shotIndex+1, bullet.colorID)
        }
        this.processingBody = false
    }

    processSuperBulletShot(bullet, shotIndex){
        while(this.processingBody){
            console.log("Waiting Shot")
        }
        this.processingBody = true
        this.sphereColorIDs[shotIndex] = (this.sphereColorIDs[shotIndex] + 1) % this.sphereColors.length
        this.spheres[shotIndex].material.color.set(this.sphereColors[this.sphereColorIDs[shotIndex]])
        this.processingBody = false
    }

    processMerge(deltaTime){
        while(this.processingBody){
            console.log("Waiting Merge")
        }
        this.processingBody = true

        this.mergeCD -= deltaTime
        this.mergeCount = 0
        var mergeUpdate = false
        var lastUpdateIndex = 0
        var hasMerged = false
        do{
            mergeUpdate = false
            for (var i = Math.max(lastUpdateIndex, 0); i < this.spheres.length-2; i++){
                if (this.sphereColorIDs[i] == this.sphereColorIDs[i+1] && this.sphereColorIDs[i+1] == this.sphereColorIDs[i+2]){
                    var j = i+3
                    while (j < this.spheres.length && this.sphereColorIDs[j] == this.sphereColorIDs[i])
                        j++
                    for (var k = i; k < j; k++){
                        this.spheres[k].material.color.set(0x9370DB)
                        this.spheres[k].material.transparent = true
                        this.spheres[k].material.opacity = 0.9
                    }
                    if (this.mergeCD < 0.0){
                        hasMerged = true
                        this.mergeBody(i, j)
                        this.mergeCount += j-i-2
                        mergeUpdate = true
                        lastUpdateIndex = i
                        this.game.playAudio('points.ogg')
                        break
                    }
                }
            }
            
        }
        while(mergeUpdate)
        if (this.mergeCD < 0.0){
            if (hasMerged){
                this.mergeCombo += 1
            }
            else{
                this.mergeCombo = 0
            }
            for (var i = 0; i < this.spheres.length; i++){
                this.spheres[i].material.color.set(this.sphereColors[this.sphereColorIDs[i]])
                this.spheres[i].material.transparent = false
                this.spheres[i].material.opacity = 1.0
            }
            this.mergeCD = this.mergeMaxCD
        }
        this.processingBody = false
    }

    appendBody(shotIndex, colorID){
        // append a body sphere before shotIndex
        const headQuat = this.getHeadQuat().clone()
        const tailDirection = this.getTailDirection()
        const color = this.sphereColors[colorID]
        if (shotIndex < this.spheres.length){
            const newSphere = createSphere(this.scene, this.bodyRadius, color, 1.0, getPosition(this.spheres[shotIndex]))
            for (var i = shotIndex; i < this.spheres.length-1; i++){
                this.spheres[i].position.set(this.spheres[i+1].position.x, this.spheres[i+1].position.y, this.spheres[i+1].position.z)
            }
            const newTailPosition = tailDirection.clone().multiplyScalar(this.bodyRadius*(2-this.sphere_overlap_ratio)).add(getPosition(this.spheres[this.spheres.length-1]))
            this.spheres[this.spheres.length-1].position.set(newTailPosition.x, newTailPosition.y, newTailPosition.z)
            this.spheres.splice(shotIndex, 0, newSphere)
            this.sphereColorIDs.splice(shotIndex, 0, colorID)
        }
        else{
            const newTailPosition = tailDirection.clone().multiplyScalar(this.bodyRadius*(2-this.sphere_overlap_ratio)).add(getPosition(this.spheres[this.spheres.length-1]))
            const newSphere = createSphere(this.scene, this.bodyRadius, color, 1.0, newTailPosition)
            this.spheres.push(newSphere)
            this.sphereColorIDs.push(colorID)
        }

        this.spheres[0].quaternion.set(headQuat.x, headQuat.y, headQuat.z, headQuat.w)
        this.sphere_num += 1
    }

    destroyBody(startIndex, endIndex){
        const headQuat = this.getHeadQuat()
        for (var i = startIndex; i < endIndex; i++){
            this.scene.remove(this.spheres[i])
            this.spheres[i].material.dispose()
            this.spheres[i].geometry.dispose()
            this.spheres[i] = null
        }
        this.spheres.splice(startIndex, endIndex-startIndex)
        this.sphereColorIDs.splice(startIndex, endIndex-startIndex)
        if (this.spheres.length > 0){
            this.spheres[0].quaternion.set(headQuat.x, headQuat.y, headQuat.z, headQuat.w)
        }
    }

    mergeBody(index, endIndex){
        // merge [mergeIndex, mergeIndex+2]
        const mergeLength = endIndex - index
        for (var i = this.spheres.length-1; i >= endIndex; i--){
            this.spheres[i].position.set(this.spheres[i-mergeLength].position.x, this.spheres[i-mergeLength].position.y, this.spheres[i-mergeLength].position.z)
        }
        this.destroyBody(index, index+mergeLength)
        this.sphere_num -= mergeLength
    }

    die(){
        this.destroyBody(0, this.spheres.length)
    }

    destroy(){
        if (this.spheres.length > 0){
            this.destroyBody(0, this.spheres.length)
        }
        this.scene.remove(this.hintBall)
        this.hintBall.material.dispose()
        this.hintBall.geometry.dispose()
        this.hintBall = null
    }
}


class Game{
    constructor(){
        this.loadAssets().then(() => {
            console.log("Start")
            this.initGame()
            this.setGame()
        })
    }

    loadAssets(){
        this.assetsPath = "/game/assets/"

        this.audioAssets = {}
        this.audioLoader = new THREE.AudioLoader()
        this.listener = new THREE.AudioListener()
        const audioFiles = [
            "bgm_End.m4a",
            "bgm_Fight.m4a",
            "bgm_Main.m4a",
            "bgm_Play.m4a",
            "cherrybomb.ogg",
            "points.ogg",
            "reverse_explosion.ogg",
            "swing.ogg",
            "throw.ogg",
            "sfx_wind.wav",
        ];
        const loadAudioPromises = audioFiles.map(filename => this.loadAudioAssets(filename))

        this.textureLoader = new THREE.TextureLoader()
        this.textureAssets = {}
        const textureFiles = [
            "cloud.jpg",
            "explosure.png",
            "taichi_base.jpg",
            "wall.jpg",
        ];
        const loadTexturePromises = textureFiles.map(filename => this.loadTextureAssets(filename))

        this.gltfLoader = new GLTFLoader()
        this.meshAssets = {}
        const meshFiles = [
            "bird.glb",
        ];
        const loadMeshPromises = meshFiles.map(filename => this.loadMeshAssets(filename))
    
        const loadPromises = loadAudioPromises.concat(loadTexturePromises).concat(loadMeshPromises)
        return Promise.all(loadPromises);
    }

    loadAudioAssets(filename){
        const game = this
        const audio = new THREE.Audio(this.listener)
        return new Promise((resolve, reject) => {
            this.audioLoader.load(this.assetsPath + "sound/" + filename, function(AudioBuffer) {
                audio.setBuffer(AudioBuffer)
                game.audioAssets[filename] = audio
                resolve()
            }, 
            function (xhr) {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            function (err) {
                console.error('An error happened while loading the audio', err);
                reject(err)
            })
        })
    }

    loadTextureAssets(filename){
        return new Promise((resolve, reject) => {
            const texture = this.textureLoader.load('/game/assets/material/' + filename)
            this.textureAssets[filename] = texture
            resolve()
        })
    }

    loadMeshAssets(filename){
        const game = this
        return new Promise((resolve, reject) => {
            game.gltfLoader.load('/game/assets/mesh/' + filename, function (gltf){
                game.meshAssets[filename] = gltf
                resolve()
            }, 
            function (xhr) {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            function (err) {
                console.error('An error happened while loading the audio', err);
                reject(err)
            })
        })
    }

    initGame(){
        this.playerNum = 2
        this.playerStats = [true, true]
        
        // Create Scene
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0x87CEEB)
        const axesHelper = new THREE.AxesHelper(5)
        this.scene.add(axesHelper)
        
        // Create Renderer
        this.renderer = new THREE.WebGLRenderer()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(this.renderer.domElement)
        
        // Create Camera
        this.cameras = []
        for (var i = 0; i < this.playerNum; i++){
            const camera = new THREE.PerspectiveCamera(90, 0.5 * window.innerWidth / window.innerHeight, 0.01, 500)
            camera.position.set(20, 20, 20)
            camera.lookAt(0, 0, 0)
            this.cameras.push(camera)
        }
        
        // Add Light
        const light = new THREE.AmbientLight(0x404040, 1)
        this.scene.add(light)
        
        // Add clock
        this.clock = new THREE.Clock()
        
        // Add scene layout
        const directionalLight = new THREE.PointLight(0xffffff, 0.5)
        directionalLight.position.set(0, 50, 0)
        this.scene.add(directionalLight)
        
        this.sceneSize = 80

        this.taichiFloor = new TaichiFloor(this, this.textureAssets['taichi_base.jpg'], this.meshAssets['bird.glb'], this.sceneSize / 8)
        this.scene.add(this.taichiFloor)
        
        const wallWidth = 2
        const wallGeometry = new THREE.BoxGeometry(this.sceneSize, 20, wallWidth)
        const wallTexture = this.textureAssets['wall.jpg']
        wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping
        wallTexture.repeat.set(10.0, 1.0)    
        const wallMaterial = new THREE.MeshBasicMaterial({map: wallTexture})

        const xLeftWallMesh = new THREE.Mesh(wallGeometry, wallMaterial)
        xLeftWallMesh.position.x = -this.sceneSize/2 - wallWidth/2
        xLeftWallMesh.rotation.y = Math.PI / 2
        this.scene.add(xLeftWallMesh)
        const xRightWallMesh = new THREE.Mesh(wallGeometry, wallMaterial)
        xRightWallMesh.position.x = this.sceneSize/2 + wallWidth/2
        xRightWallMesh.rotation.y = -Math.PI / 2
        this.scene.add(xRightWallMesh)
        const zLeftWallMesh = new THREE.Mesh(wallGeometry, wallMaterial)
        zLeftWallMesh.position.z = -this.sceneSize/2 - wallWidth/2
        zLeftWallMesh.rotation.y = 0.0
        this.scene.add(zLeftWallMesh)
        const zRightWallMesh = new THREE.Mesh(wallGeometry, wallMaterial)
        zRightWallMesh.position.z = this.sceneSize/2 + wallWidth/2
        zRightWallMesh.rotation.y = Math.PI
        this.scene.add(zRightWallMesh)

        this.grass = new Grass(this.textureAssets["cloud.jpg"], this.sceneSize, this.sceneSize * this.sceneSize * 50, this.sceneSize / 8)
        this.scene.add(this.grass)
        
        
        // Add key control
        this.keyPressed = {}
        window.addEventListener("keydown", (event) =>{
            const keycode = event.code.toLocaleLowerCase()
            this.keyPressed[keycode] = true
        })
        window.addEventListener("keyup", (event) =>{
            const keycode = event.code.toLocaleLowerCase()
            this.keyPressed[keycode] = false
        })
        
        // Game Stats
        this.gameOver = false
        this.textElement = document.createElement('div');
        this.textElement.style.position = 'absolute';
        this.textElement.style.width = '40%';
        this.textElement.style.height = '20%';
        this.textElement.style.color = 'white';
        this.textElement.style.top = '1%'; // 调整这个值来设置顶部距离
        this.textElement.style.left = '50%';
        this.textElement.style.transform = 'translateX(-50%)'; // 水平居中
        this.textElement.style.fontSize = '2vw';
        this.textElement.style.textAlign = 'center'; // 水平居中文本
        this.textElement.style.lineHeight = '1.2'; // 垂直居中文本
        document.body.appendChild(this.textElement);
        
        this.playElements = []
        for (var i = 0; i < this.playerNum; i++){
            var playElement = document.createElement('div');
            playElement.style.position = 'absolute';
            playElement.style.width = '15%';
            playElement.style.height = '15%';
            playElement.style.color = 'white';
            playElement.style.top = '50%'; // 调整这个值来设置顶部距离
            playElement.style.left = `${i*50+25}%`;
            playElement.style.transform = 'translateX(-50%)'; // 水平居中
            playElement.style.fontSize = '3vw';
            playElement.style.textAlign = 'center'; // 水平居中文本
            playElement.style.lineHeight = '1.2'; // 垂直居中文本
            document.body.appendChild(playElement);
            this.playElements.push(playElement)
        }

        this.bgmMaxVolume = 0.5
        this.bgmFile = 'bgm_Main.m4a'
        this.bgmAudio = this.playAudio(this.bgmFile, true, this.bgmMaxVolume)
        this.bgmChangeStage = "Play"
        this.bgmChangeTime = 1.0
        this.bgmVolume = this.bgmMaxVolume

        this.gameActivate = false
        this.ui = new UI(this)

        this.snakes = []
        this.bullets = []
        this.superBullets = []
    }

    setGame(){
        // reset
        for (var i = 0; i < this.snakes.length; i++){
            this.snakes[i].destroy()
        }
        for (var i = 0; i < this.bullets.length; i++){
            this.bullets[i].destroy()
        }
        for (var i = 0; i < this.superBullets.length; i++){
            this.superBullets[i].destroy()
        }
        this.taichiFloor.reset()

        // Add players
        this.snakes = []
        this.bullets = []
        this.superBullets = []
        const controlKeys = [
            ["keya", "keyd", "keyw", "keys"],
            ["arrowleft", "arrowright", "arrowup", "arrawdown"]
        ]
        this.textElement.innerHTML = ""
        for (var i = 0; i < this.playerNum; i++){
            const snake = new Snake(i, this, new THREE.Vector3(0, 0, (2*i-1)*20), controlKeys[i])
            this.snakes.push(snake)
            this.playElements[i].innerHTML = ""
        }
        
        this.animate()
    }

    GameStart(stats){
        this.setGame()
        this.gameTime = 0.0
        this.gameActivate = true
        this.gameOver = false
        for (var i = 0; i < this.playerNum; i++){
            this.playerStats[i] = stats[i]
            if (!this.playerStats[i]){
                this.snakes[i].isAI = true
            }
            this.snakes[i].isAI = true
        }
        this.startUpdateBgm("Play")
    }
    
    updateEndState(dieStats){
        var allDead = true
        for (var i = 0; i < this.playerNum; i++){
            if (dieStats[i]){
                this.playElements[i].innerHTML = "You Lose!"
            }
            else{
                allDead = false
                this.playElements[i].innerHTML = "You Win!"
            }
        }
        if (allDead)
        {
            var maxLength = 0
            var maxNum = 0
            for (var i = 0; i < this.playerNum; i++){
                if (this.snakes[i].spheres.length > maxLength){
                    maxLength = Math.max(maxLength, this.snakes[i].spheres.length)
                    maxNum = 1
                }
                else if(this.snakes[i].spheres.length == maxLength){
                    maxNum++
                }
            }
            for (var i = 0; i < this.playerNum; i++){
                if (maxLength == this.snakes[i].spheres.length){
                    if (maxNum == 1){
                        this.playElements[i].innerHTML = "You Win!"
                    }
                    else{
                        this.playElements[i].innerHTML = "Draw!"
                    }
                }
            }
        }
        this.audioAssets['sfx_wind.wav'].stop()
        this.playAudio("bgm_End.m4a")
        this.startUpdateBgm("Main")
    }
    
    animate(){
        requestAnimationFrame(this.animate.bind(this))
        const deltaTime = this.clock.getDelta()

        this.grass.update(this.clock.getElapsedTime (), this.taichiFloor.rotateSpeed / this.taichiFloor.rotateMaxSpeed)
        this.taichiFloor.update(deltaTime)

        if (this.gameActivate){
            this.gameTime += deltaTime

            for (var i = 0; i < this.bullets.length; i++){
                const bullet = this.bullets[i]
                bullet.fly(deltaTime)
                for (var j = 0; j < this.playerNum; j++){
                    bullet.detectSnakeCollision(this.snakes[j])
                    if (bullet.toDestroy){
                        break
                    }
                }
                for (var j = i+1; j < this.bullets.length; j++){
                    bullet.detectBulletCollision(this.bullets[j])
                }
                // bullet.detectWallCollision(0, -sceneSize/2)
                // bullet.detectWallCollision(0, sceneSize/2)
                // bullet.detectWallCollision(1, -sceneSize/2)
                // bullet.detectWallCollision(1, sceneSize/2)
            }
            const toDestroyBullets = this.bullets.filter(bullet => bullet.toDestroy)
            this.bullets = this.bullets.filter(bullet => !bullet.toDestroy)
            for (var i = 0; i < toDestroyBullets.length; i++){
                const bullet = toDestroyBullets[i]
                bullet.destroy()
            }
            
            // super bullets
            for (var i = 0; i < this.superBullets.length; i++){
                const bullet = this.superBullets[i]
                bullet.fly(deltaTime)
                for (var j = 0; j < this.playerNum; j++){
                    bullet.detectSnakeCollision(this.snakes[j])
                    if (bullet.toDestroy){
                        break
                    }
                }
            }
            const toDestroySuperBullets = this.superBullets.filter(bullet => bullet.toDestroy)
            this.superBullets = this.superBullets.filter(bullet => !bullet.toDestroy)
            for (var i = 0; i < toDestroySuperBullets.length; i++){
                const bullet = toDestroySuperBullets[i]
                bullet.destroy()
            }
        
            for (var i = 0; i < this.playerNum; i++){
                this.snakes[i].update(deltaTime, this.keyPressed, this.snakes, this.bullets)
            }
            for (var i = 0; i < this.playerNum; i++){
                if (this.snakes[i].mergeCount > 0){
                    for (var j = 0; j < this.playerNum; j++){
                        if (i != j){
                            this.snakes[j].processShootReward(this.snakes[i].mergeCount, this.snakes[i].mergeCombo)
                        }
                    }
                }
            }
            for (var k = 0; k < this.taichiFloor.buttonNum; k++){
                var isPressed = false
                var pressId = null
                for (var i = 0; i < this.playerNum; i++){
                    for (var j = 0; j < this.snakes[i].spheres.length; j++){
                        if (detectCircleCollision(this.snakes[i].spheres[j].position, this.taichiFloor.getButtonCenter(k), this.taichiFloor.buttonRaidus)){
                            isPressed = true
                            pressId = i
                            break
                        }
                    }
                    if (isPressed){
                        break
                    }
                }
                this.taichiFloor.updatePress(k, isPressed, pressId)
            }
        
            this.textElement.innerHTML = ""
            const dieStats = []
            for (var i = 0; i < this.playerNum; i++){
                dieStats.push(this.detectSnakeDeath(i))
            }
            for (var i = 0; i < this.playerNum; i++){
                this.textElement.innerHTML += `Player${i}: `
                this.textElement.innerHTML = this.textElement.innerHTML + `Length ${this.snakes[i].spheres.length}<br>`
                if (dieStats[i]){
                    this.gameOver = true
                    this.gameActivate = false
                    this.ui.showGameOver()
                }
            }
            if (this.gameOver){
                this.updateEndState(dieStats)
            }
        }
    
        for (var i = 0; i < this.playerNum; i++){
            this.renderer.clearDepth()
            this.renderer.setScissorTest(true)
            this.renderer.setScissor(window.innerWidth * i / this.playerNum, 0, window.innerWidth / this.playerNum, window.innerHeight)
            this.renderer.setViewport(window.innerWidth * i / this.playerNum, 0, window.innerWidth / this.playerNum, window.innerHeight)
            this.renderer.render(this.scene, this.cameras[i])
        }

        if (!this.gameOver && this.gameTime > 20.0 && this.bgmFile != "bgm_Fight.m4a"){
            this.startFight()
        }
        this.updateBgm(deltaTime)
    }

    startFight(){
        this.startUpdateBgm("Fight")
        this.taichiFloor.startRotate = true
        this.playAudio("sfx_wind.wav")
    }
    
    createSuperBullet(position, shooterId){
        const superBullet = new SuperBullet(this.scene, this.snakes[shooterId], this.snakes[1-shooterId], position)
        this.superBullets.push(superBullet)
    }

    detectSnakeDeath(i){
        var isDie = false
        if (this.snakes[i].spheres.length == 0){
            return true
        }
        if (this.snakes[i].detectSelfCollision()){
            isDie = true
        }
        else{
            for (var j = 0; j < this.playerNum; j++){
                if (j != i && this.snakes[i].detectSnakeCollision(this.snakes[j])){
                    isDie = true
                }
            }
        }
        isDie |= this.snakes[i].detectWallCollision(0, -this.sceneSize/2)
        isDie |= this.snakes[i].detectWallCollision(0, this.sceneSize/2)
        isDie |= this.snakes[i].detectWallCollision(1, -this.sceneSize/2)
        isDie |= this.snakes[i].detectWallCollision(1, this.sceneSize/2)
        return isDie
    }

    startUpdateBgm(stage){
        this.bgmFile = "bgm_" + stage + ".m4a"
        this.bgmChangeStage = "Out"
    }

    updateBgm(deltaTime){
        if (this.bgmChangeStage == "Out"){
            this.bgmVolume = Math.max(this.bgmVolume - this.bgmMaxVolume / this.bgmChangeTime * deltaTime, 0.0)
            if (this.bgmVolume < 0.01){
                this.bgmChangeStage = "In"
                this.bgmAudio.stop()
                this.bgmAudio = this.playAudio(this.bgmFile, true, 0.0)
            }
        }

        if (this.bgmChangeStage == "In"){
            this.bgmVolume = Math.min(this.bgmVolume + this.bgmMaxVolume / this.bgmChangeTime * deltaTime, this.bgmMaxVolume)
            if (this.bgmVolume > this.bgmMaxVolume - 0.01){
                this.bgmChangeStage = "Play"
            }
        }
        this.bgmAudio.setVolume(this.bgmVolume)
    }

    playAudio(audioFile, loop=false, volume=0.5){
        const audio = this.audioAssets[audioFile]
        audio.setLoop(loop)
        audio.setVolume(volume)
        audio.play()
        // const audioLoader = new THREE.AudioLoader()
        // audioLoader.load(audioFile, function(AudioBuffer) {
        //     audio.setBuffer(AudioBuffer)
        //     audio.setLoop(loop)
        //     audio.setVolume(volume)
        //     audio.play()
        // })
        return audio
    }

}

function getPosition(mesh){
    return new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z)
}

function createSphere(scene, radius, color, opacity, position=null, quaternion=null){
    const sphere_geometry = new THREE.SphereGeometry(radius, 32, 16)
    var material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: opacity < 1.0,
        opacity: opacity,
    })
    const sphere = new THREE.Mesh(sphere_geometry, material)
    if (position != null){
        sphere.position.set(position.x, position.y, position.z)
    }
    if (quaternion != null){
        sphere.setRotationFromQuaternion(quaternion)
    }
    scene.add(sphere)

    return sphere
}

// Get forward vector of actor
function getForwardVector(actor){
    const quat = actor.quaternion
    const forwardVector = new THREE.Vector3(1, 0, 0)
    const actorForwardVector = forwardVector.clone().applyQuaternion(quat)
    return actorForwardVector
}

// Control following ball to follow the forward ball
function moveFollowingSphere(sphere, forward_sphere, max_speed, radius, sphere_overlap_ratio){
    const forward_offset = new THREE.Vector3(
        forward_sphere.position.x - sphere.position.x,
        forward_sphere.position.y - sphere.position.y,
        forward_sphere.position.z - sphere.position.z,
    )
    const forward_distance = forward_offset.length()
    const forward_direction = forward_offset.clone().normalize()
    const speed = forward_distance - (2-sphere_overlap_ratio)*radius
    
    const targetPosition = forward_direction.clone().multiplyScalar(speed).add(getPosition(sphere))
    sphere.position.set(targetPosition.x, targetPosition.y, targetPosition.z)

    // const quat = sphere.quaternion
    // const local_forward_direction = forward_direction.applyQuaternion(quat.invert())
    // sphere.translateOnAxis(local_forward_direction, speed)
}

function getSpheresCollDistance(origin, direction, center, collDisThreshold){
    const offset = origin.clone().sub(center)
    const b = offset.clone().dot(direction) * 2
    const c = offset.clone().dot(offset) - collDisThreshold * collDisThreshold
    const delta = b*b-4*c
    if (delta < 0){
        return null
    }
    const sqrtDelta = Math.sqrt(delta)
    const t1 = 0.5 * (-b-sqrtDelta)
    const t2 = 0.5 * (-b+sqrtDelta)
    if (t1>0){
        return t1
    }
    if (t2<0){
        return null
    }
    return t2
}

// Collision
function detectCircleCollision(position, centerPosition, radius){
    const positionOffset = new THREE.Vector3(position.x-centerPosition.x, position.z-centerPosition.z, 0.0)
    return positionOffset.length() < radius
}
function detectSphereCollision(sphere1, sphereRadius1, sphere2, sphereRadius2){
    const positionOffset = new THREE.Vector3(sphere1.position.x-sphere2.position.x, sphere1.position.y-sphere2.position.y, sphere1.position.z-sphere2.position.z)
    return positionOffset.length() < (sphereRadius1 + sphereRadius2)
}
function detectSurfaceCollision(sphere, sphereRadius, wallAxis, wallPosition){
    // wallAxis: 0 for X, 1 for Z
    if (wallAxis == 0){
        const distance = Math.abs(sphere.position.x - wallPosition)
        return distance < sphereRadius
    }
    if (wallAxis == 1){
        const distance = Math.abs(sphere.position.z - wallPosition)
        return distance < sphereRadius
    }
}

const game = new Game()
