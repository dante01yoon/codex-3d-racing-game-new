import { MathUtils, Vector3 } from 'three';

import { Track } from './Track';
import { InputState, Vehicle } from './Vehicle';

export interface AIProfile {
  id: string;
  name: string;
  targetSpeedKph: number;
  lookAheadDistance: number;
  corneringSensitivity: number;
  recoveryBias: number;
}

const DEFAULT_INPUT: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

const UP = new Vector3(0, 1, 0);

export class AIController {
  private readonly track: Track;
  private readonly vehicle: Vehicle;
  private readonly profile: AIProfile;

  private readonly tempForward = new Vector3();
  private readonly tempToTarget = new Vector3();
  private readonly tempTargetPoint = new Vector3();
  private readonly tempSide = new Vector3();

  private lateralOffset = MathUtils.randFloatSpread(2);
  private targetLateralOffset = this.lateralOffset;
  private lateralTimer = MathUtils.randFloat(1.2, 3.6);

  private speedMultiplier = 1;
  private speedTimer = MathUtils.randFloat(1.5, 3.2);
  private jitterPhase = Math.random() * Math.PI * 2;

  private readonly maxOffset: number;

  constructor(track: Track, vehicle: Vehicle, profile: AIProfile) {
    this.track = track;
    this.vehicle = vehicle;
    this.profile = profile;
    this.maxOffset = Math.max(2.5, this.track.getHalfWidth() - 1.6);
  }

  update(delta: number) {
    const progress = this.track.getProgress(this.vehicle.mesh.position);
    const speed = Math.abs(this.vehicle.getSignedSpeed());

    this.lateralTimer -= delta;
    if (this.lateralTimer <= 0) {
      this.targetLateralOffset = MathUtils.clamp(
        this.targetLateralOffset + MathUtils.randFloatSpread(this.maxOffset * 0.6),
        -this.maxOffset,
        this.maxOffset
      );
      this.lateralTimer = MathUtils.randFloat(1.2, 3.6);
    }

    this.lateralOffset = MathUtils.damp(this.lateralOffset, this.targetLateralOffset, 4.2, delta);

    this.speedTimer -= delta;
    if (this.speedTimer <= 0) {
      const aggressiveFactor = MathUtils.mapLinear(this.profile.corneringSensitivity, 0.6, 1.4, 1.08, 0.92);
      this.speedMultiplier = MathUtils.clamp(MathUtils.randFloat(0.82, 1.15) * aggressiveFactor, 0.75, 1.2);
      this.speedTimer = MathUtils.randFloat(1.4, 3.5);
    }

    this.jitterPhase += delta * MathUtils.randFloat(1.6, 2.4);
    const jitter = Math.sin(this.jitterPhase) * 0.35;

    const dynamicLookAhead = this.profile.lookAheadDistance + speed * delta * 6.5;
    const desiredDistance = (progress.distance + dynamicLookAhead) % this.track.getTotalLength();
    const targetPoint = this.track.getPointAtDistance(desiredDistance, this.tempTargetPoint);
    const tangent = this.track.getDirectionAtDistance(desiredDistance, this.tempForward).normalize();

    this.tempSide.copy(UP).cross(tangent).normalize();
    const clampedOffset = MathUtils.clamp(this.lateralOffset + jitter, -this.maxOffset, this.maxOffset);
    targetPoint.addScaledVector(this.tempSide, clampedOffset);

    const forward = this.vehicle.getForwardVector(this.tempForward);
    const toTarget = this.tempToTarget.copy(targetPoint).sub(this.vehicle.mesh.position).normalize();

    let dot = forward.dot(toTarget);
    dot = MathUtils.clamp(dot, -1, 1);
    const angleToTarget = Math.acos(dot);
    let crossY = forward.clone().cross(toTarget).y;

    const input: InputState = { ...DEFAULT_INPUT };

    const baseSpeed = this.profile.targetSpeedKph / 3.6;
    const cornerFactor = Math.max(0.32, 1 - angleToTarget * (this.profile.corneringSensitivity + Math.abs(clampedOffset) * 0.04));
    const lateralPenalty = 1 - Math.min(0.4, Math.abs(clampedOffset) / (this.maxOffset * 2.5));
    let desiredSpeed = baseSpeed * cornerFactor * lateralPenalty * this.speedMultiplier;

    if (!progress.onTrack) {
      desiredSpeed *= this.profile.recoveryBias * 0.6;
      this.targetLateralOffset *= 0.5;
      crossY *= 1.4;
    }

    desiredSpeed = Math.max(10, desiredSpeed);

    if (speed < desiredSpeed - 1.5) {
      input.forward = true;
    } else if (speed > desiredSpeed + 2.5) {
      input.backward = true;
    }

    const wanderInfluence = MathUtils.clamp(clampedOffset / this.maxOffset, -0.35, 0.35);
    crossY += wanderInfluence;

    if (crossY > 0.02) {
      input.left = true;
    } else if (crossY < -0.02) {
      input.right = true;
    }

    if (!progress.onTrack && Math.abs(crossY) < 0.15) {
      input.left = false;
      input.right = false;
    }

    this.vehicle.setInput(input);
  }
}
