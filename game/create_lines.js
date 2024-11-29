
// import * as THREE from 'three';

// Create Scene
const scene = new THREE.Scene()

// Create Camera
const camera = new THREE.PerspectiveCamera(45, 320 / 240, 1, 500)
camera.position.set(0, 0, 100)
camera.lookAt(0, 0, 0)

// Create Renderer
const renderer = new THREE.WebGLRenderer()
renderer.setSize(320, 240)
document.body.appendChild(renderer.domElement)

// Create Line
const material = new THREE.LineBasicMaterial({color: 0x0000ff})
const points = []
points.push(new THREE.Vector3(-10, 0, 0))
points.push(new THREE.Vector3(0, 10, 0))
points.push(new THREE.Vector3(10, 0, 0))
const geometry = new THREE.BufferGeometry().setFromPoints(points)

const line = new THREE.Line(geometry, material)
scene.add(line)
renderer.render(scene, camera)