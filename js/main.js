// Power Up 2018 simulator — main entry.
// World convention: Z-UP. camera.up is (0,0,1) everywhere.
// Ground planes: PlaneGeometry lies in the XY plane, which IS the ground
// plane in a Z-up world — do NOT rotate ground planes (rotation.x=-PI/2
// stands them vertical/edge-on and invisible). Bake axis fixes into geometry.

import * as THREE from 'three';
import { CFG } from './config.js';
import { initCamera, updateCamera } from './camera.js';
import { buildField } from './field.js';
import { Robot } from './robot.js';
import { PieceManager, makeCubeMesh } from './pieces.js';
import { Match } from './match.js';
import { Input } from './input.js';
import { updateHUD } from './hud.js';

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
// arena background: vertical gradient canvas texture (dark blue-grey)
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

const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x3a4148, 2.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(8, -6, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
scene.add(sun);

const field = buildField(scene);
const robot = new Robot(scene, 'blue');
robot.setHeldMeshFactory(() => makeCubeMesh());
robot.setHeld(true); // preloaded cube visual
const pieces = new PieceManager(scene);
const match = new Match(field, robot, pieces);
const input = new Input();
const cam = initCamera(renderer.domElement);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
});

// screenshot presets: ?shot=top|field|robot|scale|driver
const params = new URLSearchParams(location.search);
const shotPreset = params.get('shot');
if (shotPreset) cam.snapTo(shotPreset, robot);
// headless testing: ?auto=N starts the match with auto routine N on load
const autoParam = params.get('auto');
if (autoParam !== null) { match.autoRoutine = parseInt(autoParam, 10) || 0; match.start(); }

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  let dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!match.paused) {
    match.update(dt, input);
    robot.updateVisual(dt);
    input.poll(); // clear edge-triggered keys AFTER all consumers read them
  }
  if (input.helpToggled) { /* handled in input */ }
  updateCamera(cam, dt, robot, input, field);
  updateHUD(match, robot);
  renderer.render(scene, cam.camera);
}
requestAnimationFrame(loop);
