import { Color, PCFSoftShadowMap, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

export class Renderer {
  readonly renderer: WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(new Color('#101018'));
  }

  render(scene: Scene, camera: PerspectiveCamera) {
    this.renderer.render(scene, camera);
  }

  resize() {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    this.renderer.dispose();
  }
}
