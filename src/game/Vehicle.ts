import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  TorusGeometry,
  Vector3
} from 'three';

export interface VehicleStats {
  maxOnTrackSpeed: number;
  maxReverseSpeed: number;
  acceleration: number;
  brakingForce: number;
  turnRate: number;
}

export interface VehicleConfig {
  bodyColor?: number;
  accentColor?: number;
  stats?: Partial<VehicleStats>;
}

const DEFAULT_STATS: VehicleStats = {
  maxOnTrackSpeed: 55,
  maxReverseSpeed: -14,
  acceleration: 34,
  brakingForce: 52,
  turnRate: 1.6
};

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

const DEFAULT_INPUT: InputState = { forward: false, backward: false, left: false, right: false };
const Y_AXIS = new Vector3(0, 1, 0);

export class Vehicle {
  readonly mesh: Group;
  private readonly stats: VehicleStats;
  private velocity = 0;
  private input: InputState = { ...DEFAULT_INPUT };

  private readonly offTrackAccelerationScalar = 0.45;
  private readonly offTrackTurnScalar = 0.55;
  private readonly offTrackMaxSpeed = 22;
  private readonly offTrackDrag = 0.86;

  private readonly rollingResistanceOnTrack = 0.985;
  private readonly rollingResistanceOffTrack = 0.93;

  private readonly tempDirection = new Vector3();
  private readonly tempQuaternion = new Quaternion();
  private readonly tempLateral = new Vector3();

  private readonly bodyColorHex: string;

  constructor(config: VehicleConfig = {}) {
    this.stats = { ...DEFAULT_STATS, ...config.stats };

    const bodyColor = config.bodyColor ?? 0x2194ce;
    const accentColor = config.accentColor ?? 0xffffff;

    const chassis = new Mesh(
      new BoxGeometry(1.8, 0.32, 4.4),
      new MeshStandardMaterial({ color: new Color(bodyColor), metalness: 0.35, roughness: 0.32 })
    );
    chassis.position.y = 0.28;

    const floor = new Mesh(
      new BoxGeometry(2.2, 0.08, 4.8),
      new MeshStandardMaterial({ color: 0x0f141a, metalness: 0.4, roughness: 0.4 })
    );
    floor.position.y = 0.2;

    const nose = new Mesh(
      new BoxGeometry(0.45, 0.22, 1.6),
      new MeshStandardMaterial({ color: new Color(bodyColor).offsetHSL(0, -0.02, 0.05) })
    );
    nose.position.set(0, 0.32, 2.4);

    const frontWing = new Mesh(
      new BoxGeometry(2.6, 0.08, 0.9),
      new MeshStandardMaterial({ color: 0x1b1e24, metalness: 0.4, roughness: 0.45 })
    );
    frontWing.position.set(0, 0.25, 2.9);

    const rearWing = new Mesh(
      new BoxGeometry(1.6, 0.1, 0.6),
      new MeshStandardMaterial({ color: 0x1b1e24, metalness: 0.35, roughness: 0.5 })
    );
    rearWing.position.set(0, 0.65, -2.1);

    const rearWingPillar = new Mesh(
      new BoxGeometry(0.25, 0.5, 0.2),
      new MeshStandardMaterial({ color: 0x1b1e24, metalness: 0.35, roughness: 0.5 })
    );
    rearWingPillar.position.set(0, 0.45, -2.4);

    const cockpit = new Mesh(
      new BoxGeometry(0.7, 0.45, 0.9),
      new MeshStandardMaterial({ color: new Color(accentColor), metalness: 0.2, roughness: 0.3 })
    );
    cockpit.position.set(0, 0.55, -0.2);

    const halo = new Mesh(
      new TorusGeometry(0.5, 0.07, 12, 24, Math.PI * 1.2),
      new MeshStandardMaterial({ color: 0x1c2128, metalness: 0.4, roughness: 0.35 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.78, -0.3);

    const sidePodMaterial = new MeshStandardMaterial({
      color: new Color(bodyColor).offsetHSL(0, -0.05, -0.05),
      metalness: 0.25,
      roughness: 0.55
    });
    const leftPod = new Mesh(new BoxGeometry(0.4, 0.3, 1.6), sidePodMaterial);
    leftPod.position.set(-0.95, 0.36, -0.4);
    const rightPod = leftPod.clone();
    rightPod.position.x = 0.95;

    const wheelMaterial = new MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
    const wheelGeometry = new CylinderGeometry(0.46, 0.46, 0.38, 18);
    const wheelPositions = [
      { x: -0.95, z: 2.1 },
      { x: 0.95, z: 2.1 },
      { x: -0.9, z: -1.7 },
      { x: 0.9, z: -1.7 }
    ];

    this.mesh = new Group();
    this.mesh.add(floor);
    this.mesh.add(chassis);
    this.mesh.add(nose);
    this.mesh.add(frontWing);
    this.mesh.add(rearWing);
    this.mesh.add(rearWingPillar);
    this.mesh.add(cockpit);
    this.mesh.add(halo);
    this.mesh.add(leftPod);
    this.mesh.add(rightPod);

    wheelPositions.forEach(({ x, z }) => {
      const wheel = new Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.46, z);
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      this.mesh.add(wheel);
    });

    this.mesh.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.bodyColorHex = `#${bodyColor.toString(16).padStart(6, '0')}`;
  }

  setInput(state: InputState) {
    this.input = state;
  }

  setTransform(position: Vector3, rotation: Quaternion) {
    this.mesh.position.copy(position);
    this.mesh.quaternion.copy(rotation);
  }

  halt() {
    this.velocity = 0;
    this.input = { ...DEFAULT_INPUT };
  }

  getVelocity() {
    return this.velocity;
  }

  setVelocity(value: number) {
    const clamped = Math.max(this.stats.maxReverseSpeed, Math.min(value, this.stats.maxOnTrackSpeed * 1.2));
    this.velocity = clamped;
  }

  update(delta: number, onTrack = true) {
    const forwardPressed = this.input.forward ? 1 : 0;
    const backwardPressed = this.input.backward ? 1 : 0;

    const surfaceAcceleration = onTrack
      ? this.stats.acceleration
      : this.stats.acceleration * this.offTrackAccelerationScalar;

    if (forwardPressed) {
      this.velocity += surfaceAcceleration * delta;
    }

    if (backwardPressed) {
      this.velocity -= this.stats.brakingForce * delta;
    }

    if (!forwardPressed && !backwardPressed) {
      const resistanceBase = onTrack ? this.rollingResistanceOnTrack : this.rollingResistanceOffTrack;
      const damping = Math.pow(resistanceBase, delta * 60);
      this.velocity *= damping;

      if (Math.abs(this.velocity) < 0.05) {
        this.velocity = 0;
      }
    }

    const maxForwardSpeed = onTrack ? this.stats.maxOnTrackSpeed : this.offTrackMaxSpeed;
    if (this.velocity > maxForwardSpeed) {
      this.velocity = maxForwardSpeed;
    }

    if (this.velocity < this.stats.maxReverseSpeed) {
      this.velocity = this.stats.maxReverseSpeed;
    }

    if (!onTrack && this.velocity > 0) {
      const drag = Math.pow(this.offTrackDrag, delta * 60);
      this.velocity *= drag;
    }

    this.tempDirection.set(0, 0, 1).applyQuaternion(this.mesh.quaternion).normalize();
    const displacement = this.tempDirection.multiplyScalar(this.velocity * delta);
    this.mesh.position.add(displacement);

    if (Math.abs(this.velocity) > 0.2) {
      const turnInput = (this.input.left ? 1 : 0) - (this.input.right ? 1 : 0);
      if (turnInput !== 0) {
        const turnScalar = onTrack ? 1 : this.offTrackTurnScalar;
        const speedFactor = Math.min(1, Math.abs(this.velocity) / (this.stats.maxOnTrackSpeed * 0.95));
        const grip = onTrack ? 0.62 : 0.5;
        const response = Math.max(0.2, speedFactor * grip);
        const angularVelocity = turnInput * this.stats.turnRate * turnScalar * response * Math.sign(this.velocity);
        this.tempQuaternion.setFromAxisAngle(Y_AXIS, angularVelocity * delta);
        this.mesh.quaternion.multiply(this.tempQuaternion);
      }
    }
  }

  getSpeedKph() {
    return Math.max(0, this.velocity) * 3.6;
  }

  getSignedSpeed() {
    return this.velocity;
  }

  getForwardVector(out = new Vector3()) {
    return out.set(0, 0, 1).applyQuaternion(this.mesh.quaternion).normalize();
  }

  applyCollisionResponse(normal: Vector3, strength: number) {
    this.tempLateral.copy(normal);
    this.tempLateral.y = 0;
    const length = this.tempLateral.length();
    if (length === 0) {
      return;
    }

    this.tempLateral.multiplyScalar(1 / length);

    const pushDistance = Math.max(0.1, strength * 0.6);
    this.mesh.position.addScaledVector(this.tempLateral, pushDistance);
    this.mesh.position.y = Math.max(0.35, this.mesh.position.y);

    if (this.velocity > 0) {
      this.velocity *= 0.82;
      this.velocity = Math.min(this.velocity + strength * 6, this.stats.maxOnTrackSpeed * 1.05);
    }

    const forward = this.getForwardVector(this.tempDirection);
    const deflectSign = Math.sign(this.tempLateral.cross(forward).y || 1);
    const deflectAmount = strength * 0.12 * deflectSign;
    this.tempQuaternion.setFromAxisAngle(Y_AXIS, deflectAmount);
    this.mesh.quaternion.multiply(this.tempQuaternion);
  }

  getBodyColorHex() {
    return this.bodyColorHex;
  }
}
