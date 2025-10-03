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

export class AIController {
  private readonly track: Track;
  private readonly vehicle: Vehicle;
  private readonly profile: AIProfile;

  private readonly tempForward = new Vector3();
  private readonly tempToTarget = new Vector3();
  private readonly tempTargetPoint = new Vector3();

  constructor(track: Track, vehicle: Vehicle, profile: AIProfile) {
    this.track = track;
    this.vehicle = vehicle;
    this.profile = profile;
  }

  update(delta: number) {
    const progress = this.track.getProgress(this.vehicle.mesh.position);
    const speed = Math.abs(this.vehicle.getSignedSpeed());

    const dynamicLookAhead = this.profile.lookAheadDistance + speed * delta * 6;
    const desiredDistance = (progress.distance + dynamicLookAhead) % this.track.getTotalLength();
    const targetPoint = this.track.getPointAtDistance(desiredDistance, this.tempTargetPoint);

    const forward = this.vehicle.getForwardVector(this.tempForward);
    const toTarget = this.tempToTarget.copy(targetPoint).sub(this.vehicle.mesh.position).normalize();

    let dot = forward.dot(toTarget);
    dot = MathUtils.clamp(dot, -1, 1);
    const angleToTarget = Math.acos(dot);
    const crossY = forward.clone().cross(toTarget).y;

    const input: InputState = { ...DEFAULT_INPUT };

    const baseSpeed = this.profile.targetSpeedKph / 3.6;
    const cornerFactor = Math.max(0.35, 1 - angleToTarget * this.profile.corneringSensitivity);
    const desiredSpeed = baseSpeed * cornerFactor * (progress.onTrack ? 1 : this.profile.recoveryBias);

    if (speed < desiredSpeed - 1) {
      input.forward = true;
    } else if (speed > desiredSpeed + 2) {
      input.backward = true;
    }

    if (crossY > 0.01) {
      input.left = true;
    } else if (crossY < -0.01) {
      input.right = true;
    }

    if (!progress.onTrack) {
      input.forward = true;
      if (Math.abs(crossY) < 0.15) {
        input.left = false;
        input.right = false;
      }
    }

    this.vehicle.setInput(input);
  }
}
