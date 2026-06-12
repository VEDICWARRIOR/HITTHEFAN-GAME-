import * as CANNON from 'cannon-es';

let world;
let physicalDebrisList = []; // list of { mesh, body }

export function initPhysics() {
  world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);

  // Material and Contact material tuning
  const defaultMaterial = new CANNON.Material('default');
  const contactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
      restitution: 0.55, // bouncy debris!
      friction: 0.2,
    }
  );
  world.addContactMaterial(contactMaterial);

  // Add boundary collision planes (floor, walls, ceiling)
  // 1. Floor at y = -2.5
  const floorBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: defaultMaterial,
  });
  floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  floorBody.position.set(0, -2.5, 0);
  world.addBody(floorBody);

  // 2. Ceiling at y = 2.0
  const ceilingBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: defaultMaterial,
  });
  ceilingBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
  ceilingBody.position.set(0, 2.0, 0);
  world.addBody(ceilingBody);

  // 3. Back Wall at z = -2.0
  const backWallBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: defaultMaterial,
  });
  backWallBody.position.set(0, 0, -2.0);
  world.addBody(backWallBody);

  // 4. Front Wall at z = 3.0
  const frontWallBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: defaultMaterial,
  });
  frontWallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI);
  frontWallBody.position.set(0, 0, 3.0);
  world.addBody(frontWallBody);

  // 5. Left Wall at x = -2.5
  const leftWallBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: defaultMaterial,
  });
  leftWallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
  leftWallBody.position.set(-2.5, 0, 0);
  world.addBody(leftWallBody);

  // 6. Right Wall at x = 2.5
  const rightWallBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: defaultMaterial,
  });
  rightWallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
  rightWallBody.position.set(2.5, 0, 0);
  world.addBody(rightWallBody);

  console.log("Cannon.js physics engine initialized");
}

export function spawnPhysicalDebris(threeMesh, dimensions, position, velocity, angularVelocity) {
  if (!world) return;

  const halfExtents = new CANNON.Vec3(dimensions.x / 2, dimensions.y / 2, dimensions.z / 2);
  const shape = new CANNON.Box(halfExtents);

  const body = new CANNON.Body({
    mass: 1.2,
    position: new CANNON.Vec3(position.x, position.y, position.z),
    shape: shape,
    velocity: new CANNON.Vec3(velocity.x, velocity.y, velocity.z),
    angularVelocity: new CANNON.Vec3(angularVelocity.x, angularVelocity.y, angularVelocity.z),
    linearDamping: 0.1,
    angularDamping: 0.1,
  });

  world.addBody(body);
  physicalDebrisList.push({ mesh: threeMesh, body: body });
}

export function updatePhysics(dt) {
  if (!world) return;

  // Step physics world
  world.step(Math.min(dt, 0.1));

  // Sync positions and rotations from Cannon body to Three.js meshes
  for (let i = physicalDebrisList.length - 1; i >= 0; i--) {
    const item = physicalDebrisList[i];
    item.mesh.position.copy(item.body.position);
    item.mesh.quaternion.copy(item.body.quaternion);

    // Fade out or handle out of bounds (safety fallback)
    if (item.body.position.y < -5) {
      world.removeBody(item.body);
      physicalDebrisList.splice(i, 1);
    }
  }
}

export function clearPhysicalDebris() {
  if (!world) return;
  for (const item of physicalDebrisList) {
    world.removeBody(item.body);
  }
  physicalDebrisList = [];
}
