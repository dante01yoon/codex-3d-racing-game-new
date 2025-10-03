import {
  AmbientLight,
  DirectionalLight,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector3
} from 'three';

export class SceneManager {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly root = new Group();

  constructor() {
    this.scene.add(this.root);
    this.camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 12, 24);
    this.camera.lookAt(new Vector3(0, 0, 0));

    const ambient = new AmbientLight(0xffffff, 0.35);
    const hemi = new HemisphereLight(0x88aaff, 0x223311, 0.35);

    const directional = new DirectionalLight(0xffffff, 1.65);
    directional.position.set(160, 220, 140);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.camera.near = 10;
    directional.shadow.camera.far = 800;
    directional.shadow.camera.left = -400;
    directional.shadow.camera.right = 400;
    directional.shadow.camera.top = 400;
    directional.shadow.camera.bottom = -400;

    this.scene.add(ambient);
    this.scene.add(hemi);
    this.scene.add(directional);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
