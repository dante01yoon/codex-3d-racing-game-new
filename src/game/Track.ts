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
  Vector3
} from 'three';

const UP = new Vector3(0, 1, 0);

export class Track {
  readonly mesh = new Group();

  private readonly path: CatmullRomCurve3;
  private readonly centerline: Vector3[];
  private readonly halfWidth: number;
  private readonly startPoint: Vector3;
  private readonly startDirection: Vector3;

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

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const pointCount = spacedPoints.length;
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

  getStartPosition() {
    return this.startPoint.clone();
  }

  getStartDirection() {
    return this.startDirection.clone();
  }
}
