import { Quaternion, Vector3 } from 'three';
import Stats from 'stats.js';

import { Loop } from '../core/Loop';
import { Renderer } from '../core/Renderer';
import { SceneManager } from '../core/SceneManager';
import { InputManager } from '../input/InputManager';
import { Hud } from '../ui/Hud';
import { AIController, AIProfile } from './AIController';
import { RaceManager, RacerEntry } from './RaceManager';
import { Track } from './Track';
import { Vehicle, VehicleConfig } from './Vehicle';

const FORWARD_REFERENCE = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);

interface GridSlot {
  id: string;
  name: string;
  lane: number;
  row: number;
  type: 'player' | 'ai';
  vehicleConfig: VehicleConfig;
  aiProfile?: AIProfile;
}

export class GameWorld {
  private readonly renderer: Renderer;
  private readonly sceneManager: SceneManager;
  private readonly loop: Loop;
  private readonly inputManager: InputManager;
  private readonly hud: Hud;
  private readonly stats = new Stats();

  private readonly track: Track;
  private readonly raceManager: RaceManager;
  private readonly racers: RacerEntry[] = [];
  private readonly aiControllers: AIController[] = [];

  private readonly cameraTarget = new Vector3();
  private readonly cameraForward = new Vector3();
  private readonly cameraOffset = new Vector3();
  private readonly desiredCameraPosition = new Vector3();

  private playerId = 'player';
  private playerVehicle!: Vehicle;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.sceneManager = new SceneManager();
    this.track = new Track();
    this.raceManager = new RaceManager(this.track, 3);

    this.sceneManager.root.add(this.track.mesh);

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

    this.setupGrid();
  }

  initialize() {
    if (!this.playerVehicle) {
      throw new Error('Player vehicle failed to initialize');
    }
    this.inputManager.subscribe((state) => {
      this.playerVehicle.setInput(state);
    });
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

  private setupGrid() {
    const startPosition = this.track.getStartPosition();
    const startDirection = this.track.getStartDirection();
    const startRotation = new Quaternion().setFromUnitVectors(FORWARD_REFERENCE, startDirection);
    const right = startDirection.clone().cross(UP).normalize();

    const laneSpacing = 4.2;
    const rowSpacing = 6.5;

    const grid: GridSlot[] = [
      {
        id: 'player',
        name: 'You',
        lane: 0,
        row: 0,
        type: 'player',
        vehicleConfig: {
          bodyColor: 0x2194ce,
          accentColor: 0xffffff,
          stats: { maxOnTrackSpeed: 44, turnRate: 2.4 }
        }
      },
      {
        id: 'ari',
        name: 'Ari Blaze',
        lane: -1,
        row: 0,
        type: 'ai',
        vehicleConfig: {
          bodyColor: 0xe94f37,
          accentColor: 0xfee08b,
          stats: { maxOnTrackSpeed: 47, acceleration: 34, turnRate: 2.45 }
        },
        aiProfile: {
          id: 'ari',
          name: 'Ari Blaze',
          targetSpeedKph: 190,
          lookAheadDistance: 14,
          corneringSensitivity: 1.05,
          recoveryBias: 0.6
        }
      },
      {
        id: 'nova',
        name: 'Nova Drift',
        lane: 1,
        row: 0,
        type: 'ai',
        vehicleConfig: {
          bodyColor: 0x8c54ff,
          accentColor: 0xf8f9ff,
          stats: { maxOnTrackSpeed: 43, acceleration: 30, turnRate: 2.8 }
        },
        aiProfile: {
          id: 'nova',
          name: 'Nova Drift',
          targetSpeedKph: 175,
          lookAheadDistance: 12,
          corneringSensitivity: 0.8,
          recoveryBias: 0.7
        }
      },
      {
        id: 'rhett',
        name: 'Rhett Torque',
        lane: 0,
        row: 1,
        type: 'ai',
        vehicleConfig: {
          bodyColor: 0x2ecc71,
          accentColor: 0xd1ffd6,
          stats: { maxOnTrackSpeed: 41, acceleration: 36, turnRate: 2.1 }
        },
        aiProfile: {
          id: 'rhett',
          name: 'Rhett Torque',
          targetSpeedKph: 165,
          lookAheadDistance: 10,
          corneringSensitivity: 1.2,
          recoveryBias: 0.8
        }
      }
    ];

    grid.forEach((slot) => {
      const vehicle = new Vehicle(slot.vehicleConfig);
      const offsetSide = right.clone().multiplyScalar(laneSpacing * slot.lane);
      const offsetRow = startDirection.clone().multiplyScalar(-rowSpacing * slot.row);

      const spawnPosition = startPosition.clone().add(offsetSide).add(offsetRow);
      spawnPosition.y = 0.4;

      vehicle.setTransform(spawnPosition, startRotation);
      this.sceneManager.root.add(vehicle.mesh);

      const racerEntry: RacerEntry = {
        id: slot.id,
        name: slot.name,
        vehicle,
        type: slot.type
      };

      this.racers.push(racerEntry);
      this.raceManager.registerRacer(racerEntry);

      if (slot.type === 'ai' && slot.aiProfile) {
        this.aiControllers.push(new AIController(this.track, vehicle, slot.aiProfile));
      }

      if (slot.id === this.playerId) {
        this.playerVehicle = vehicle;
      }
    });

    if (!this.playerVehicle) {
      throw new Error('Player grid slot not configured');
    }

    this.sceneManager.camera.position.set(startPosition.x, startPosition.y + 12, startPosition.z + 22);
    this.sceneManager.camera.lookAt(startPosition);
  }

  private update = (delta: number) => {
    this.stats.begin();

    this.aiControllers.forEach((controller) => controller.update(delta));

    let playerStatus = this.raceManager.getRacerStatus(this.playerId);

    this.racers.forEach((racer) => {
      const onTrack = this.track.isPointOnTrack(racer.vehicle.mesh.position);
      racer.vehicle.update(delta, onTrack);
      const progress = this.track.getProgress(racer.vehicle.mesh.position);
      this.raceManager.updateRacerProgress(racer.id, progress);

      if (racer.id === this.playerId) {
        playerStatus = this.raceManager.getRacerStatus(racer.id);
      }
    });

    if (playerStatus) {
      const leaderboard = this.raceManager.getLeaderboard();
      const playerEntry = leaderboard.find((entry) => entry.id === this.playerId);
      const position = playerEntry ? playerEntry.position : 1;

      this.hud.update({
        speed: this.playerVehicle.getSpeedKph(),
        lap: playerStatus.lap,
        totalLaps: 3,
        lapsRemaining: playerStatus.lapsRemaining,
        position,
        racerCount: leaderboard.length,
        progressPercent: playerStatus.progressPercent,
        checkpointIndex: playerStatus.checkpointIndex,
        checkpointCount: this.raceManager.getCheckpointCount(),
        offTrack: !playerStatus.onTrack,
        leaderboard: leaderboard.slice(0, 3).map((entry) => ({
          position: entry.position,
          name: entry.name,
          lap: entry.lap,
          progressPercent: entry.progressPercent
        }))
      });
    }

    this.updateCamera(delta);
    this.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    this.stats.end();
  };

  private updateCamera(delta: number) {
    const { camera } = this.sceneManager;

    this.cameraTarget.copy(this.playerVehicle.mesh.position);
    this.cameraForward.copy(FORWARD_REFERENCE).applyQuaternion(this.playerVehicle.mesh.quaternion).normalize();
    this.cameraOffset.copy(this.cameraForward).multiplyScalar(-20);
    this.cameraOffset.y = 9;

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
