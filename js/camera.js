// Camera rig. Z-up world: camera.up = (0,0,1) always.
import * as THREE from 'three';
import { CFG } from './config.js';

export function initCamera(dom) {
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
  camera.up.set(0, 0, 1);
  const rig = {
    camera, mode: 'follow',
    yaw: 0, pitch: 0.5, dist: 7,
    modes: ['follow', 'driver', 'orbit', 'top'],
    snapTo(preset, robot) {
      const p = robot.pos;
      if (preset === 'top') { this.mode = 'top'; }
      else if (preset === 'driver') { this.mode = 'driver'; }
      else if (preset === 'field') { this.mode = 'orbit'; this.yaw = 0.6; this.pitch = 0.65; this.dist = 16; }
      else if (preset === 'scale') { this.mode = 'orbit'; this.yaw = 1.1; this.pitch = 0.42; this.dist = 8; }
      else if (preset === 'robot') { this.mode = 'follow'; this.followYaw = -0.5; this.pitch = 0.35; this.dist = 6; }
      else { this.mode = 'follow'; this.followYaw = -0.55; this.pitch = 0.45; this.dist = 7; }
      this._snap = true;
    },
  };
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });
  // mouse orbit drag adjusts yaw/pitch/dist in follow+orbit modes
  let dragging = false;
  dom.addEventListener('mousedown', () => dragging = true);
  addEventListener('mouseup', () => dragging = false);
  dom.addEventListener('wheel', e => { rig.dist = Math.min(30, Math.max(3, rig.dist + e.deltaY * 0.01)); }, { passive: true });
  rig._drag = { get dragging() { return dragging; } };
  return rig;
}

export function updateCamera(rig, dt, robot, input, field) {
  if (input.hit('c')) {
    const i = rig.modes.indexOf(rig.mode);
    rig.mode = rig.modes[(i + 1) % rig.modes.length];
  }
  if (rig._drag.dragging && (rig.mode === 'follow' || rig.mode === 'orbit')) {
    if (rig.mode === 'follow' && rig.followYaw !== undefined) rig.followYaw -= input.mdx * 0.005;
    else rig.yaw -= input.mdx * 0.005;
    rig.pitch = Math.min(1.4, Math.max(0.08, rig.pitch + input.mdy * 0.005));
  }
  const cam = rig.camera;
  const p = robot.pos, heading = robot.heading;
  const cp = Math.cos(rig.pitch), sp = Math.sin(rig.pitch);
  if (rig.mode === 'top') {
    cam.up.set(0, 1, 0);
    cam.position.set(0.5, 0, 24);
    cam.lookAt(0, 0, 0);
    cam.up.set(0, 0, 1);
  } else if (rig.mode === 'driver') {
    // behind the blue alliance wall, looking over it downfield
    cam.position.set(-11.5, p.y * 0.3, 3.6);
    cam.lookAt(2, 0, 0.8);
  } else if (rig.mode === 'orbit') {
    cam.position.set(p.x + rig.dist * cp * Math.cos(rig.yaw), p.y + rig.dist * cp * Math.sin(rig.yaw), rig.dist * sp + 0.5);
    cam.lookAt(0, 0, 0.8);
  } else {
    // follow: FIXED-YAW follow cam (matches firstroboticsim feel) — the camera
    // holds a constant world-space viewing angle and tracks the robot, so the
    // field stays in fixed screen positions. Mild auto-zoom: wider at midfield,
    // closer near the walls/station. Drag with the mouse to adjust the angle.
    if (rig.followYaw === undefined) rig.followYaw = -0.55;
    const yaw = rig.followYaw;
    const ex = Math.abs(p.x) / (CFG.FIELD.L / 2), ey = Math.abs(p.y) / (CFG.FIELD.W / 2);
    const edge = Math.min(1, Math.max(ex, ey)); // 0 midfield -> 1 at wall
    const zdist = rig.dist * (1.18 - 0.38 * edge);
    let bx = p.x + Math.cos(yaw) * zdist * cp;
    let by = p.y + Math.sin(yaw) * zdist * cp;
    let bz = Math.max(1.4, zdist * sp + 0.6);
    bx = Math.max(-10.8, Math.min(10.8, bx));
    by = Math.max(-6.0, Math.min(6.0, by));
    if (rig._snap) { cam.position.set(bx, by, bz); rig._snap = false; }
    else {
      const k = 1 - Math.exp(-6 * dt);
      cam.position.x += (bx - cam.position.x) * k;
      cam.position.y += (by - cam.position.y) * k;
      cam.position.z += (bz - cam.position.z) * k;
    }
    cam.lookAt(p.x + Math.cos(heading) * 0.6, p.y + Math.sin(heading) * 0.6, 0.7);
    // hide the near station/guard walls when the camera sits outside the field
    if (field && field.stationWalls) {
      const out = Math.abs(cam.position.x) > 8.4;
      const neg = !(out && cam.position.x < 0);
      const pos = !(out && cam.position.x > 0);
      field.stationWalls.neg.visible = neg;
      field.stationWalls.pos.visible = pos;
      if (field.guardWalls) { field.guardWalls.neg.visible = neg; field.guardWalls.pos.visible = pos; }
    }
  }
}
