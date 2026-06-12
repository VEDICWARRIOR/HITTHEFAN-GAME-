import * as THREE from 'three';
import gsap from 'gsap';
import { SparkSystem, SmokeSystem, DebrisSystem, HeatGlow } from './particles.js';
import { initPhysics } from '../physics/physics.js';

const baseCameraPos = { x: 0, y: -5.2, z: 3.8 };
let cameraLookAtY = 0.6;

let scene;
let camera;
let renderer;
let containerEl;
let fanGroup;
let bladesGroup;
let sparks;
let smoke;
let debris;
let heatGlow;
let wallMesh;
let ceilingMesh;
const bladeMaterials = [];
const motorMaterials = [];
const metalMaterials = [];
let currentRotationSpeed = 0;
let targetRotationSpeed = 0;
let isDestroyed = false;
let shakeIntensity = 0;
let clock;

const BLADE_COLOR = 0x2c1c14;
const MOTOR_COLOR = 0x6a5540;
const ROD_COLOR = 0x9b7a4c;
const MOUNT_COLOR = 0x4d463e;
let currentBladeColor = BLADE_COLOR;

export function initScene() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x171614);

  containerEl = document.getElementById('canvas-container') || document.body;
  const { width, height } = _getViewportSize();
  camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
  camera.position.set(baseCameraPos.x, baseCameraPos.y, baseCameraPos.z);
  camera.lookAt(0, cameraLookAtY, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  containerEl.appendChild(renderer.domElement);

  _setupLighting();
  _buildRoom();
  _buildFan();

  sparks = new SparkSystem(scene);
  smoke = new SmokeSystem(scene);
  debris = new DebrisSystem(scene);
  heatGlow = new HeatGlow(scene);

  initPhysics();

  window.addEventListener('resize', _onResize);

  return { scene, camera, renderer };
}

export function setFanSpeed(rpm) {
  if (isDestroyed) return;
  targetRotationSpeed = (rpm / 60) * Math.PI * 2;
}

export function setDangerLevel(pct) {
  if (isDestroyed) return;
  const glowPct = Math.max(0, (pct - 0.5) * 2);
  heatGlow.setIntensity(glowPct);
  shakeIntensity = pct > 0.82 ? (pct - 0.82) / 0.18 : 0;
}

export function destroyFan() {
  if (isDestroyed) return;
  isDestroyed = true;

  const origin = new THREE.Vector3(0, 0.08, 0);
  if (bladesGroup) bladesGroup.visible = false;

  sparks.emit(origin);
  smoke.emit(origin);
  debris.emit(origin, currentBladeColor);

  scene.background = new THREE.Color(0x3d1208);
  setTimeout(() => {
    scene.background = scene.userData.themeFog || new THREE.Color(0x171614);
  }, 150);

  heatGlow.setIntensity(0);
  shakeIntensity = 0;
}

export function resetFan() {
  isDestroyed = false;
  targetRotationSpeed = 0;
  currentRotationSpeed = 0;
  shakeIntensity = 0;

  if (bladesGroup) {
    bladesGroup.visible = true;
    bladesGroup.rotation.y = 0;
  }

  if (fanGroup) {
    fanGroup.position.set(0, 0, 0);
    fanGroup.rotation.set(0, 0, 0);
  }

  heatGlow.setIntensity(0);
  scene.background = scene.userData.themeFog || new THREE.Color(0x171614);
}

export function updateScene() {
  const dt = clock.getDelta();
  currentRotationSpeed += (targetRotationSpeed - currentRotationSpeed) * Math.min(1, dt * 5.5);

  if (bladesGroup && !isDestroyed) {
    bladesGroup.rotation.y += currentRotationSpeed * dt;

    const blurFactor = Math.min(1, currentRotationSpeed / 31);
    bladesGroup.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      child.material.opacity = 1 - blurFactor * 0.38;
      child.material.transparent = blurFactor > 0.08;
    });
  }

  if (fanGroup && shakeIntensity > 0 && !isDestroyed) {
    const t = Date.now() * 0.015;
    fanGroup.position.x = Math.sin(t * 3.7) * shakeIntensity * 0.07;
    fanGroup.position.z = Math.cos(t * 2.3) * shakeIntensity * 0.07;
    fanGroup.rotation.z = Math.sin(t * 5.1) * shakeIntensity * 0.025;
    fanGroup.rotation.x = Math.cos(t * 4.3) * shakeIntensity * 0.025;
  } else if (fanGroup && !isDestroyed) {
    fanGroup.position.set(0, 0, 0);
    fanGroup.rotation.set(0, 0, 0);
  }
  if (shakeIntensity > 0 && !isDestroyed) {
    const t = Date.now() * 0.01;
    camera.position.x = baseCameraPos.x + Math.sin(t * 7) * shakeIntensity * 0.034;
    camera.position.y = baseCameraPos.y;
    camera.position.z = baseCameraPos.z + Math.cos(t * 5) * shakeIntensity * 0.034;
  } else if (!isDestroyed) {
    camera.position.set(baseCameraPos.x, baseCameraPos.y, baseCameraPos.z);
  }
  camera.lookAt(0, cameraLookAtY, 0);

  sparks.update(dt);
  smoke.update(dt);
  debris.update(dt);
  heatGlow.update(dt);

  renderer.render(scene, camera);
}
export function getCanvas() {
  return renderer?.domElement;
}
export function transitionCamera(toState) {
  if (toState === 'LOBBY') {
    gsap.to(baseCameraPos, {
      x: 0,
      y: -5.2,
      z: 3.8,
      duration: 1.2,
      ease: 'power2.inOut',
    });
    const target = { y: cameraLookAtY };
    gsap.to(target, {
      y: 0.6,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        cameraLookAtY = target.y;
      }
    });
  } else {
    gsap.to(baseCameraPos, {
      x: 0,
      y: -3.9,
      z: 2.45,
      duration: 1.0,
      ease: 'power2.out',
    });
    const target = { y: cameraLookAtY };
    gsap.to(target, {
      y: 0.18,
      duration: 1.0,
      ease: 'power2.out',
      onUpdate: () => {
        cameraLookAtY = target.y;
      }
    });
  }
}

export function setVisualProfile(fan, theme) {
  if (fan) {
    currentBladeColor = new THREE.Color(fan.blade).getHex();
    bladeMaterials.forEach((mat) => mat.color.set(fan.blade));
    motorMaterials.forEach((mat) => mat.color.set(fan.motor));
    metalMaterials.forEach((mat) => mat.color.set(fan.metal));

    if (bladesGroup) {
      while (bladesGroup.children.length > 0) {
        bladesGroup.remove(bladesGroup.children[0]);
      }

      const count = fan.blades || 3;
      bladeMaterials.length = 0;
      for (let i = 0; i < count; i += 1) {
        const blade = _createBlade(fan.blade, fan.metal);
        blade.rotation.y = (i / count) * Math.PI * 2;
        bladesGroup.add(blade);
      }
    }
  }

  if (theme) {
    const fogColor = new THREE.Color(theme.fog);
    scene.background = fogColor;
    scene.userData.themeFog = fogColor;
    if (wallMesh) wallMesh.material.color.set(theme.wall);
    if (ceilingMesh) ceilingMesh.material.color.set(theme.ceiling);
  }
}

function _buildRoom() {
  const wallGeo = new THREE.PlaneGeometry(8, 13);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x3b3934,
    roughness: 0.9,
    metalness: 0.02,
  });
  wallMesh = new THREE.Mesh(wallGeo, wallMat);
  wallMesh.position.set(0, 1.55, -1.85);
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);

  const ceilingGeo = new THREE.CircleGeometry(3.2, 64);
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x252421,
    roughness: 0.82,
    metalness: 0.03,
  });
  ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.y = 1.55;
  ceilingMesh.receiveShadow = true;
  scene.add(ceilingMesh);
}

function _buildFan() {
  fanGroup = new THREE.Group();
  scene.add(fanGroup);

  const mountMat = new THREE.MeshStandardMaterial({ color: MOUNT_COLOR, roughness: 0.48, metalness: 0.42 });
  metalMaterials.push(mountMat);
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.09, 32), mountMat);
  mount.position.y = 1.5;
  mount.castShadow = true;
  fanGroup.add(mount);

  const rodMat = new THREE.MeshStandardMaterial({ color: ROD_COLOR, roughness: 0.3, metalness: 0.72 });
  metalMaterials.push(rodMat);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.18, 16), rodMat);
  rod.position.y = 0.9;
  rod.castShadow = true;
  fanGroup.add(rod);

  const motorMat = new THREE.MeshStandardMaterial({ color: MOTOR_COLOR, roughness: 0.4, metalness: 0.55 });
  motorMaterials.push(motorMat);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.24, 32), motorMat);
  motor.position.y = 0.2;
  motor.castShadow = true;
  fanGroup.add(motor);

  const capMat = new THREE.MeshStandardMaterial({ color: MOTOR_COLOR, roughness: 0.38, metalness: 0.52 });
  motorMaterials.push(capMat);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), capMat);
  cap.position.y = 0.04;
  cap.rotation.x = Math.PI;
  cap.castShadow = true;
  fanGroup.add(cap);

  bladesGroup = new THREE.Group();
  bladesGroup.position.y = 0.15;
  fanGroup.add(bladesGroup);

  for (let i = 0; i < 3; i += 1) {
    const blade = _createBlade();
    blade.rotation.y = (i / 3) * Math.PI * 2;
    bladesGroup.add(blade);
  }
}
function _createBlade(bladeColor, metalColor) {
  const bladeGroup = new THREE.Group();

  const bracketMat = new THREE.MeshStandardMaterial({
    color: metalColor ? new THREE.Color(metalColor) : new THREE.Color(ROD_COLOR),
    roughness: 0.3,
    metalness: 0.65
  });
  metalMaterials.push(bracketMat);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.34), bracketMat);
  bracket.position.set(0, -0.04, 0.24);
  bracket.castShadow = true;
  bladeGroup.add(bracket);

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.2, 0.34);
  bladeShape.lineTo(0.18, 1.68);
  bladeShape.bezierCurveTo(0.15, 1.86, -0.15, 1.86, -0.18, 1.68);
  bladeShape.lineTo(-0.2, 0.34);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
  });

  const bladeMat = new THREE.MeshStandardMaterial({
    color: bladeColor ? new THREE.Color(bladeColor) : new THREE.Color(BLADE_COLOR),
    roughness: 0.58,
    metalness: 0.22,
    side: THREE.DoubleSide,
  });
  bladeMaterials.push(bladeMat);
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.rotation.x = -Math.PI / 2 + 0.1;
  blade.position.set(0, -0.02, 0.3);
  blade.castShadow = true;
  blade.receiveShadow = true;
  bladeGroup.add(blade);

  return bladeGroup;
}

function _setupLighting() {
  scene.add(new THREE.AmbientLight(0xfff5e6, 0.34));

  const keyLight = new THREE.DirectionalLight(0xfff0dd, 1.85);
  keyLight.position.set(2.4, 5, 3.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd8e5ff, 0.5);
  fillLight.position.set(-3, -2, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffc080, 0.75);
  rimLight.position.set(0, -1, -4);
  scene.add(rimLight);

  const hubLight = new THREE.PointLight(0xff9940, 0.62, 5);
  hubLight.position.set(0, 0.1, 0);
  scene.add(hubLight);
}

function _onResize() {
  const { width, height } = _getViewportSize();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function _getViewportSize() {
  const rect = containerEl?.getBoundingClientRect();
  return {
    width: Math.max(1, rect?.width || window.innerWidth),
    height: Math.max(1, rect?.height || window.innerHeight),
  };
}
