// Player robot modeled on FRC 1678 "Lemon Zest" (2018 Power Up).
// Sources: 1678 2018 CAD release (Chief Delphi #166149), GrabCAD "Lemon Zest",
// citruscircuits.org/bb18.html. Blocky approximation from these references.
// Architecture: West Coast tank drive, tall twin-column 2-stage elevator
// (rear of center), 1323-style side-roller intake on the carriage,
// buddy-climb hook + perforated ramp panel behind the elevator.
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
function numTexture(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#1c5fd6'; g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#ffffff'; g.font = 'bold 64px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const BLUE = 0x1c5fd6, ALU = 0xb9bec6, DARK = 0x23262c, ONYX = 0x141518;

export class Robot {
  constructor(scene, alliance = 'blue') {
    this.alliance = alliance;
    this.pos = new THREE.Vector3(-7.6, 0, 0);
    this.heading = 0;
    this.vx = 0; this.vy = 0; this.w = 0;
    this.held = null;
    this.elevH = 0; this.elevTarget = 0;   // 0..1.05 m carriage travel
    this.armOpen = 0.55; this.armTarget = 0.55; // intake arm openness
    this.rollerSpin = 0;
    this.wheelSpinL = 0; this.wheelSpinR = 0;
    this.hookOut = 0; this.hookTarget = 0;
    this.heldMesh = null; // visual cube riding between intake arms
    this.group = new THREE.Group();
    scene.add(this.group);
    this.build();
    this.group.position.copy(this.pos);
  }

  // show/hide the held-cube visual; needs a mesh factory (set by main)
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

  build() {
    const FW = 0.84, FD = 0.71; // 33" x 28" frame
    this.FW = FW; this.FD = FD;
    const b = this.group;

    // --- drivetrain: low frame + belly pan ---
    b.add(box(FW, FD, 0.09, std(DARK), 0, 0, 0.16));                 // frame rails
    const pan = box(FW - 0.1, FD - 0.1, 0.02, std(0x3a3f45, { roughness: 0.9 }), 0, 0, 0.21);
    b.add(pan);
    // gearboxes (paired motor cans) low on inner rails
    for (const s of [1, -1]) {
      b.add(box(0.22, 0.12, 0.14, std(ONYX), 0, s * (FD / 2 - 0.12), 0.16));
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 10), std(0x101114));
      motor.geometry.rotateX(Math.PI / 2);
      motor.position.set(-0.14, s * (FD / 2 - 0.12), 0.16);
      b.add(motor);
    }
    // --- wheels: 6x (WCD), hidden under bumpers ---
    this.wheelsL = []; this.wheelsR = [];
    const wg = new THREE.CylinderGeometry(0.05, 0.05, 0.055, 14);
    wg.rotateX(Math.PI / 2);
    const wm = std(0x17181c, { roughness: 0.9, metalness: 0.05 });
    for (const x of [-0.28, 0, 0.28]) for (const s of [1, -1]) {
      const w = new THREE.Mesh(wg, wm);
      w.position.set(x, s * (FD / 2 - 0.045), 0.05); w.castShadow = true;
      b.add(w);
      (s > 0 ? this.wheelsL : this.wheelsR).push(w);
    }
    // --- bumpers: FULL-PERIMETER segments, blue, 5" tall ---
    const bh = 0.127, bt = 0.075, bz = 0.115;
    const bmat = std(BLUE, { roughness: 0.85, metalness: 0 });
    const seg = (w, d, x, y) => b.add(box(w, d, bh, bmat, x, y, bz));
    seg(FW + 2 * bt, bt, 0, FD / 2 + bt / 2);
    seg(FW + 2 * bt, bt, 0, -FD / 2 - bt / 2);
    seg(bt, FD, FW / 2 + bt / 2, 0);
    seg(bt, FD, -FW / 2 - bt / 2, 0);
    // number plates: white 1678 on blue, all four sides.
    // PlaneGeometry faces +Z; orient per side so text reads horizontally.
    const nt = numTexture('1678');
    const plateY = (y, dir) => { // faces +Y (dir=1) or -Y (dir=-1)
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.09),
        new THREE.MeshBasicMaterial({ map: nt }));
      m.rotation.x = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      m.position.set(0, y, bz);
      b.add(m);
    };
    const plateX = (x, dir) => { // faces +X (dir=1) or -X (dir=-1)
      const geo = new THREE.PlaneGeometry(0.34, 0.09);
      geo.rotateZ(Math.PI / 2); // texture "right" -> +Y
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: nt }));
      m.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      m.position.set(x, 0, bz);
      b.add(m);
    };
    plateY(FD / 2 + bt + 0.002, 1); plateY(-FD / 2 - bt - 0.002, -1);
    plateX(FW / 2 + bt + 0.002, 1); plateX(-FW / 2 - bt - 0.002, -1);

    // --- elevator: twin columns rear of center + Onyx diagonal braces ---
    const colX = -0.12;
    for (const s of [1, -1]) {
      b.add(box(0.07, 0.07, 1.15, std(ALU), colX, s * 0.19, 0.85));
      // diagonal brace
      const br = box(0.05, 0.05, 0.62, std(ONYX), colX - 0.14, s * 0.19, 0.5);
      br.rotation.y = 0.5;
      b.add(br);
    }
    b.add(box(0.07, 0.45, 0.07, std(ALU), colX, 0, 1.42)); // top crossbar
    // carriage (moves with elevH)
    this.carriage = new THREE.Group();
    this.carriage.add(box(0.34, 0.44, 0.3, std(ALU), 0, 0, 0));
    this.carriage.position.set(colX, 0, 0.5);
    b.add(this.carriage);

    // --- intake: 1323-style side arms with powered rollers, on carriage front ---
    this.arms = [];
    for (const s of [1, -1]) {
      const arm = new THREE.Group();
      const plateM = box(0.3, 0.05, 0.34, std(ALU), 0, 0, 0);
      arm.add(plateM);
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 10), std(0x8a2be2, { roughness: 0.7 }));
      roller.geometry.rotateX(Math.PI / 2); // vertical roller
      roller.position.set(0.12, 0, 0);
      arm.add(roller);
      arm.position.set(0.3, s * 0.2, 0.1);
      this.carriage.add(arm);
      this.arms.push({ g: arm, roller, side: s });
    }
    // red pneumatic cylinders at front corners
    for (const s of [1, -1]) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 8), std(0xb02020, { metalness: 0.5 }));
      cyl.position.set(FW / 2 - 0.05, s * (FD / 2 - 0.1), 0.28);
      cyl.rotation.z = 0.5;
      b.add(cyl);
    }
    // --- buddy-climb ramp panel (perforated look) behind elevator ---
    const ramp = box(0.04, 0.75, 1.25, std(0x9aa0a8, { roughness: 0.5 }), colX - 0.28, 0, 0.95);
    b.add(ramp);
    // lightening holes faked with dark discs
    const holeM = std(0x2a2e34, { roughness: 0.8 });
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.045, 10), holeM);
      h.geometry.rotateZ(Math.PI / 2);
      h.position.set(colX - 0.28, -0.24 + c * 0.24, 0.5 + r * 0.22);
      b.add(h);
    }
    // --- climber hook tube (extends on climb) ---
    this.hook = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), std(ALU, { metalness: 0.7 }));
    tube.geometry.rotateX(Math.PI / 2);
    tube.position.z = 0.5;
    this.hook.add(tube);
    const hookPlate = box(0.16, 0.05, 0.1, std(ALU), 0, 0, 1.0);
    this.hook.add(hookPlate);
    this.hook.position.set(colX - 0.1, 0, 1.35);
    this.hook.visible = false;
    b.add(this.hook);
  }

  // tank drive: ax.y throttle, ax.x turn. Field-frame velocity.
  drive(dt, ax) {
    const maxV = CFG.ROBOT.maxV, maxW = CFG.ROBOT.maxW;
    const thr = ax.y, turn = -ax.x + ax.r * 0.5;
    const vT = thr * maxV, wT = turn * maxW;
    const k = 1 - Math.exp(-5 * dt);
    const v = (this._v || 0) + (vT - (this._v || 0)) * k;
    const w = this.w + (wT - this.w) * k;
    this._v = v; this.w = w;
    this.heading += w * dt;
    this.vx = Math.cos(this.heading) * v;
    this.vy = Math.sin(this.heading) * v;
    this.pos.x += this.vx * dt; this.pos.y += this.vy * dt;
    const hx = CFG.FIELD.L / 2 - 0.7, hy = CFG.FIELD.W / 2 - 0.7;
    this.pos.x = Math.max(-hx, Math.min(hx, this.pos.x));
    this.pos.y = Math.max(-hy, Math.min(hy, this.pos.y));
    this.group.position.set(this.pos.x, this.pos.y, this.group.position.z);
    this.group.rotation.z = this.heading;
  }

  updateVisual(dt) {
    const v = this._v || 0;
    this.wheelSpinL += (v + this.w * 0.35) * dt * 14;
    this.wheelSpinR += (v - this.w * 0.35) * dt * 14;
    for (const w of this.wheelsL) w.rotation.y = this.wheelSpinL;
    for (const w of this.wheelsR) w.rotation.y = this.wheelSpinR;
    this.elevH += (this.elevTarget - this.elevH) * Math.min(1, dt * 4);
    this.carriage.position.z = 0.5 + this.elevH;
    this.armOpen += (this.armTarget - this.armOpen) * Math.min(1, dt * 6);
    for (const a of this.arms) {
      a.g.position.y = a.side * (0.13 + this.armOpen * 0.12);
      if (this.rollerSpin > 0) a.roller.rotation.z += dt * 20;
    }
    this.rollerSpin = Math.max(0, this.rollerSpin - dt);
    this.hookOut += (this.hookTarget - this.hookOut) * Math.min(1, dt * 2);
    this.hook.visible = this.hookOut > 0.02;
    this.hook.scale.z = Math.max(0.05, this.hookOut);
  }
}
