import { Quaternion, Vector3 } from 'three';
import Stats from 'stats.js';

import { Loop } from '../core/Loop';
import { Renderer } from '../core/Renderer';
import { SceneManager } from '../core/SceneManager';
import { InputManager } from '../input/InputManager';
import { Hud } from '../ui/Hud';
import { MiniMap, MiniMapPoint } from '../ui/MiniMap';
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
  private readonly miniMap: MiniMap;
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
  private readonly totalLaps = 3;
  private readonly raceDuration = 180;
  private remainingTime = this.raceDuration;
  private raceOver = false;
  private readonly collisionRadius = 2.6;
  private readonly collisionVector = new Vector3();
  private readonly collisionOpposite = new Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.sceneManager = new SceneManager();
    this.track = new Track();
    this.raceManager = new RaceManager(this.track, this.totalLaps);

    const centerline2d = this.track.getCenterlinePoints().map((point) => ({ x: point.x, z: point.z }));
    this.miniMap = new MiniMap(centerline2d, this.track.getBounds());

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
      if (this.raceOver) {
        return;
      }
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
    this.miniMap.dispose();
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
          stats: { maxOnTrackSpeed: 58, acceleration: 36, turnRate: 2.1 }
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
          stats: { maxOnTrackSpeed: 62, acceleration: 38, turnRate: 2.4 }
        },
        aiProfile: {
          id: 'ari',
          name: 'Ari Blaze',
          targetSpeedKph: 220,
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
          stats: { maxOnTrackSpeed: 56, acceleration: 33, turnRate: 2.9 }
        },
        aiProfile: {
          id: 'nova',
          name: 'Nova Drift',
          targetSpeedKph: 205,
          lookAheadDistance: 13,
          corneringSensitivity: 0.85,
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
          stats: { maxOnTrackSpeed: 54, acceleration: 38, turnRate: 2.2 }
        },
        aiProfile: {
          id: 'rhett',
          name: 'Rhett Torque',
          targetSpeedKph: 195,
          lookAheadDistance: 10,
          corneringSensitivity: 1.05,
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

    if (!this.raceOver) {
      this.remainingTime = Math.max(0, this.remainingTime - delta);
      if (this.remainingTime <= 0) {
        this.finishRace();
      }
    }

    if (!this.raceOver) {
      this.aiControllers.forEach((controller) => controller.update(delta));

      this.racers.forEach((racer) => {
        const onTrack = this.track.isPointOnTrack(racer.vehicle.mesh.position);
        racer.vehicle.update(delta, onTrack);
      });

      this.resolveCollisions();

      this.racers.forEach((racer) => {
        const progress = this.track.getProgress(racer.vehicle.mesh.position);
        const progressUpdate = this.raceManager.updateRacerProgress(racer.id, progress);
        if (racer.id === this.playerId && progressUpdate.scoreEarned > 0) {
          this.hud.flashScore(progressUpdate.scoreEarned);
        }
      });
    }

    const leaderboard = this.raceManager.getLeaderboard();
    const playerStatus = this.raceManager.getRacerStatus(this.playerId);

    if (playerStatus) {
      const playerEntry = leaderboard.find((entry) => entry.id === this.playerId);
      const position = playerEntry ? playerEntry.position : 1;

      this.hud.update({
        speed: this.playerVehicle.getSpeedKph(),
        lap: playerStatus.lap,
        totalLaps: this.totalLaps,
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
          progressPercent: entry.progressPercent,
          score: entry.score
        })),
        score: playerStatus.score,
        timeRemaining: this.remainingTime,
        raceOver: this.raceOver
      });
    }

    const minimapPoints: MiniMapPoint[] = this.racers.map((racer) => ({
      x: racer.vehicle.mesh.position.x,
      z: racer.vehicle.mesh.position.z,
      color: racer.vehicle.getBodyColorHex(),
      isPlayer: racer.id === this.playerId
    }));
    this.miniMap.update(minimapPoints);

    this.updateCamera(delta);
    this.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    this.stats.end();
  };

  private resolveCollisions() {
    const count = this.racers.length;
    for (let i = 0; i < count; i++) {
      const vehicleA = this.racers[i].vehicle;
      for (let j = i + 1; j < count; j++) {
        const vehicleB = this.racers[j].vehicle;
        this.collisionVector
          .copy(vehicleB.mesh.position)
          .sub(vehicleA.mesh.position);

        this.collisionVector.y = 0;
        const distanceSq = this.collisionVector.lengthSq();
        if (distanceSq === 0) {
          continue;
        }

        const radiusSq = this.collisionRadius * this.collisionRadius;
        if (distanceSq >= radiusSq) {
          continue;
        }

        const distance = Math.sqrt(distanceSq);
        this.collisionVector.multiplyScalar(1 / distance);
        this.collisionOpposite.copy(this.collisionVector).multiplyScalar(-1);

        const penetration = (this.collisionRadius - distance) * 0.5;
        vehicleA.applyCollisionResponse(this.collisionOpposite, penetration);
        vehicleB.applyCollisionResponse(this.collisionVector, penetration);
      }
    }
  }

  private finishRace() {
    if (this.raceOver) {
      return;
    }

    this.raceOver = true;
    this.remainingTime = 0;
    this.racers.forEach((racer) => racer.vehicle.halt());
    const finalStandings = this.raceManager.getLeaderboard();
    this.hud.showFinalResults(
      finalStandings.map((entry) => ({
        position: entry.position,
        name: entry.name,
        score: entry.score,
        lap: entry.lap
      }))
    );
  }

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
