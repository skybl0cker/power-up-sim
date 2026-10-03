// Power Up 2018 simulator — main entry.
// Z-up world. Menu -> robot select -> match.
import * as THREE from 'three';
import { CFG } from './config.js';
import { initCamera, updateCamera } from './camera.js';
import { buildField } from './field.js';
import { Robot } from './robot.js';
import { PieceManager, makeCubeMesh } from './pieces.js';
import { CubePhysics } from './physics.js';
import { Match } from './match.js';
import { Input } from './input.js';
import { updateHUD } from './hud.js';
import { Menu } from './menu.js';
import { audio } from './audio.js';

window.__errors = [];
window.addEventListener('error', e => window.__errors.push(String(e.message).slice(0, 200)));

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
{
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2b3648'); gr.addColorStop(0.55, '#161d29'); gr.addColorStop(1, '#0a0d13');
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
}
scene.fog = new THREE.Fog(0x11161f, 30, 70);

const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x3a4148, 2.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(8, -6, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
scene.add(sun);

const field = buildField(scene);
field.setStack('pre');
const physics = new CubePhysics(scene);
let robot = new Robot(scene, CFG.ROBOTS[0], 'blue');
robot.setHeldMeshFactory(() => makeCubeMesh());
const pieces = new PieceManager(scene, physics);
const match = new Match(field, robot, pieces);
match.field.setStack('pre');
const input = new Input();
const cam = initCamera(renderer.domElement);

addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); });

// robot select: rebuild + restage preload
function selectVariant(i) {
  scene.remove(robot.group);
  robot = new Robot(scene, CFG.ROBOTS[i], 'blue');
  robot.setHeldMeshFactory(() => makeCubeMesh());
  match.setRobot(robot);
  match.restagePreload();
}

const menu = new Menu({
  onStart: () => {
    document.getElementById('hud').style.display = 'block';
    robot.group.rotation.z = robot.heading;
    match.start();
    audio.horn(0.9);
  },
  onSelect: (i) => selectVariant(i),
  onHelp: () => { document.getElementById('help').hidden = false; },
});

// screenshot presets: ?shot=top|field|robot|scale|driver
const params = new URLSearchParams(location.search);
const shotPreset = params.get('shot');
if (shotPreset) { cam.snapTo(shotPreset, robot); menu.hide(); document.getElementById('hud').style.display = 'block'; }
// headless testing: ?auto=N starts the match with auto routine N on load
const autoParam = params.get('auto');
if (autoParam !== null) {
  match.autoRoutine = parseInt(autoParam, 10) || 0;
  menu.hide(); document.getElementById('hud').style.display = 'block';
  match.start();
}

let last = performance.now();
let menuT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  let dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (menu.visible) {
    // cinematic menu camera: slow orbit; turntable on the robot when selecting
    menuT += dt;
    const cx = menu.selectOpen ? robot.pos.x : 0;
    const cy = menu.selectOpen ? robot.pos.y : 0;
    const rad = menu.selectOpen ? 3.2 : 15;
    const h = menu.selectOpen ? 1.8 : 6.5;
    const a = menuT * 0.25;
    cam.camera.position.set(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, h);
    cam.camera.lookAt(cx, cy, 1.0);
    robot.group.rotation.z += dt * 0.6; // turntable spin
    field.update(dt, 'pre', false);
  } else {
    if (!match.paused) {
      match.update(dt, input);
      robot.updateVisual(dt);
      physics.step(dt, robot);
      input.poll(); // clear edge-triggered keys AFTER all consumers read them
      // drivetrain whir follows speed
      const spd = Math.hypot(robot._rvx || 0, robot._rvy || 0) / CFG.ROBOT.maxV;
      audio.motor(match.phase === 'teleop' || match.phase === 'auto' ? spd : 0);
    }
    if (input.helpToggled) { /* handled in input */ }
    updateCamera(cam, dt, robot, input, field);
  }
  updateHUD(match, robot);
  renderer.render(scene, cam.camera);
}
requestAnimationFrame(loop);
