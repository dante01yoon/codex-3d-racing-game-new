import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
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
  turnRate: 1.9
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
  private readonly offTrackTurnScalar = 0.6;
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
    const bodyGeometry = new BoxGeometry(1.4, 0.6, 2.5);
    const bodyMaterial = new MeshStandardMaterial({
      color: new Color(bodyColor),
      metalness: 0.25,
      roughness: 0.45
    });
    const bodyMesh = new Mesh(bodyGeometry, bodyMaterial);

    const cabinGeometry = new BoxGeometry(1.1, 0.5, 1.2);
    const cabinMaterial = new MeshStandardMaterial({
      color: new Color(config.accentColor ?? 0xffffff),
      metalness: 0.1,
      roughness: 0.25
    });
    const cabinMesh = new Mesh(cabinGeometry, cabinMaterial);
    cabinMesh.position.set(0, 0.4, 0.3);

    this.mesh = new Group();
    this.mesh.add(bodyMesh);
    this.mesh.add(cabinMesh);
    this.mesh.castShadow = true;

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
        const speedFactor = Math.min(1, Math.abs(this.velocity) / (this.stats.maxOnTrackSpeed * 0.9));
        const grip = onTrack ? 0.78 : 0.55;
        const response = Math.max(0.25, speedFactor * grip);
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
