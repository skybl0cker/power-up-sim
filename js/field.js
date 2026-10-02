// Field: carpet, walls, SCALE, SWITCHES, platforms/rungs, vault/exchange, portals.
// Z-up world. Ground planes are NOT rotated (PlaneGeometry XY = ground).
import * as THREE from 'three';
import { CFG } from './config.js';

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...opts });
}
function box(w, d, h, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function tape(len, w, color, x, y, alongX = true) {
  const g = new THREE.PlaneGeometry(alongX ? len : w, alongX ? w : len);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, 0.005);
  return m;
}

// Generic seesaw plate pair (scale or switch). angle>0 tips the -X (blue) side down.
class Seesaw {
  constructor(scene, cx, pivotH, plateW, plateD, maxTilt, plateMat) {
    this.cx = cx; this.pivotH = pivotH; this.maxTilt = maxTilt;
    this.plateD = plateD;
    this.angle = 0; this.angVel = 0;
    this.cubesBlue = []; this.cubesBlueW = 0;
    this.cubesRed = []; this.cubesRedW = 0;
    this.robotW = 0; // extra weight if robot on a plate (not used for scale plates)
    this.group = new THREE.Group();
    this.group.position.set(cx, 0, pivotH);
    scene.add(this.group);
    // axle
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, plateW + 0.3, 12), mat(0x555c66, { metalness: 0.6, roughness: 0.4 }));
    axle.geometry.rotateX(Math.PI / 2);
    this.group.add(axle);
    // plates
    this.plates = {};
    for (const s of [-1, 1]) {
      const pg = new THREE.Group();
      const plate = box(plateD, plateW, 0.06, plateMat, s * plateD / 2, 0, -0.03);
      pg.add(plate);
      // low outer walls on plates
      const wall = box(0.05, plateW, 0.25, plateMat, s * (plateD - 0.025), 0, 0.1);
      pg.add(wall);
      this.group.add(pg);
      this.plates[s < 0 ? 'blue' : 'red'] = pg;
    }
    this.scene = scene;
  }
  edgeHeight(side) { // side: -1 blue, +1 red; outer edge x = side*plateD
    return this.pivotH + side * this.plateD * Math.sin(this.angle) * -1;
  }
  blueEdge() { return this.pivotH - this.plateD * Math.sin(this.angle); }
  redEdge() { return this.pivotH + this.plateD * Math.sin(this.angle); }
  update(dt) {
    const diff = this.cubesBlueW - this.cubesRedW + this.robotW;
    const target = Math.max(-this.maxTilt, Math.min(this.maxTilt, diff * 0.09));
    const acc = (target - this.angle) * 22 - this.angVel * 7;
    this.angVel += acc * dt;
    this.angle += this.angVel * dt;
    this.group.rotation.y = -this.angle; // rotation about Y tips X sides
  }
  addCube(side, mesh) {
    // side -1 blue, +1 red; stack cubes visually on plate
    const list = side < 0 ? this.cubesBlue : this.cubesRed;
    const n = list.length;
    const per = 4;
    const lx = side * (this.plateD / 2) + (side < 0 ? 1 : -1) * 0; // centered on plate
    mesh.position.set(this.cx + side * this.plateD / 2 + ((n % 2) - 0.5) * 0.35,
      ((n % per) - 1.5) * 0.24, this.pivotH + 0.17 + Math.floor(n / per) * 0.28);
    list.push(mesh);
    if (side < 0) this.cubesBlueW += 1; else this.cubesRedW += 1;
  }
}

export function buildField(scene) {
  const F = CFG.FIELD, S = CFG.SCALE, SW = CFG.SWITCH;
  const field = {
    scale: null, switchBlue: null, switchRed: null,
    vaultBlue: 0, vaultCap: 9,
    scaleOwner: null, switchOwner: null,
    scaleHoldT: 0, switchHoldT: 0,
  };

  // carpet — GREY #8a8f94
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(F.L, F.W), mat(F.carpet, { roughness: 0.95 }));
  carpet.receiveShadow = true;
  scene.add(carpet);

  // auto lines (black tape, full width, 10 ft from each alliance wall)
  for (const s of [1, -1]) scene.add(tape(F.W, 0.05, 0x111111, s * F.autoLineX, 0, false));
  // center line (white)
  scene.add(tape(F.W, 0.05, 0xffffff, 0, 0, false));

  // guardrails + alliance walls (transparent polycarb)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x9fb3c8, transparent: true, opacity: 0.25, roughness: 0.2 });
  const railMat = mat(0x2c313a, { roughness: 0.6 });
  const mkWall = (w, x, y, ry = 0) => {
    const g = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, F.wallH), wallMat);
    panel.position.z = F.wallH / 2; g.add(panel);
    const rail = box(w, 0.06, 0.06, railMat, 0, 0, F.wallH); g.add(rail);
    g.position.set(x, y, 0); g.rotation.z = ry; scene.add(g);
    return g;
  };
  mkWall(F.L, 0, F.W / 2); mkWall(F.L, 0, -F.W / 2);
  field.guardWalls = {
    pos: mkWall(F.W, F.L / 2, 0, Math.PI / 2),
    neg: mkWall(F.W, -F.L / 2, 0, Math.PI / 2),
  };

  // alliance station back walls with color stripes (tagged for camera fade)
  field.stationWalls = {};
  for (const s of [1, -1]) {
    const g = new THREE.Group();
    g.add(box(0.15, F.W + 2.4, 2.0, mat(0x23282f), 0, 0, 1.0));
    g.add(box(0.16, F.W + 2.4, 0.25, mat(s > 0 ? 0xd63a2f : 0x1c5fd6), 0, 0, 1.7));
    g.position.set(s * (F.L / 2 + 1.2), 0, 0);
    scene.add(g);
    field.stationWalls[s > 0 ? 'pos' : 'neg'] = g;
  }

  // ---- SCALE ----
  const towerMat = mat(0x3a4048, { metalness: 0.4, roughness: 0.5 });
  const tower = box(S.towerW, 0.6, 2.3, towerMat, 0, 0, 1.15);
  scene.add(tower);
  const plateMat = mat(0xb9c2cc, { metalness: 0.3, roughness: 0.5 });
  field.scale = new Seesaw(scene, 0, S.pivotH, S.plateW, S.plateD, S.maxTilt, plateMat);

  // platforms + ramps + rungs (both sides)
  const platMat = mat(0x2f6db3, { roughness: 0.7 });
  for (const s of [1, -1]) {
    const px = s * (S.towerW / 2 + S.platformW / 2);
    const plat = box(S.platformW, S.platformD, S.platformH, platMat, px, 0, S.platformH / 2);
    scene.add(plat);
    // ramp on outer edge
    const ramp = box(0.35, S.platformD, 0.03, platMat, s * (S.towerW / 2 + S.platformW + 0.15), 0, 0.045);
    ramp.rotation.y = s * -0.27;
    scene.add(ramp);
    // rung: aluminum pipe toward this alliance, top at 2.13 m
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, S.rungLen, 10), mat(0xc8ccd2, { metalness: 0.8, roughness: 0.3 }));
    rung.geometry.rotateZ(Math.PI / 2);
    rung.position.set(s * (S.towerW / 2 + S.rungLen / 2 - 0.02), 0, S.rungTop);
    rung.castShadow = true;
    scene.add(rung);
  }

  // ---- SWITCHES ----
  const mkSwitch = (s) => {
    const cx = s * (F.L / 2 - SW.distFromWall);
    const post = box(0.25, 0.25, SW.pivotH, towerMat, cx, 0, SW.pivotH / 2);
    scene.add(post);
    const sw = new Seesaw(scene, cx, SW.pivotH, SW.plateW, SW.plateD, SW.maxTilt, plateMat);
    // fence frame around switch
    const fence = mat(0x4a5058, { metalness: 0.5, roughness: 0.5 });
    for (const fy of [-0.75, 0.75]) scene.add(box(1.7, 0.05, 0.5, fence, cx, fy, 0.25));
    return sw;
  };
  field.switchBlue = mkSwitch(-1);
  field.switchRed = mkSwitch(1);

  // ---- EXCHANGE + VAULT (blue alliance station) ----
  const ex = -F.L / 2; // alliance wall x
  const exWall = box(0.1, 1.22, 1.97, mat(0xcfd6de, { transparent: true, opacity: 0.5 }), ex - 0.05, -1.5, 0.985);
  scene.add(exWall);
  // delivery opening (dark inset)
  scene.add(box(0.12, 0.41, 0.5, mat(0x14161a), ex - 0.05, -1.5, 0.25));
  // vault: 3 columns behind the wall
  field.vaultMeshes = [];
  for (let i = 0; i < 3; i++) {
    const col = box(0.34, 0.5, 1.2, mat(0x8a93a0, { transparent: true, opacity: 0.6 }), ex - 0.8, -1.9 + i * 0.45, 0.6);
    scene.add(col); field.vaultMeshes.push(col);
  }
  // exchange zone tape (4 ft x 3 ft in front of wall)
  scene.add(tape(1.22, 0.05, 0xffffff, ex + 0.61, -1.5 + 0.455, true));
  scene.add(tape(1.22, 0.05, 0xffffff, ex + 0.61, -1.5 - 0.455, true));
  field.exchangeZone = { x0: ex, x1: ex + 1.22, y0: -1.955, y1: -1.045 };

  // ---- PORTALS (blue, two corners) ----
  field.portals = [];
  for (const sy of [1, -1]) {
    const py = sy * (F.W / 2 - 0.61);
    scene.add(tape(3.94, 0.05, 0xffffff, ex + 1.97, py - sy * 0.61, true));
    field.portals.push({ x0: ex, x1: ex + 3.94, y0: Math.min(py - sy * 0.61, py + sy * 0.61), y1: Math.max(py - sy * 0.61, py + sy * 0.61) });
  }

  field.update = (dt) => {
    field.scale.update(dt);
    field.switchBlue.update(dt);
    field.switchRed.update(dt);
    // ownership evaluation with 1 s hold
    const sc = field.scale;
    const scBlue = sc.blueEdge() <= S.ownEdge, scRed = sc.redEdge() <= S.ownEdge;
    const swB = field.switchBlue, swR = field.switchRed;
    const swBlue = swB.blueEdge() <= SW.ownEdge, swRed = swR.redEdge() <= SW.ownEdge;
    field._evalOwn('scale', scBlue, scRed, dt);
    field._evalOwn('switch', swBlue, swRed, dt);
  };
  field._evalOwn = (which, blue, red, dt) => {
    const key = which + 'Owner', hold = which + 'HoldT', cand = which + 'Cand';
    const cur = blue ? 'blue' : (red ? 'red' : null);
    if (cur && cur === field[cand]) field[hold] += dt; else { field[cand] = cur; field[hold] = 0; }
    if (field[hold] >= 1.0) field[key] = cur; else if (!cur) field[key] = null;
  };
  return field;
}
