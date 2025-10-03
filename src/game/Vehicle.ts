import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3
} from 'three';

interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

const Y_AXIS = new Vector3(0, 1, 0);

export class Vehicle {
  readonly mesh: Group;
  private velocity = 0;

  private readonly maxOnTrackSpeed = 42;
  private readonly maxReverseSpeed = -12;
  private readonly acceleration = 32;
  private readonly brakingForce = 48;
  private readonly turnRate = 2.2;

  private readonly offTrackAccelerationScalar = 0.45;
  private readonly offTrackTurnScalar = 0.6;
  private readonly offTrackMaxSpeed = 22;
  private readonly offTrackDrag = 0.86;

  private readonly rollingResistanceOnTrack = 0.985;
  private readonly rollingResistanceOffTrack = 0.93;

  private input: InputState = { forward: false, backward: false, left: false, right: false };

  private readonly tempDirection = new Vector3();
  private readonly tempQuaternion = new Quaternion();

  constructor() {
    const bodyGeometry = new BoxGeometry(1.4, 0.6, 2.5);
    const bodyMaterial = new MeshStandardMaterial({ color: 0x2194ce, metalness: 0.2, roughness: 0.5 });
    const bodyMesh = new Mesh(bodyGeometry, bodyMaterial);

    const cabinGeometry = new BoxGeometry(1.1, 0.5, 1.2);
    const cabinMaterial = new MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.2 });
    const cabinMesh = new Mesh(cabinGeometry, cabinMaterial);
    cabinMesh.position.set(0, 0.4, 0.3);

    this.mesh = new Group();
    this.mesh.add(bodyMesh);
    this.mesh.add(cabinMesh);

    this.mesh.castShadow = true;
  }

  setInput(state: InputState) {
    this.input = state;
  }

  update(delta: number, onTrack = true) {
    const forwardPressed = this.input.forward ? 1 : 0;
    const backwardPressed = this.input.backward ? 1 : 0;

    const surfaceAcceleration = onTrack
      ? this.acceleration
      : this.acceleration * this.offTrackAccelerationScalar;

    if (forwardPressed) {
      this.velocity += surfaceAcceleration * delta;
    }

    if (backwardPressed) {
      this.velocity -= this.brakingForce * delta;
    }

    if (!forwardPressed && !backwardPressed) {
      const resistanceBase = onTrack ? this.rollingResistanceOnTrack : this.rollingResistanceOffTrack;
      const damping = Math.pow(resistanceBase, delta * 60);
      this.velocity *= damping;

      if (Math.abs(this.velocity) < 0.05) {
        this.velocity = 0;
      }
    }

    const maxForwardSpeed = onTrack ? this.maxOnTrackSpeed : this.offTrackMaxSpeed;
    if (this.velocity > maxForwardSpeed) {
      this.velocity = maxForwardSpeed;
    }

    if (this.velocity < this.maxReverseSpeed) {
      this.velocity = this.maxReverseSpeed;
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
        const angularVelocity = turnInput * this.turnRate * turnScalar * Math.sign(this.velocity);
        this.tempQuaternion.setFromAxisAngle(Y_AXIS, angularVelocity * delta);
        this.mesh.quaternion.multiply(this.tempQuaternion);
      }
    }
  }

  getSpeedKph() {
    return Math.max(0, this.velocity) * 3.6;
  }
}
