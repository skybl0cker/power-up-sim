// Match: staging, auto routines, teleop, scoring, vault/power-ups, climb.
// Official 2018 scoring values (see scoring.js SCORE).
import { CFG } from './config.js';
import { SCORE, fmtTime } from './scoring.js';

export class Match {
  constructor(field, robot, pieces) {
    this.field = field; this.robot = robot; this.pieces = pieces;
    this.phase = 'pre'; this.t = 0; this.paused = false;
    this.score = 0;
    this.autoRoutine = 0;
    this.routines = ['Cross line', 'Switch auto', 'Scale auto', 'Drive it yourself'];
    this.autoScored = { line: false };
    this.ownAcc = { scale: 0, switch: 0 };      // fractional second accumulators
    this.gainAwarded = { scale: false, switch: false };
    this.powerups = { force: 0, boost: 0, levitate: false }; // active timers
    this.powerupQueue = [];
    this.vaultStock = 0;
    this.climbing = false; this.climbT = 0; this.climbed = false;
    this.parked = false;
    this.autoPath = null;
    this.endNotified = false;
    this.stageField();
  }

  stageField() {
    const P = this.pieces, F = CFG.FIELD;
    // preload: robot starts holding one
    const pre = P.add(0, 0, 0.5, 'held');
    this.robot.held = pre;
    P.scene.remove(pre.mesh);
    this.robot.setHeld(true); this.robot.armTarget = 0.12;
    // 6 cubes next to blue switch (fence face nearest scale)
    const swx = -(F.L / 2 - CFG.SWITCH.distFromWall);
    for (let i = 0; i < 6; i++) P.add(swx + 1.1, -1.6 + i * 0.62);
    // power cube pile: 10, pyramid 6-3-1 near blue switch side
    const px = -6.2, py = 2.6;
    const spots = [[0,0],[0.4,0],[0.8,0],[0,0.4],[0.4,0.4],[0.8,0.4]];
    for (const [dx, dy] of spots) P.add(px + dx, py + dy);
    for (const [dx, dy] of [[0.2,0.2],[0.6,0.2],[0.4,0.35]]) P.add(px + dx, py + dy, 0.135 + 0.27);
    P.add(px + 0.4, py + 0.2, 0.135 + 0.54);
    // 7 per blue portal
    for (const port of this.field.portals) {
      for (let i = 0; i < 7; i++) {
        const x = port.x0 + 0.4 + (i % 4) * 0.8;
        const y = port.y0 + 0.5 + Math.floor(i / 4) * 0.8;
        P.add(x, y);
      }
    }
  }

  start() {
    this.phase = 'auto'; this.t = 0; this.score = 0;
    this.autoScored = { line: false };
    this.ownAcc = { scale: 0, switch: 0 };
    this.gainAwarded = { scale: false, switch: false };
    this.powerups = { force: 0, boost: 0, levitate: false };
    this.vaultStock = 0; this.climbing = false; this.climbed = false;
    this.buildAutoPath();
  }

  buildAutoPath() {
    // waypoints in field coords; pure-pursuit follower drives them
    const r = this.autoRoutine;
    if (r === 0) this.autoPath = [{ x: -2.5, y: 0 }];
    else if (r === 1) this.autoPath = [{ x: -4.6, y: 0 }, { x: -3.96, y: 0, act: 'scoreSwitch' }, { x: -5.2, y: 0 }];
    else if (r === 2) this.autoPath = [{ x: -2.2, y: 0 }, { x: -1.35, y: 0, act: 'scoreScale' }, { x: -3.0, y: 0 }];
    else this.autoPath = null;
    this.wpIdx = 0;
  }

  update(dt, input) {
    if (this.phase === 'pre') {
      if (input.hit(' ')) this.start();
      for (let i = 0; i < 4; i++) if (input.hit(String(i + 1))) this.autoRoutine = i;
      return;
    }
    if (input.hit('p')) this.paused = !this.paused;
    if (input.hit('r')) { this.reset(); return; }
    if (this.paused) return;
    this.t += dt;
    this.field.update(dt);
    const A = CFG.MATCH;
    if (this.phase === 'auto' && this.t >= A.auto) { this.phase = 'teleop'; this.t = 0; this.onTeleopStart(); }
    else if (this.phase === 'teleop' && this.t >= A.teleop) { this.phase = 'done'; this.onMatchEnd(); }
    if (this.phase === 'auto') this.runAuto(dt, input);
    else if (this.phase === 'teleop') this.runTeleop(dt, input);
    this.accrue(dt);
    // powerup timers
    for (const k of ['force', 'boost']) if (this.powerups[k] > 0) this.powerups[k] = Math.max(0, this.powerups[k] - dt);
  }

  reset() {
    this.phase = 'pre'; this.t = 0;
    const r = this.robot;
    r.pos.set(-7.6, 0, 0); r.heading = 0; r.vx = r.vy = r.w = 0;
    r.held = null; r.group.position.z = 0; this.climbing = false;
  }

  // ---- auto ----
  runAuto(dt, input) {
    const r = this.robot;
    // auto line crossing
    if (!this.autoScored.line && r.pos.x > -CFG.FIELD.autoLineX) {
      this.autoScored.line = true; this.score += SCORE.AUTO_LINE;
    }
    if (this.autoRoutine === 3 || !this.autoPath) { r.drive(dt, input.driveAxes()); return; }
    // waypoint follower on tank drive: steer heading toward waypoint, throttle by distance
    const wp = this.autoPath[this.wpIdx];
    if (!wp) { r.drive(dt, { x: 0, y: 0, r: 0 }); return; }
    // pre-raise the elevator while driving to a scoring waypoint
    if (wp.act === 'scoreScale') r.elevTarget = 1.05;
    else if (wp.act === 'scoreSwitch') r.elevTarget = 0.45;
    const dx = wp.x - r.pos.x, dy = wp.y - r.pos.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.35) {
      if (wp.act === 'scoreSwitch') this.autoScore('switch');
      if (wp.act === 'scoreScale') this.autoScore('scale');
      this.wpIdx++;
      return;
    }
    let err = Math.atan2(dy, dx) - r.heading;
    while (err > Math.PI) err -= 2 * Math.PI;
    while (err < -Math.PI) err += 2 * Math.PI;
    const turn = Math.max(-1, Math.min(1, err * 2));
    const thr = Math.max(0, Math.min(1, d / 1.5)) * Math.max(0.25, 1 - Math.abs(err));
    r.drive(dt, { x: -turn, y: thr, r: 0 });
  }
  autoScore(which) {
    const h = this.robot.held;
    if (!h) return;
    h.state = which;
    if (which === 'switch') this.field.switchBlue.addCube(-1, h.mesh);
    else this.field.scale.addCube(-1, h.mesh);
    this.pieces.pieces.splice(this.pieces.pieces.indexOf(h), 1);
    this.robot.held = null; this.robot.setHeld(false);
  }

  onTeleopStart() { this.gainAwarded = { scale: false, switch: false }; }

  // ---- teleop ----
  runTeleop(dt, input) {
    const r = this.robot;
    if (!this.climbing) r.drive(dt, input.driveAxes());
    if (input.hit('f')) this.tryPickup();
    if (input.hit(' ')) this.tryScore();
    if (input.hit('x')) this.tryDrop();
    if (input.hit('z')) this.playPowerup('force');
    if (input.hit('b')) this.playPowerup('boost');
    if (input.hit('c')) this.playPowerup('levitate');
    // elevator presets
    if (input.hit('1')) r.elevTarget = 0;
    if (input.hit('2')) r.elevTarget = 0.45;
    if (input.hit('3')) r.elevTarget = 1.05;
    // climb (endgame only, near blue rung/platform)
    const endgame = this.t >= CFG.MATCH.teleop - CFG.MATCH.endgame;
    if (input.hit('k') && endgame && !this.climbing) {
      const d = Math.hypot(r.pos.x + 0.38, r.pos.y);
      if (d < 1.6) { this.climbing = true; this.climbT = 0; }
    }
    if (this.climbing) {
      this.climbT += dt;
      const k = Math.min(1, this.climbT / 3);
      r.group.position.z = k * 0.42;
      r.vx = r.vy = r.w = 0;
      if (k >= 1) this.climbed = true;
    }
  }

  tryPickup() {
    const r = this.robot;
    if (r.held) return;
    const p = this.pieces.nearest(r.pos.x, r.pos.y, 1.3);
    if (p) {
      p.state = 'held'; r.held = p;
      this.pieces.scene.remove(p.mesh);
      r.rollerSpin = 0.6; r.armTarget = 0.12; r.setHeld(true);
    }
  }

  near(x, y, range) {
    const r = this.robot;
    return Math.hypot(r.pos.x - x, r.pos.y - y) < range;
  }

  tryScore() {
    const r = this.robot;
    if (!r.held) return;
    const h = r.held, F = CFG.FIELD;
    const swx = -(F.L / 2 - CFG.SWITCH.distFromWall);
    const ez = this.field.exchangeZone;
    if (r.pos.x > ez.x0 - 0.5 && r.pos.x < ez.x1 + 0.8 && r.pos.y > ez.y0 - 0.5 && r.pos.y < ez.y1 + 0.5) {
      // vault deposit
      if (this.vaultStock >= this.field.vaultCap) return;
      h.state = 'vault';
      this.pieces.pieces.splice(this.pieces.pieces.indexOf(h), 1);
      r.held = null;
      this.vaultStock++;
      this.score += SCORE.VAULT_CUBE;
      r.armTarget = 0.55; r.setHeld(false);
      return;
    }
    if (this.near(0, 0, 1.9)) {
      // scale: need elevator high
      if (r.elevH < 0.8) return;
      h.state = 'scale';
      this.field.scale.addCube(-1, h.mesh);
      this.pieces.pieces.splice(this.pieces.pieces.indexOf(h), 1);
      r.held = null; r.armTarget = 0.55; r.setHeld(false);
      return;
    }
    if (this.near(swx, 0, 1.9)) {
      h.state = 'switch';
      this.field.switchBlue.addCube(-1, h.mesh);
      this.pieces.pieces.splice(this.pieces.pieces.indexOf(h), 1);
      r.held = null; r.armTarget = 0.55; r.setHeld(false);
      return;
    }
  }

  tryDrop() {
    const r = this.robot, h = r.held;
    if (!h) return;
    h.state = 'floor'; h.x = r.pos.x + 0.6; h.y = r.pos.y; h.z = CFG.CUBE.h / 2;
    h.mesh.position.set(h.x, h.y, h.z);
    this.pieces.scene.add(h.mesh);
    r.held = null; r.armTarget = 0.55; r.setHeld(false);
  }

  playPowerup(kind) {
    if (this.phase !== 'teleop') return;
    const cost = kind === 'force' ? 1 : kind === 'boost' ? 2 : 3;
    if (this.vaultStock < cost) return;
    if (kind === 'levitate') { this.vaultStock -= 3; this.powerups.levitate = true; return; }
    if (this.powerups[kind] > 0) return; // one active at a time (queue simplified: ignore)
    this.vaultStock -= cost;
    this.powerups[kind] = 10;
  }

  // ownership accrual each frame
  accrue(dt) {
    const auto = this.phase === 'auto';
    const perSec = auto ? SCORE.AUTO_SEC : SCORE.TELE_SEC;
    const gain = auto ? SCORE.AUTO_GAIN : SCORE.TELE_GAIN;
    const force = this.powerups.force > 0, boost = this.powerups.boost > 0;
    const owners = {
      scale: force ? 'blue' : this.field.scaleOwner,
      switch: force ? 'blue' : this.field.switchOwner,
    };
    for (const el of ['scale', 'switch']) {
      const owned = owners[el] === 'blue';
      if (owned && !this.gainAwarded[el]) {
        this.gainAwarded[el] = true;
        this.score += gain * (boost ? 2 : 1);
      }
      if (!owned) this.gainAwarded[el] = false;
      if (owned) {
        this.ownAcc[el] += dt * (boost ? 2 : 1);
        while (this.ownAcc[el] >= 1) { this.ownAcc[el] -= 1; this.score += perSec; }
      }
    }
  }

  onMatchEnd() {
    const r = this.robot, S = CFG.SCALE;
    const onPlat = Math.abs(r.pos.x + 1.535) < S.platformW / 2 + 0.3 && Math.abs(r.pos.y) < S.platformD / 2 + 0.3;
    if (this.climbed || this.powerups.levitate) this.score += SCORE.CLIMB;
    else if (onPlat) { this.score += SCORE.PARK; this.parked = true; }
  }

  timeLeft() {
    const A = CFG.MATCH;
    if (this.phase === 'auto') return Math.max(0, A.auto - this.t);
    if (this.phase === 'teleop') return Math.max(0, A.teleop - this.t);
    return 0;
  }
  endgame() {
    return this.phase === 'teleop' && this.t >= CFG.MATCH.teleop - CFG.MATCH.endgame;
  }
}
