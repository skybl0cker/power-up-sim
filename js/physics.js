// Rigid-body cube physics (cannon-es): regulation 13" foam cubes with real
// mass, restitution, and friction. The robot is a kinematic pusher body so
// driving into cubes shoves them; they tumble, collide, and stack.
// Scored cubes (scale/switch/vault) stay kinematic — plates remain
// weight-driven seesaws (analytic, stable).
import * as CANNON from 'cannon-es';
import { CFG } from './config.js';
import { audio } from './audio.js';

export class CubePhysics {
  constructor(scene) {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, -9.82) });
    this.world.allowSleep = true;
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.defaultContactMaterial.friction = 0.4;

    const C = CFG.CUBE;
    this.cubeMat = new CANNON.Material('cube');
    this.groundMat = new CANNON.Material('ground');
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.cubeMat, this.groundMat, {
      friction: C.friction, restitution: C.restitution,
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.cubeMat, this.cubeMat, {
      friction: 0.5, restitution: 0.25,
    }));

    // ground: big static box, top at z=0
    const ground = new CANNON.Body({ mass: 0, material: this.groundMat });
    ground.addShape(new CANNON.Box(new CANNON.Vec3(30, 20, 0.5)));
    ground.position.set(0, 0, -0.5);
    this.world.addBody(ground);

    // robot kinematic pusher (0.84 x 0.71 footprint)
    this.robotBody = new CANNON.Body({ mass: 0, material: this.groundMat, type: CANNON.Body.KINEMATIC });
    this.robotBody.addShape(new CANNON.Box(new CANNON.Vec3(0.42, 0.36, 0.35)));
    this.robotBody.position.set(-7.6, 0, 0.35);
    this.world.addBody(this.robotBody);
    this.bodies = new Map(); // piece -> body
  }

  addCube(piece) {
    const C = CFG.CUBE;
    const body = new CANNON.Body({
      mass: C.mass, material: this.cubeMat,
      shape: new CANNON.Box(new CANNON.Vec3(C.w / 2, C.w / 2, C.h / 2)),
      position: new CANNON.Vec3(piece.x, piece.y, piece.z),
      allowSleep: true, sleepSpeedLimit: 0.2, sleepTimeLimit: 0.5,
    });
    body.addEventListener('collide', (e) => {
      const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (v > 1.2) audio.thud(Math.min(1, v / 8));
    });
    this.world.addBody(body);
    this.bodies.set(piece, body);
    piece.body = body;
  }

  removeCube(piece) {
    const b = this.bodies.get(piece);
    if (b) { this.world.removeBody(b); this.bodies.delete(piece); }
    piece.body = null;
  }

  dropCube(piece, x, y) {
    piece.x = x; piece.y = y; piece.z = CFG.CUBE.h / 2 + 0.05;
    this.addCube(piece);
  }

  step(dt, robot) {
    // drive the kinematic pusher from the visual robot
    const rb = this.robotBody;
    rb.position.set(robot.pos.x, robot.pos.y, 0.35);
    rb.velocity.set(robot.vx, robot.vy, 0);
    rb.angularVelocity.set(0, 0, robot.w);
    rb.quaternion.setFromEuler(0, 0, robot.heading);
    this.world.step(1 / 120, dt, 4);
    // sync meshes
    for (const [piece, body] of this.bodies) {
      if (piece.state !== 'floor' && piece.state !== 'portal') continue;
      piece.x = body.position.x; piece.y = body.position.y; piece.z = body.position.z;
      piece.mesh.position.copy(body.position);
      piece.mesh.quaternion.copy(body.quaternion);
    }
  }
}
