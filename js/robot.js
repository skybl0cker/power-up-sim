// Robots: block-CAD homage builds styled after elite 2018 teams.
// Shared detail kit: 80/20 extrusion texture, laser-cut gussets, anodized
// plates, pneumatic cylinders, CIM motor housings, chain runs.
// Z-up world.
import * as THREE from 'three';
import { CFG } from './config.js';

function std(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35, ...o });
}
function box(w, d, h, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), material);
  m.position.set(x, y, z); m.castShadow = true;
  return m;
}
// 80/20-style extruded aluminum texture
let _extTex = null;
function extrusionTex() {
  if (_extTex) return _extTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#b9bec6'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#4a4f55';
  g.fillRect(28, 0, 8, 64); g.fillRect(0, 28, 64, 8);
  g.fillStyle = '#8f959d'; g.fillRect(30, 0, 4, 64); g.fillRect(0, 30, 64, 4);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  _extTex = t; return t;
}
const extMat = () => new THREE.MeshStandardMaterial({ map: extrusionTex(), roughness: 0.45, metalness: 0.55 });
// laser-cut gusset: flat triangular prism
function gusset(size, thick, material) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(size, 0); s.lineTo(0, size); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  const m = new THREE.Mesh(geo, material); m.castShadow = true;
  return m;
}
// CIM motor housing: can + endbell + band
function cimMotor(bandColor = 0xb02020) {
  const g = new THREE.Group();
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.11, 12), std(0x2a2d33, { metalness: 0.6 }));
  g.add(can);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.02, 12), std(bandColor, { metalness: 0.4 }));
  band.position.y = 0.03; g.add(band);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.032, 0.03, 12), std(0x17181c, { metalness: 0.5 }));
  bell.position.y = -0.07; g.add(bell);
  return g;
}
// pneumatic cylinder: body + chrome shaft
function pneumatic(len = 0.22) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, len, 10), std(0xb02020, { metalness: 0.5 })));
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, len * 0.7, 8), std(0xd7dbe0, { metalness: 0.9, roughness: 0.2 }));
  shaft.position.y = len * 0.6; g.add(shaft);
  return g;
}
function numTexture(text, bg = '#1c5fd6') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#ffffff'; g.font = 'bold 64px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const easeInOutCubic = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

const BLUE = 0x1c5fd6, ALU = 0xb9bec6, DARK = 0x23262c, ONYX = 0x141518;

export class Robot {
  constructor(scene, variant, alliance = 'blue') {
    this.variant = variant; // CFG.ROBOTS entry
    this.alliance = alliance;
    this.drivetrain = variant.style; // 'wcd' | 'swerve'
    this.pos = new THREE.Vector3(-7.6, 0, 0);
    this.heading = 0;
    this.vx = 0; this.vy = 0; this.w = 0;
    this._rvx = 0; this._rvy = 0;
    this.held = null;
    this.elevH = 0; this.elevTarget = 0; this._elevFrom = 0; this._elevT = 1; this._elevDur = 0.9;
    this.armOpen = 0.55; this.armTarget = 0.55;
    this.wrist = 0; this.wristTarget = 0;
    this.rollerSpin = 0;
    this.wheelSpin = 0; this._steer = 0;
    this.hookOut = 0; this.hookTarget = 0;
    this.heldMesh = null;
    this.modules = []; this.wheels = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.build();
    this.group.position.copy(this.pos);
  }

  setHeldMeshFactory(fn) { this._heldMeshFactory = fn; }
  setHeld(v) {
    if (v && !this.heldMesh && this._heldMeshFactory) {
      this.heldMesh = this._heldMeshFactory();
      this.heldMesh.position.set(0.42, 0, 0.1);
      this.carriage.add(this.heldMesh);
    } else if (!v && this.heldMesh) {
      this.carriage.remove(this.heldMesh);
      this.heldMesh = null;
    }
  }
  setElev(t) { // eased trajectory
    if (t === this.elevTarget) return;
    this._elevFrom = this.elevH; this._elevT = 0; this.elevTarget = t;
  }

  // ---------- shared builders ----------
  bumpers(FW, FD, teamNo) {
    const b = this.group, bh = 0.127, bt = 0.075, bz = 0.115;
    const bmat = std(BLUE, { roughness: 0.85, metalness: 0 });
    const seg = (w, d, x, y) => b.add(box(w, d, bh, bmat, x, y, bz));
    seg(FW + 2 * bt, bt, 0, FD / 2 + bt / 2);
    seg(FW + 2 * bt, bt, 0, -FD / 2 - bt / 2);
    seg(bt, FD, FW / 2 + bt / 2, 0);
    seg(bt, FD, -FW / 2 - bt / 2, 0);
    const nt = numTexture(teamNo);
    const mk = (w, h, x, y, z, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: nt }));
      m.position.set(x, y, z); m.rotation.y = ry; b.add(m);
    };
    mk(0.34, 0.09, 0, FD / 2 + bt + 0.002, bz, 0);
    mk(0.34, 0.09, 0, -FD / 2 - bt - 0.002, bz, Math.PI);
    mk(0.34, 0.09, FW / 2 + bt + 0.002, 0, bz, Math.PI / 2);
    mk(0.34, 0.09, -FW / 2 - bt - 0.002, 0, bz, -Math.PI / 2);
  }
  wcdWheels(FW, FD) {
    // 6" wheels, drop-center: middle wheel 2mm lower
    const wg = new THREE.CylinderGeometry(0.076, 0.076, 0.06, 16);
    wg.rotateX(Math.PI / 2);
    const wm = std(0x17181c, { roughness: 0.9, metalness: 0.05 });
    for (const x of [-0.28, 0, 0.28]) for (const s of [1, -1]) {
      const w = new THREE.Mesh(wg, wm);
      w.position.set(x, s * (FD / 2 - 0.05), x === 0 ? 0.074 : 0.076);
      w.castShadow = true; this.group.add(w); this.wheels.push(w);
    }
    // chain runs along rails
    for (const s of [1, -1]) this.group.add(box(0.62, 0.02, 0.03, std(0x0e0f12), 0, s * (FD / 2 - 0.05), 0.16));
    // gearboxes + CIMs
    for (const s of [1, -1]) {
      this.group.add(box(0.24, 0.14, 0.16, std(ONYX), -0.05, s * (FD / 2 - 0.14), 0.2));
      const m1 = cimMotor(this.variant.accent), m2 = cimMotor(this.variant.accent);
      m1.position.set(-0.16, s * (FD / 2 - 0.14), 0.3); m1.rotation.z = Math.PI / 2;
      m2.position.set(0.02, s * (FD / 2 - 0.14), 0.3); m2.rotation.z = Math.PI / 2;
      this.group.add(m1); this.group.add(m2);
    }
  }
  swerveModules(FW, FD) {
    for (const sx of [1, -1]) for (const sy of [1, -1]) {
      const mod = new THREE.Group();
      mod.add(box(0.14, 0.14, 0.1, std(DARK), 0, 0, 0.12));
      const wg = new THREE.CylinderGeometry(0.05, 0.05, 0.06, 14);
      wg.rotateX(Math.PI / 2);
      const wheel = new THREE.Mesh(wg, std(0x17181c, { roughness: 0.9 }));
      wheel.position.set(0, 0, 0.05); wheel.castShadow = true;
      mod.add(wheel);
      const mtr = cimMotor(this.variant.accent);
      mtr.position.set(0, 0, 0.22); mod.add(mtr);
      mod.position.set(sx * (FW / 2 - 0.12), sy * (FD / 2 - 0.12), 0);
      this.group.add(mod);
      this.modules.push({ g: mod, wheel });
      this.wheels.push(wheel);
    }
  }

  build() {
    const v = this.variant, b = this.group;
    const FW = 0.84, FD = 0.71, acc = v.accent;
    this.FW = FW; this.FD = FD;
    // belly pan + extrusion frame rails
    b.add(box(FW, FD, 0.07, extMat(), 0, 0, 0.14));
    b.add(box(FW - 0.08, FD - 0.08, 0.02, std(0x3a3f45, { roughness: 0.9 }), 0, 0, 0.185));
    if (v.style === 'wcd') this.wcdWheels(FW, FD); else this.swerveModules(FW, FD);
    this.bumpers(FW, FD, v.team);
    // anodized side plates with gussets
    const plateM = std(v.plate, { metalness: 0.65, roughness: 0.35 });
    for (const s of [1, -1]) {
      b.add(box(0.5, 0.02, 0.22, plateM, -0.05, s * (FD / 2 - 0.02), 0.32));
      const gs = gusset(0.14, 0.015, plateM);
      gs.position.set(-0.28, s * (FD / 2 - 0.02), 0.24); gs.rotation.y = Math.PI / 2;
      b.add(gs);
    }
    if (v.id === 'r1678') this.build1678(acc, plateM);
    else if (v.id === 'r254') this.build254(acc, plateM);
    else this.build1323(acc, plateM);
    // pneumatics tank + compressor hint
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 12), std(0xd7dbe0, { metalness: 0.8, roughness: 0.25 }));
    tank.geometry.rotateZ(Math.PI / 2); tank.position.set(-0.25, 0, 0.28); b.add(tank);
  }

  // 1678 Lemon Zest: twin-column rear elevator, side-roller intake, buddy ramp + hook
  build1678(acc, plateM) {
    const b = this.group, colX = -0.12;
    for (const s of [1, -1]) {
      b.add(box(0.07, 0.07, 1.15, extMat(), colX, s * 0.19, 0.85));
      const br = box(0.05, 0.05, 0.62, std(ONYX), colX - 0.14, s * 0.19, 0.5);
      br.rotation.y = 0.5; b.add(br);
      const gs = gusset(0.12, 0.015, plateM);
      gs.position.set(colX - 0.035, s * 0.155, 0.32); b.add(gs);
    }
    b.add(box(0.07, 0.45, 0.07, extMat(), colX, 0, 1.42));
    this.carriage = new THREE.Group();
    this.carriage.add(box(0.34, 0.44, 0.3, std(ALU), 0, 0, 0));
    this.carriage.position.set(colX, 0, 0.5);
    this._carriageBaseZ = 0.5;
    b.add(this.carriage);
    // wrist: intake pivots on carriage front
    this.wristG = new THREE.Group();
    this.wristG.position.set(0.17, 0, 0.05);
    this.carriage.add(this.wristG);
    this.arms = [];
    for (const s of [1, -1]) {
      const arm = new THREE.Group();
      arm.add(box(0.3, 0.05, 0.34, std(ALU), 0, 0, 0));
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 10), std(0x8a2be2, { roughness: 0.7 }));
      roller.geometry.rotateX(Math.PI / 2);
      roller.position.set(0.12, 0, 0);
      arm.add(roller);
      arm.position.set(0.14, s * 0.2, 0.1);
      this.wristG.add(arm);
      this.arms.push({ g: arm, roller, side: s });
      const pn = pneumatic(0.2); pn.position.set(0.3, s * 0.24, 0.35); pn.rotation.z = 0.6;
      b.add(pn);
    }
    // buddy-climb ramp + hook
    const ramp = box(0.04, 0.75, 1.25, std(0x9aa0a8, { roughness: 0.5 }), colX - 0.28, 0, 0.95);
    b.add(ramp);
    this.hook = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), std(ALU, { metalness: 0.7 }));
    tube.geometry.rotateX(Math.PI / 2); tube.position.z = 0.5;
    this.hook.add(tube);
    this.hook.add(box(0.16, 0.05, 0.1, std(ALU), 0, 0, 1.0));
    this.hook.position.set(colX - 0.1, 0, 1.35);
    this.hook.visible = false;
    b.add(this.hook);
    // winch drum + cable
    this.winch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), std(DARK, { metalness: 0.6 }));
    this.winch.geometry.rotateX(Math.PI / 2);
    this.winch.position.set(colX - 0.1, 0, 1.2); this.winch.visible = false;
    b.add(this.winch);
    this.cable = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 6), std(0x888d94));
    this.cable.visible = false; b.add(this.cable);
  }

  // 254-style: low wide chassis, center single-stage elevator, top roller claw
  build254(acc, plateM) {
    const b = this.group;
    b.add(box(0.08, 0.08, 1.25, extMat(), 0, 0, 0.9));
    const gs = gusset(0.16, 0.02, plateM);
    gs.position.set(-0.04, -0.03, 0.3); b.add(gs);
    const gs2 = gusset(0.16, 0.02, plateM);
    gs2.position.set(-0.04, 0.03, 0.3); gs2.rotation.y = Math.PI; gs2.position.x = 0.04; b.add(gs2);
    this.carriage = new THREE.Group();
    this.carriage.add(box(0.4, 0.5, 0.24, plateM, 0, 0, 0));
    this.carriage.position.set(0, 0, 0.55);
    this._carriageBaseZ = 0.55;
    b.add(this.carriage);
    // top roller claw on wrist
    this.wristG = new THREE.Group();
    this.wristG.position.set(0.2, 0, 0.1);
    this.carriage.add(this.wristG);
    this.arms = [];
    for (const s of [1, -1]) {
      const arm = new THREE.Group();
      arm.add(box(0.34, 0.06, 0.12, std(ALU), 0, 0, 0));
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.34, 10), std(0x22aa55, { roughness: 0.75 }));
      roller.geometry.rotateZ(Math.PI / 2);
      roller.position.set(0.1, 0, 0.08);
      arm.add(roller);
      arm.position.set(0.12, s * 0.22, 0.12);
      this.wristG.add(arm);
      this.arms.push({ g: arm, roller, side: s });
    }
    // gold top plate + hook
    b.add(box(0.3, 0.4, 0.03, plateM, 0, 0, 1.55));
    this.hook = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 8), std(ALU, { metalness: 0.7 }));
    tube.geometry.rotateX(Math.PI / 2); tube.position.z = 0.45;
    this.hook.add(tube);
    this.hook.position.set(-0.05, 0, 1.5); this.hook.visible = false;
    b.add(this.hook);
    this.winch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), std(DARK, { metalness: 0.6 }));
    this.winch.position.set(-0.05, 0, 1.35); this.winch.visible = false; b.add(this.winch);
    this.cable = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 6), std(0x888d94));
    this.cable.visible = false; b.add(this.cable);
  }

  // 1323-style: single rear column, wide compliant intake
  build1323(acc, plateM) {
    const b = this.group, colX = -0.18;
    b.add(box(0.09, 0.5, 1.2, extMat(), colX, 0, 0.88));
    for (const s of [1, -1]) {
      const gs = gusset(0.15, 0.018, plateM);
      gs.position.set(colX - 0.045, s * 0.22, 0.3); b.add(gs);
      const pn = pneumatic(0.24); pn.position.set(0.28, s * 0.26, 0.32); pn.rotation.z = 0.55;
      b.add(pn);
    }
    this.carriage = new THREE.Group();
    this.carriage.add(box(0.3, 0.56, 0.26, std(ALU), 0, 0, 0));
    this.carriage.position.set(colX, 0, 0.52);
    this._carriageBaseZ = 0.52;
    b.add(this.carriage);
    this.wristG = new THREE.Group();
    this.wristG.position.set(0.15, 0, 0.02);
    this.carriage.add(this.wristG);
    this.arms = [];
    for (const s of [1, -1]) {
      const arm = new THREE.Group();
      arm.add(box(0.36, 0.05, 0.3, plateM, 0, 0, 0));
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.36, 10), std(acc, { roughness: 0.7 }));
      roller.geometry.rotateX(Math.PI / 2);
      roller.position.set(0.14, 0, 0);
      arm.add(roller);
      arm.position.set(0.14, s * 0.26, 0.1);
      this.wristG.add(arm);
      this.arms.push({ g: arm, roller, side: s });
    }
    this.hook = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 8), std(ALU, { metalness: 0.7 }));
    tube.geometry.rotateX(Math.PI / 2); tube.position.z = 0.45;
    this.hook.add(tube);
    this.hook.position.set(colX, 0, 1.45); this.hook.visible = false;
    b.add(this.hook);
    this.winch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), std(DARK, { metalness: 0.6 }));
    this.winch.position.set(colX, 0, 1.3); this.winch.visible = false; b.add(this.winch);
    this.cable = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 6), std(0x888d94));
    this.cable.visible = false; b.add(this.cable);
  }

  // holonomic drive; WCD variant ignores strafe.
  drive(dt, ax) {
    const maxV = CFG.ROBOT.maxV, maxW = CFG.ROBOT.maxW;
    const k = 1 - Math.exp(-8 * dt);
    let rvx = ax.y * maxV, rvy = this.drivetrain === 'wcd' ? 0 : -ax.x * maxV;
    const n = Math.hypot(rvx, rvy);
    if (n > maxV) { rvx *= maxV / n; rvy *= maxV / n; }
    const dw = ax.r * maxW;
    this._rvx += (rvx - this._rvx) * k;
    this._rvy += (rvy - this._rvy) * k;
    this.w += (dw - this.w) * k;
    this.heading += this.w * dt;
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    this.vx = c * this._rvx - s * this._rvy;
    this.vy = s * this._rvx + c * this._rvy;
    this.pos.x += this.vx * dt; this.pos.y += this.vy * dt;
    const hx = CFG.FIELD.L / 2 - 0.7, hy = CFG.FIELD.W / 2 - 0.7;
    this.pos.x = Math.max(-hx, Math.min(hx, this.pos.x));
    this.pos.y = Math.max(-hy, Math.min(hy, this.pos.y));
    this.group.position.set(this.pos.x, this.pos.y, this.group.position.z);
    this.group.rotation.z = this.heading;
    this._steer += ((ax.r || 0) * 0.6 - this._steer) * Math.min(1, dt * 8);
  }

  updateVisual(dt) {
    const v = Math.hypot(this._rvx, this._rvy);
    this.wheelSpin += v * dt * 14;
    for (const w of this.wheels) w.rotation.y = this.wheelSpin;
    for (const m of this.modules) m.g.rotation.z = this._steer;
    // elevator: eased trajectory (easeInOutCubic)
    if (this._elevT < 1) {
      this._elevT = Math.min(1, this._elevT + dt / this._elevDur);
      this.elevH = this._elevFrom + (this.elevTarget - this._elevFrom) * easeInOutCubic(this._elevT);
    } else this.elevH = this.elevTarget;
    this.carriage.position.z = (this._carriageBaseZ || 0.5) + this.elevH;
    // wrist articulates at scale height
    this.wristTarget = this.elevH > 0.7 ? -0.45 : 0;
    this.wrist += (this.wristTarget - this.wrist) * Math.min(1, dt * 5);
    if (this.wristG) this.wristG.rotation.y = this.wrist;
    this.armOpen += (this.armTarget - this.armOpen) * Math.min(1, dt * 6);
    for (const a of this.arms) {
      a.g.position.y = a.side * (0.13 + this.armOpen * 0.12);
      if (this.rollerSpin > 0) a.roller.rotation.z += dt * 20;
    }
    this.rollerSpin = Math.max(0, this.rollerSpin - dt);
    // winch + cable
    this.hookOut += (this.hookTarget - this.hookOut) * Math.min(1, dt * 2);
    const ho = this.hookOut > 0.02;
    this.hook.visible = ho; this.winch.visible = ho; this.cable.visible = ho;
    if (ho) {
      this.hook.scale.z = Math.max(0.05, this.hookOut);
      this.winch.rotation.z += dt * 6 * this.hookOut;
      const hp = this.hook.position, wp = this.winch.position;
      const len = Math.hypot(hp.z + 0.9 * this.hookOut - wp.z, 0.1);
      this.cable.scale.y = len;
      this.cable.position.set((hp.x + wp.x) / 2, 0, (hp.z + wp.z) / 2 + 0.2);
    }
  }
}
