// Field: broadcast-style arena — marked carpet, alliance walls, driver stations
// with E-stops + indicator stacks, polycarbonate shielding, overhead truss with
// spotlights, LED perimeter strips, SCALE / SWITCHES / vault / portals.
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

// ---- canvas textures ----
function carpetTexture() {
  const F = CFG.FIELD, Wpx = 2048, Hpx = 1024;
  const c = document.createElement('canvas'); c.width = Wpx; c.height = Hpx;
  const g = c.getContext('2d');
  const X = fx => (fx + F.L / 2) / F.L * Wpx;
  const Y = fy => (fy + F.W / 2) / F.W * Hpx;
  const SX = Wpx / F.L, SY = Hpx / F.W;
  // grey carpet base with subtle noise
  g.fillStyle = '#8a8f94'; g.fillRect(0, 0, Wpx, Hpx);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${100 + Math.random() * 40 | 0},${105 + Math.random() * 40 | 0},${110 + Math.random() * 40 | 0},0.25)`;
    g.fillRect(Math.random() * Wpx, Math.random() * Hpx, 2, 2);
  }
  const line = (x0, y0, x1, y1, color, wpx) => {
    g.strokeStyle = color; g.lineWidth = wpx; g.beginPath();
    g.moveTo(X(x0), Y(y0)); g.lineTo(X(x1), Y(y1)); g.stroke();
  };
  // field boundary (white)
  g.strokeStyle = '#f2f4f6'; g.lineWidth = 6;
  g.strokeRect(X(-F.L / 2 + 0.1), Y(-F.W / 2 + 0.1), (F.L - 0.2) * SX, (F.W - 0.2) * SY);
  // auto lines: dark tape, 10 ft from each alliance wall, full width
  for (const s of [1, -1]) line(s * F.autoLineX, -F.W / 2, s * F.autoLineX, F.W / 2, '#1a1c1e', 8);
  // center line (white)
  line(0, -F.W / 2, 0, F.W / 2, '#f2f4f6', 6);
  // exchange zones: 4 ft x 3 ft outlines against each alliance wall
  for (const s of [1, -1]) {
    const x0 = s * F.L / 2 - (s > 0 ? 1.22 : 0), x1 = x0 + (s > 0 ? -1.22 : 1.22);
    const y0 = -1.955, y1 = -1.045;
    g.strokeStyle = '#f2f4f6'; g.lineWidth = 5;
    g.strokeRect(X(Math.min(x0, x1)), Y(y0), Math.abs(x1 - x0) * SX, (y1 - y0) * SY);
  }
  // NULL TERRITORY: green rectangles top-center and bottom-center (per game manual diagram)
  for (const sy of [1, -1]) {
    const x0 = -1.0, x1 = 1.0, y0 = sy > 0 ? 2.2 : -3.2, y1 = sy > 0 ? 3.2 : -2.2;
    g.fillStyle = 'rgba(46,139,87,0.30)';
    g.fillRect(X(x0), Y(y0), (x1 - x0) * SX, (y1 - y0) * SY);
    g.strokeStyle = '#2e8b57'; g.lineWidth = 5;
    g.strokeRect(X(x0), Y(y0), (x1 - x0) * SX, (y1 - y0) * SY);
  }
  // PLATFORM ZONE: yellow outline around the scale, red/blue halves
  {
    const x0 = -3.0, x1 = 3.0, y0 = -1.7, y1 = 1.7;
    g.fillStyle = 'rgba(214,58,47,0.07)'; g.fillRect(X(x0), Y(y0), (0 - x0) * SX, (y1 - y0) * SY);
    g.fillStyle = 'rgba(28,95,214,0.07)'; g.fillRect(X(0), Y(y0), (x1 - 0) * SX, (y1 - y0) * SY);
    g.strokeStyle = '#f7c948'; g.lineWidth = 6;
    g.strokeRect(X(x0), Y(y0), (x1 - x0) * SX, (y1 - y0) * SY);
    line(0, y0, 0, y1, '#f7c948', 5);
  }
  // STARTING LINES: short white lines just in front of each alliance wall
  for (const s of [1, -1]) line(s * 7.6, -1.8, s * 7.6, 1.8, '#f2f4f6', 6);
  // POWER CUBE ZONES: yellow outlines around the 6-cube stacks by each switch
  for (const s of [1, -1]) {
    const swx = s * (F.L / 2 - 4.27);
    const x0 = swx + (s < 0 ? 0.6 : -1.5), x1 = swx + (s < 0 ? 1.5 : -0.6);
    g.strokeStyle = '#f7c948'; g.lineWidth = 5;
    g.strokeRect(X(Math.min(x0, x1)), Y(-1.9), Math.abs(x1 - x0) * SX, 3.4 * SY);
  }
  // portal zones along alliance walls
  for (const s of [1, -1]) for (const sy of [1, -1]) {
    const py = sy * (F.W / 2 - 0.61);
    g.strokeStyle = 'rgba(242,244,246,0.85)'; g.lineWidth = 5;
    g.strokeRect(X(s * F.L / 2 - (s > 0 ? 3.94 : 0)) , Y(Math.min(py - sy * 0.61, py + sy * 0.61)),
      3.94 * SX, 1.22 * SY);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function diamondPlateTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3d434c'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#565e68'; g.lineWidth = 5;
  for (let i = -128; i < 256; i += 24) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 128); g.stroke();
    g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 128); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Generic seesaw plate pair (scale or switch). angle>0 tips the -X (blue) side down.
class Seesaw {
  constructor(scene, cx, pivotH, plateW, plateD, maxTilt, plateMat, railMat) {
    this.cx = cx; this.pivotH = pivotH; this.maxTilt = maxTilt;
    this.plateD = plateD;
    this.angle = 0; this.angVel = 0;
    this.cubesBlueW = 0; this.cubesRedW = 0;
    this.robotW = 0;
    this.group = new THREE.Group();
    this.group.position.set(cx, 0, pivotH);
    scene.add(this.group);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, plateW + 0.3, 12), mat(0x555c66, { metalness: 0.6, roughness: 0.4 }));
    axle.geometry.rotateX(Math.PI / 2);
    this.group.add(axle);
    this.plates = {};
    for (const s of [-1, 1]) {
      const pg = new THREE.Group();
      pg.add(box(plateD, plateW, 0.06, plateMat, s * plateD / 2, 0, -0.03));
      // railing on outer edge (real plates have guard rails)
      pg.add(box(0.04, plateW, 0.3, railMat, s * (plateD - 0.02), 0, 0.12));
      for (const e of [-1, 1]) pg.add(box(plateD, 0.04, 0.3, railMat, s * plateD / 2, e * (plateW / 2 - 0.02), 0.12));
      this.group.add(pg);
      this.plates[s < 0 ? 'blue' : 'red'] = pg;
    }
    this.scene = scene;
  }
  blueEdge() { return this.pivotH - this.plateD * Math.sin(this.angle); }
  redEdge() { return this.pivotH + this.plateD * Math.sin(this.angle); }
  update(dt) {
    const diff = this.cubesBlueW - this.cubesRedW + this.robotW;
    const target = Math.max(-this.maxTilt, Math.min(this.maxTilt, diff * 0.09));
    const acc = (target - this.angle) * 22 - this.angVel * 7;
    this.angVel += acc * dt;
    this.angle += this.angVel * dt;
    this.group.rotation.y = -this.angle;
  }
  addCube(side, mesh) {
    const n = (side < 0 ? this._nb = (this._nb || 0) + 1 : this._nr = (this._nr || 0) + 1) - 1;
    const per = 4;
    mesh.position.set(this.cx + side * this.plateD / 2 + ((n % 2) - 0.5) * 0.35,
      ((n % per) - 1.5) * 0.24, this.pivotH + 0.17 + Math.floor(n / per) * 0.28);
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
    stacks: [], ledMats: [],
  };

  // carpet with baked regulation markings
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(F.L, F.W),
    new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 0.95 }));
  carpet.receiveShadow = true;
  scene.add(carpet);
  // dark surround floor
  const surround = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), mat(0x14171c, { roughness: 1 }));
  surround.position.z = -0.02; surround.receiveShadow = true;
  scene.add(surround);

  // guardrails + polycarbonate walls (long sides)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x9fb3c8, transparent: true, opacity: 0.22, roughness: 0.15, metalness: 0.1 });
  const railMat = mat(0x2c313a, { roughness: 0.6 });
  const mkWall = (w, x, y, ry = 0) => {
    const g = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, F.wallH), wallMat);
    panel.position.z = F.wallH / 2; g.add(panel);
    g.add(box(w, 0.06, 0.06, railMat, 0, 0, F.wallH));
    g.position.set(x, y, 0); g.rotation.z = ry; scene.add(g);
    return g;
  };
  mkWall(F.L, 0, F.W / 2); mkWall(F.L, 0, -F.W / 2);
  field.guardWalls = {
    pos: mkWall(F.W, F.L / 2, 0, Math.PI / 2),
    neg: mkWall(F.W, -F.L / 2, 0, Math.PI / 2),
  };

  // LED perimeter strips along the long walls (alliance-colored halves)
  for (const sy of [1, -1]) {
    for (const sx of [1, -1]) {
      const lm = new THREE.MeshBasicMaterial({ color: sx > 0 ? 0xff2a20 : 0x1c5fd6 });
      const strip = new THREE.Mesh(new THREE.BoxGeometry(F.L / 2, 0.05, 0.05), lm);
      strip.position.set(sx * F.L / 4, sy * (F.W / 2 + 0.04), F.wallH + 0.05);
      scene.add(strip);
      field.ledMats.push({ mat: lm, base: sx > 0 ? 0xff2a20 : 0x1c5fd6 });
    }
  }

  // ---- alliance stations: back wall + driver stations ----
  const dpTex = diamondPlateTexture();
  field.stationWalls = {};
  for (const s of [1, -1]) {
    const g = new THREE.Group();
    g.add(box(0.15, F.W + 2.4, 2.0, mat(0x23282f), 0, 0, 1.0));
    g.add(box(0.16, F.W + 2.4, 0.25, mat(s > 0 ? 0xd63a2f : 0x1c5fd6), 0, 0, 1.7));
    // driver station shelf (diamond plate) with 3 slots
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, F.W * 0.8, 0.06),
      new THREE.MeshStandardMaterial({ map: dpTex, roughness: 0.5, metalness: 0.6 }));
    shelf.position.set(-s * 0.55, 0, 0.95); shelf.castShadow = true;
    g.add(shelf);
    for (let i = -1; i <= 1; i++) {
      const y = i * 1.35;
      // E-stop: yellow base + red mushroom
      g.add(box(0.1, 0.12, 0.06, mat(0xd8b400), -s * 0.55, y + 0.3, 1.0));
      const mush = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.05, 12), mat(0xc02020, { roughness: 0.4 }));
      mush.position.set(-s * 0.55, y + 0.3, 1.05); g.add(mush);
      // indicator stack: pole + 3 lamps (red/amber/green)
      g.add(box(0.04, 0.04, 0.7, mat(0x22262c), -s * 0.35, y - 0.45, 1.3));
      const lamps = {};
      const cols = { red: 0xff2222, amber: 0xffaa00, green: 0x22ff55 };
      let li = 0;
      for (const k of ['red', 'amber', 'green']) {
        const lm = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x000000 });
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.09, 10), lm);
        lamp.position.set(-s * 0.35, y - 0.45, 1.5 + li * 0.11);
        g.add(lamp); lamps[k] = lm; li++;
      }
      field.stacks.push(lamps);
    }
    g.position.set(s * (F.L / 2 + 1.2), 0, 0);
    scene.add(g);
    field.stationWalls[s > 0 ? 'pos' : 'neg'] = g;
  }
  field.setStack = (phase) => {
    // pre: amber · auto/teleop: green · endgame: amber · done: red
    const on = { red: 0, amber: 0, green: 0 };
    if (phase === 'pre') on.amber = 1;
    else if (phase === 'done') on.red = 1;
    else on.green = 1;
    for (const lamps of field.stacks) for (const k of ['red', 'amber', 'green']) {
      const cols = { red: 0xff2222, amber: 0xffaa00, green: 0x22ff55 };
      lamps[k].emissive.setHex(on[k] ? cols[k] : 0x000000);
      lamps[k].emissiveIntensity = on[k] ? 1.6 : 0;
    }
  };

  // ---- overhead truss + spotlights + fake volumetrics ----
  const trussMat = mat(0x1c1f24, { metalness: 0.5, roughness: 0.5 });
  for (const ty of [-2.7, 0, 2.7]) {
    scene.add(box(F.L + 4, 0.25, 0.25, trussMat, 0, ty, 6.2));
    for (let bx = -8; bx <= 8; bx += 2) scene.add(box(0.08, 0.27, 0.27, trussMat, bx, ty, 6.2));
  }
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2cc, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const ty of [-2.7, 0, 2.7]) for (const tx of [-5, 5]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 6.2, 20, 1, true), coneMat);
    cone.position.set(tx, ty, 3.1);
    scene.add(cone);
    const spot = new THREE.SpotLight(0xfff2d8, 350, 20, 0.5, 0.45, 1.6);
    spot.position.set(tx, ty, 6.1);
    spot.target.position.set(tx, ty, 0);
    scene.add(spot); scene.add(spot.target);
  }

  // ---- SCALE ----
  const towerMat = mat(0x3a4048, { metalness: 0.4, roughness: 0.5 });
  const tower = box(S.towerW, 0.6, 2.3, towerMat, 0, 0, 1.15);
  scene.add(tower);
  // cross-bracing on tower faces
  for (const sz of [1, -1]) for (const lvl of [0.5, 1.2, 1.9]) {
    const brace = box(0.05, 0.62, 0.05, mat(0x23272d, { metalness: 0.5 }), 0, 0, lvl);
    brace.rotation.x = sz * 0.6; brace.position.z = lvl;
    scene.add(brace);
  }
  const plateMat = mat(0xb9c2cc, { metalness: 0.3, roughness: 0.5 });
  const railM = mat(0x8f979f, { metalness: 0.5, roughness: 0.4 });
  field.scale = new Seesaw(scene, 0, S.pivotH, S.plateW, S.plateD, S.maxTilt, plateMat, railM);

  // platforms + ramps + rungs (both sides)
  const platMat = mat(0x2f6db3, { roughness: 0.7 });
  for (const s of [1, -1]) {
    const px = s * (S.towerW / 2 + S.platformW / 2);
    scene.add(box(S.platformW, S.platformD, S.platformH, platMat, px, 0, S.platformH / 2));
    const ramp = box(0.35, S.platformD, 0.03, platMat, s * (S.towerW / 2 + S.platformW + 0.15), 0, 0.045);
    ramp.rotation.y = s * -0.27;
    scene.add(ramp);
    // rung pipe with support arms
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, S.rungLen, 10), mat(0xc8ccd2, { metalness: 0.8, roughness: 0.3 }));
    rung.geometry.rotateZ(Math.PI / 2);
    rung.position.set(s * (S.towerW / 2 + S.rungLen / 2 - 0.02), 0, S.rungTop);
    rung.castShadow = true;
    scene.add(rung);
    for (const e of [-1, 1]) scene.add(box(0.04, 0.04, 0.5, towerMat, s * (S.towerW / 2 - 0.02), e * 0.28, S.rungTop - 0.25));
  }

  // ---- SWITCHES ----
  const mkSwitch = (s) => {
    const cx = s * (F.L / 2 - SW.distFromWall);
    scene.add(box(0.25, 0.25, SW.pivotH, towerMat, cx, 0, SW.pivotH / 2));
    const sw = new Seesaw(scene, cx, SW.pivotH, SW.plateW, SW.plateD, SW.maxTilt, plateMat, railM);
    // perimeter fence: posts + rails (full rectangle per manual)
    const fence = mat(0x4a5058, { metalness: 0.5, roughness: 0.5 });
    for (const fy of [-1.0, 1.0]) {
      scene.add(box(1.9, 0.05, 0.5, fence, cx, fy, 0.25));
      for (const fx of [-0.9, 0, 0.9]) scene.add(box(0.05, 0.05, 0.55, fence, cx + fx, fy, 0.275));
    }
    for (const fx of [-0.95, 0.95]) scene.add(box(0.05, 2.05, 0.5, fence, cx + fx, 0, 0.25));
    return sw;
  };
  field.switchBlue = mkSwitch(-1);
  field.switchRed = mkSwitch(1);

  // ---- EXCHANGE + VAULT (blue alliance) ----
  const ex = -F.L / 2;
  scene.add(box(0.1, 1.22, 1.97, mat(0xcfd6de, { transparent: true, opacity: 0.5 }), ex - 0.05, -1.5, 0.985));
  scene.add(box(0.12, 0.41, 0.5, mat(0x14161a), ex - 0.05, -1.5, 0.25));
  field.vaultMeshes = [];
  for (let i = 0; i < 3; i++) {
    const col = box(0.34, 0.5, 1.2, mat(0x8a93a0, { transparent: true, opacity: 0.6 }), ex - 0.8, -1.9 + i * 0.45, 0.6);
    scene.add(col); field.vaultMeshes.push(col);
  }
  field.exchangeZone = { x0: ex, x1: ex + 1.22, y0: -1.955, y1: -1.045 };

  // ---- PORTALS (blue, two corners) ----
  field.portals = [];
  for (const sy of [1, -1]) {
    const py = sy * (F.W / 2 - 0.61);
    field.portals.push({ x0: ex, x1: ex + 3.94, y0: Math.min(py - sy * 0.61, py + sy * 0.61), y1: Math.max(py - sy * 0.61, py + sy * 0.61) });
  }

  field.update = (dt, phase, endgame) => {
    field.scale.update(dt);
    field.switchBlue.update(dt);
    field.switchRed.update(dt);
    const sc = field.scale;
    const scBlue = sc.blueEdge() <= S.ownEdge, scRed = sc.redEdge() <= S.ownEdge;
    const swB = field.switchBlue, swR = field.switchRed;
    const swBlue = swB.blueEdge() <= SW.ownEdge, swRed = swR.redEdge() <= SW.ownEdge;
    field._evalOwn('scale', scBlue, scRed, dt);
    field._evalOwn('switch', swBlue, swRed, dt);
    field.setStack(phase === 'done' ? 'done' : phase === 'pre' ? 'pre' : 'play');
    // LED pulse in endgame
    const t = performance.now() / 1000;
    for (const l of field.ledMats) {
      const pulse = endgame ? (0.55 + 0.45 * Math.sin(t * 6)) : 1;
      l.mat.color.setHex(l.base).multiplyScalar(pulse);
    }
  };
  field._evalOwn = (which, blue, red, dt) => {
    const key = which + 'Owner', hold = which + 'HoldT', cand = which + 'Cand';
    const cur = blue ? 'blue' : (red ? 'red' : null);
    if (cur && cur === field[cand]) field[hold] += dt; else { field[cand] = cur; field[hold] = 0; }
    if (field[hold] >= 1.0) field[key] = cur; else if (!cur) field[key] = null;
  };
  return field;
}
