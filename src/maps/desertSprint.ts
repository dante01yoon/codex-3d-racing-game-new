import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3
} from 'three';

import { Track } from '../game/Track';
import { GameMap } from './types';

const DESERT_POINTS = [
  { x: 0, z: 260 },
  { x: 190, z: 210 },
  { x: 260, z: 60 },
  { x: 210, z: -120 },
  { x: 60, z: -260 },
  { x: -140, z: -280 },
  { x: -260, z: -120 },
  { x: -220, z: 120 },
  { x: -60, z: 260 }
];

const createCactus = () => {
  const group = new Group();
  const material = new MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8 });

  const base = new Mesh(new CylinderGeometry(0.3, 0.4, 2.4, 10), material);
  base.position.y = 1.2;
  base.castShadow = true;
  group.add(base);

  const arm = new Mesh(new CylinderGeometry(0.2, 0.25, 1.1, 8), material);
  arm.position.set(0.4, 1.4, 0);
  arm.rotation.z = Math.PI / 2.4;
  arm.castShadow = true;
  group.add(arm);

  const arm2 = arm.clone();
  arm2.position.x = -0.5;
  arm2.rotation.z = -Math.PI / 2.8;
  group.add(arm2);

  return group;
};

const createRock = () => {
  const mesh = new Mesh(
    new BoxGeometry(1.6, 0.8, 1.2),
    new MeshStandardMaterial({ color: 0xb89f7d, roughness: 0.9 })
  );
  mesh.position.y = 0.4;
  mesh.castShadow = true;
  mesh.rotation.y = Math.random() * Math.PI;
  return mesh;
};

const decorateDesert = (track: Track, root: Group) => {
  const points = track.getCenterlinePoints();
  const count = points.length;
  const up = new Vector3(0, 1, 0);

  for (let i = 0; i < count; i += 18) {
    const point = points[i];
    const next = points[(i + 1) % count];
    const tangent = next.clone().sub(point).normalize();
    const side = new Vector3().crossVectors(up, tangent).normalize();
    const offset = track.getHalfWidth() + 5 + Math.random() * 3;

    const cactus = createCactus();
    cactus.position.copy(point).addScaledVector(side, offset);
    root.add(cactus);

    const rock = createRock();
    rock.position.copy(point).addScaledVector(side, -(offset + 3));
    root.add(rock);
  }

  for (let i = 9; i < count; i += 22) {
    const point = points[i];
    const next = points[(i + 1) % count];
    const tangent = next.clone().sub(point).normalize();
    const side = new Vector3().crossVectors(tangent, up).normalize();
    const pyramid = new Mesh(
      new ConeGeometry(1.4, 2.4, 4),
      new MeshStandardMaterial({ color: 0xd6c296, roughness: 0.7 })
    );
    pyramid.position.copy(point).addScaledVector(side, track.getHalfWidth() + 7);
    pyramid.position.y = 1.2;
    pyramid.castShadow = true;
    root.add(pyramid);
  }
};

export const desertSprintMap: GameMap = {
  id: 'desert-sprint',
  name: 'Dune Sprint',
  description: 'An arid high-speed sprint through desert rock formations and scattered cacti.',
  trackConfig: {
    controlPoints: DESERT_POINTS,
    halfWidth: 10,
    checkpointCount: 10,
    smoothing: 0.5
  },
  decorateScene: decorateDesert
};
