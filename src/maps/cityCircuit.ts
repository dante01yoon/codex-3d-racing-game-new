import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3
} from 'three';

import { Track } from '../game/Track';
import { GameMap } from './types';

const createTree = () => {
  const group = new Group();

  const trunk = new Mesh(
    new CylinderGeometry(0.25, 0.3, 2.4, 10),
    new MeshStandardMaterial({ color: 0x6d4c41, metalness: 0.05, roughness: 0.85 })
  );
  trunk.position.y = 1.2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;

  const foliage = new Mesh(
    new SphereGeometry(1.2, 16, 16),
    new MeshStandardMaterial({ color: 0x2f7d32, metalness: 0.08, roughness: 0.6 })
  );
  foliage.position.y = 2.3;
  foliage.castShadow = true;
  foliage.receiveShadow = true;

  group.add(trunk);
  group.add(foliage);

  return group;
};

const createLamp = () => {
  const group = new Group();

  const pole = new Mesh(
    new CylinderGeometry(0.12, 0.12, 3.4, 12),
    new MeshStandardMaterial({ color: 0x9ea7b8, metalness: 0.6, roughness: 0.3 })
  );
  pole.position.y = 1.7;
  pole.castShadow = true;

  const head = new Mesh(
    new BoxGeometry(0.5, 0.2, 0.9),
    new MeshStandardMaterial({ color: 0xf4f7ff, emissive: 0x222a5a, emissiveIntensity: 0.45 })
  );
  head.position.y = 3.4;
  head.castShadow = true;

  group.add(pole);
  group.add(head);
  return group;
};

const decorateCityCircuit = (track: Track, root: Group) => {
  const points = track.getCenterlinePoints();
  const count = points.length;

  const placeProp = (base: Vector3, sideDir: Vector3, offset: number, builder: () => Group) => {
    const prop = builder();
    const position = base.clone().addScaledVector(sideDir, offset);
    prop.position.copy(position);
    root.add(prop);
  };

  for (let i = 0; i < count; i += 14) {
    const point = points[i];
    const next = points[(i + 1) % count];
    const tangent = next.clone().sub(point).normalize();
    const side = new Vector3().crossVectors(tangent, new Vector3(0, 1, 0)).normalize();

    const offset = track.getHalfWidth() + 4 + Math.random() * 2;
    placeProp(point, side, offset, createTree);
  }

  for (let i = 7; i < count; i += 18) {
    const point = points[i];
    const next = points[(i + 1) % count];
    const tangent = next.clone().sub(point).normalize();
    const side = new Vector3().crossVectors(new Vector3(0, 1, 0), tangent).normalize();

    const offset = track.getHalfWidth() + 3.5;
    placeProp(point, side, offset, createLamp);
  }
};

export const cityCircuitMap: GameMap = {
  id: 'city-circuit',
  name: 'Neon City Circuit',
  description: 'A high-speed downtown loop lined with trees, street lamps, and sweeping bends.',
  trackConfig: {
    halfWidth: 11,
    checkpointCount: 12
  },
  decorateScene: decorateCityCircuit
};
