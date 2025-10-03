import {
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3
} from 'three';

export interface ProgressInfo {
  distance: number;
  normalized: number;
  checkpointIndex: number;
  onTrack: boolean;
}

const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);

export class Track {
  readonly mesh = new Group();

  private readonly path: CatmullRomCurve3;
  private readonly centerline: Vector3[];
  private readonly halfWidth: number;
  private readonly startPoint: Vector3;
  private readonly startDirection: Vector3;
  private readonly cumulativeLengths: number[];
  private readonly segmentLengths: number[];
  private readonly totalLength: number;
  private readonly checkpointCount = 12;
  private readonly checkpointDistances: number[];

  private readonly tempVector = new Vector3();
  private readonly tempVectorB = new Vector3();
  private readonly tempQuaternion = new Quaternion();

  constructor() {
    const controlPoints = [
      new Vector3(0, 0, 220),
      new Vector3(140, 0, 180),
      new Vector3(240, 0, 40),
      new Vector3(210, 0, -140),
      new Vector3(60, 0, -240),
      new Vector3(-90, 0, -260),
      new Vector3(-230, 0, -170),
      new Vector3(-280, 0, -10),
      new Vector3(-210, 0, 160),
      new Vector3(-40, 0, 240)
    ];

    this.halfWidth = 11;
    this.path = new CatmullRomCurve3(controlPoints, true, 'centripetal', 0.45);

    const segments = 480;
    const spacedPoints = this.path.getSpacedPoints(segments);
    spacedPoints.pop();

    this.centerline = spacedPoints.map((point) => point.clone());
    this.startPoint = this.centerline[0]?.clone() ?? new Vector3();
    this.startDirection = this.path.getTangentAt(0).clone().normalize();

    const pointCount = spacedPoints.length;
    this.cumulativeLengths = new Array(pointCount).fill(0);
    this.segmentLengths = new Array(pointCount).fill(0);

    let lengthAccumulator = 0;
    for (let i = 0; i < pointCount; i++) {
      const current = spacedPoints[i];
      const next = spacedPoints[(i + 1) % pointCount];
      const segmentLength = current.distanceTo(next);
      this.segmentLengths[i] = segmentLength;
      lengthAccumulator += segmentLength;
      this.cumulativeLengths[i] = lengthAccumulator;
    }

    this.totalLength = lengthAccumulator;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const tangent = new Vector3();
    const side = new Vector3();

    for (let i = 0; i < pointCount; i++) {
      const point = spacedPoints[i];
      const u = i / pointCount;
      tangent.copy(this.path.getTangentAt(u)).normalize();
      side.copy(UP).cross(tangent).normalize();

      const left = point.clone().addScaledVector(side, this.halfWidth);
      const right = point.clone().addScaledVector(side, -this.halfWidth);

      positions.push(left.x, left.y, left.z);
      positions.push(right.x, right.y, right.z);

      const v = u * pointCount * 0.2;
      uvs.push(0, v);
      uvs.push(1, v);
    }

    for (let i = 0; i < pointCount; i++) {
      const next = (i + 1) % pointCount;
      const a = i * 2;
      const b = a + 1;
      const c = next * 2;
      const d = c + 1;

      indices.push(a, b, c);
      indices.push(c, b, d);
    }

    const roadGeometry = new BufferGeometry();
    roadGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    roadGeometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    roadGeometry.setIndex(indices);
    roadGeometry.computeVertexNormals();

    const roadMaterial = new MeshStandardMaterial({
      color: 0x2b2c30,
      metalness: 0.1,
      roughness: 0.92,
      side: DoubleSide
    });

    const roadMesh = new Mesh(roadGeometry, roadMaterial);
    roadMesh.receiveShadow = true;
    roadMesh.castShadow = false;
    this.mesh.add(roadMesh);

    const groundGeometry = new CircleGeometry(500, 72);
    const groundMaterial = new MeshStandardMaterial({ color: 0x1b3c1b, roughness: 1, metalness: 0 });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.mesh.add(ground);

    const centerlineGeometry = new BufferGeometry().setFromPoints(
      this.centerline.map((point) => point.clone().setY(point.y + 0.02))
    );
    const centerlineMaterial = new LineBasicMaterial({ color: 0xf5f5f5 });
    const centerline = new Line(centerlineGeometry, centerlineMaterial);
    this.mesh.add(centerline);

    this.checkpointDistances = [];
    const checkpointMaterial = new MeshStandardMaterial({
      color: 0xfad648,
      metalness: 0.2,
      emissive: 0x332200,
      roughness: 0.3,
      transparent: true,
      opacity: 0.8,
      side: DoubleSide
    });

    for (let i = 0; i < this.checkpointCount; i++) {
      const distance = (this.totalLength / this.checkpointCount) * i;
      this.checkpointDistances.push(distance);

      const marker = new Mesh(new CircleGeometry(5, 32), checkpointMaterial);
      const point = this.getPointAtDistance(distance, this.tempVector).setY(0.05);
      const tangentVector = this.getDirectionAtDistance(distance, this.tempVectorB);

      this.tempQuaternion.setFromUnitVectors(FORWARD, tangentVector);
      marker.quaternion.copy(this.tempQuaternion);
      marker.rotateX(Math.PI / 2);
      marker.position.copy(point);
      marker.renderOrder = 1;

      this.mesh.add(marker);
    }
  }

  getStartPosition() {
    return this.startPoint.clone();
  }

  getStartDirection() {
    return this.startDirection.clone();
  }

  getTotalLength() {
    return this.totalLength;
  }

  getCheckpointDistances() {
    return [...this.checkpointDistances];
  }

  getPointAtDistance(distance: number, target = new Vector3()) {
    const wrapped = ((distance % this.totalLength) + this.totalLength) % this.totalLength;
    const t = wrapped / this.totalLength;
    return this.path.getPointAt(t, target);
  }

  getDirectionAtDistance(distance: number, target = new Vector3()) {
    const wrapped = ((distance % this.totalLength) + this.totalLength) % this.totalLength;
    const t = wrapped / this.totalLength;
    return this.path.getTangentAt(t, target).normalize();
  }

  isPointOnTrack(position: Vector3) {
    let minDistanceSq = Infinity;

    for (const point of this.centerline) {
      const distSq = position.distanceToSquared(point);
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
      }
    }

    return Math.sqrt(minDistanceSq) <= this.halfWidth;
  }

  getProgress(position: Vector3): ProgressInfo {
    const pointCount = this.centerline.length;
    let nearestIndex = 0;
    let nearestDistanceSq = Infinity;

    for (let i = 0; i < pointCount; i++) {
      const distSq = position.distanceToSquared(this.centerline[i]);
      if (distSq < nearestDistanceSq) {
        nearestDistanceSq = distSq;
        nearestIndex = i;
      }
    }

    const nextIndex = (nearestIndex + 1) % pointCount;
    const startPoint = this.centerline[nearestIndex];
    const endPoint = this.centerline[nextIndex];

    this.tempVector.copy(endPoint).sub(startPoint);
    const segmentLength = this.tempVector.length();
    let projectionT = 0;

    if (segmentLength > 0) {
      const toPosition = this.tempVectorB.copy(position).sub(startPoint);
      projectionT = toPosition.dot(this.tempVector) / (segmentLength * segmentLength);
    }

    projectionT = Math.min(1, Math.max(0, projectionT));

    const startDistance = nearestIndex === 0 ? 0 : this.cumulativeLengths[nearestIndex - 1];
    const distance = startDistance + segmentLength * projectionT;
    const normalized = distance / this.totalLength;
    const checkpointIndex = Math.floor((normalized % 1) * this.checkpointCount);

    return {
      distance,
      normalized,
      checkpointIndex,
      onTrack: Math.sqrt(nearestDistanceSq) <= this.halfWidth
    };
  }
}
