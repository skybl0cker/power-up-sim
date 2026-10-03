// Power cubes: 13" milk-crate style cubes with rigid-body physics.
import * as THREE from 'three';
import { CFG } from './config.js';

const cubeMat = new THREE.MeshStandardMaterial({ color: 0xf7c948, roughness: 0.85 });
// milk-crate: yellow frame with darker inset panels
const panelMat = new THREE.MeshStandardMaterial({ color: 0xd9a416, roughness: 0.9 });

export function makeCubeMesh() {
  // Z-up: BoxGeometry(x, y, z); vertical extent is z.
  const s = CFG.CUBE.w, h = CFG.CUBE.h;
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.BoxGeometry(s, s, h), cubeMat);
  core.castShadow = true;
  g.add(core);
  const e = s * 0.12;
  const xbar = new THREE.BoxGeometry(s + 0.01, e, e);   // along X
  const ybar = new THREE.BoxGeometry(e, s + 0.01, e);   // along Y
  const zbar = new THREE.BoxGeometry(e, e, h + 0.01);   // vertical
  for (const zz of [h / 2, -h / 2]) for (const yy of [s / 2, -s / 2]) {
    const m = new THREE.Mesh(xbar, panelMat); m.position.set(0, yy, zz); g.add(m);
  }
  for (const zz of [h / 2, -h / 2]) for (const xx of [s / 2, -s / 2]) {
    const m = new THREE.Mesh(ybar, panelMat); m.position.set(xx, 0, zz); g.add(m);
  }
  for (const xx of [s / 2, -s / 2]) for (const yy of [s / 2, -s / 2]) {
    const m = new THREE.Mesh(zbar, panelMat); m.position.set(xx, yy, 0); g.add(m);
  }
  return g;
}

export class PieceManager {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.pieces = []; // {mesh, x, y, z, state, body}
  }
  add(x, y, z = CFG.CUBE.h / 2, state = 'floor') {
    const mesh = makeCubeMesh();
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    const p = { mesh, x, y, z, state, body: null };
    this.pieces.push(p);
    if (this.physics && (state === 'floor' || state === 'portal')) this.physics.addCube(p);
    return p;
  }
  remove(p) {
    if (this.physics) this.physics.removeCube(p);
    this.scene.remove(p.mesh);
    this.pieces.splice(this.pieces.indexOf(p), 1);
  }
  // take a floor cube into the intake: strip physics, caller attaches mesh
  grab(p) {
    if (this.physics) this.physics.removeCube(p);
    p.state = 'held';
    this.scene.remove(p.mesh);
  }
  // release a held cube back to the world as a live physics body
  release(p, x, y) {
    p.state = 'floor';
    this.scene.add(p.mesh);
    p.mesh.quaternion.identity();
    if (this.physics) this.physics.dropCube(p, x, y);
  }
  nearest(x, y, range) {
    let best = null, bd = range;
    for (const p of this.pieces) {
      if (p.state !== 'floor' && p.state !== 'portal') continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
}
