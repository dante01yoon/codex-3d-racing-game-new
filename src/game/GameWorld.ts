import { Quaternion, Vector3 } from 'three';
import Stats from 'stats.js';

import { Loop } from '../core/Loop';
import { Renderer } from '../core/Renderer';
import { SceneManager } from '../core/SceneManager';
import { InputManager } from '../input/InputManager';
import { Hud } from '../ui/Hud';
import { Track } from './Track';
import { Vehicle } from './Vehicle';

const FORWARD_REFERENCE = new Vector3(0, 0, 1);

export class GameWorld {
  private readonly renderer: Renderer;
  private readonly sceneManager: SceneManager;
  private readonly loop: Loop;
  private readonly inputManager: InputManager;
  private readonly hud: Hud;
  private readonly stats = new Stats();

  private readonly player: Vehicle;
  private readonly track: Track;

  private readonly cameraTarget = new Vector3();
  private readonly cameraForward = new Vector3();
  private readonly cameraOffset = new Vector3();
  private readonly desiredCameraPosition = new Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.sceneManager = new SceneManager();
    this.player = new Vehicle();
    this.track = new Track();

    this.sceneManager.root.add(this.track.mesh);
    this.sceneManager.root.add(this.player.mesh);

    this.inputManager = new InputManager();
    this.hud = new Hud();

    this.loop = new Loop(this.update);
    this.stats.showPanel(0);
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.left = '0';
    this.stats.dom.style.top = '0';

    document.body.appendChild(this.stats.dom);

    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  initialize() {
    const startPosition = this.track.getStartPosition();
    const startDirection = this.track.getStartDirection();
    const startRotation = new Quaternion().setFromUnitVectors(FORWARD_REFERENCE, startDirection);

    this.player.mesh.position.copy(startPosition);
    this.player.mesh.position.y = 0.4;
    this.player.mesh.quaternion.copy(startRotation);

    this.sceneManager.camera.position.set(startPosition.x, startPosition.y + 10, startPosition.z + 18);
    this.sceneManager.camera.lookAt(this.player.mesh.position);
    this.inputManager.subscribe((state) => this.player.setInput(state));
  }

  start() {
    this.loop.start();
  }

  dispose() {
    this.loop.stop();
    this.renderer.dispose();
    this.inputManager.dispose();
    this.hud.dispose();
    document.body.removeChild(this.stats.dom);
    window.removeEventListener('resize', this.handleResize);
  }

  private update = (delta: number) => {
    this.stats.begin();
    const onTrack = this.track.isPointOnTrack(this.player.mesh.position);
    this.player.update(delta, onTrack);
    this.updateCamera(delta);
    this.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    this.hud.update({ speed: this.player.getSpeedKph(), offTrack: !onTrack });
    this.stats.end();
  };

  private updateCamera(delta: number) {
    const { camera } = this.sceneManager;

    this.cameraTarget.copy(this.player.mesh.position);
    this.cameraForward.copy(FORWARD_REFERENCE).applyQuaternion(this.player.mesh.quaternion).normalize();
    this.cameraOffset.copy(this.cameraForward).multiplyScalar(-18);
    this.cameraOffset.y = 8;

    this.desiredCameraPosition.copy(this.cameraTarget).add(this.cameraOffset);
    const lerpFactor = 1 - Math.pow(0.12, delta * 60);
    camera.position.lerp(this.desiredCameraPosition, lerpFactor);
    camera.lookAt(this.cameraTarget);
  }

  private handleResize = () => {
    this.sceneManager.onResize();
    this.renderer.resize();
  };
}
