import { Track, ProgressInfo } from './Track';
import { Vehicle } from './Vehicle';

export type RacerType = 'player' | 'ai';

export interface RacerEntry {
  id: string;
  name: string;
  vehicle: Vehicle;
  type: RacerType;
}

interface RacerInternalState {
  lap: number;
  finished: boolean;
  lastNormalized: number;
  totalDistance: number;
  checkpointIndex: number;
  checkpointsCleared: number;
  progress: ProgressInfo;
  onTrack: boolean;
}

export interface RacerStatus {
  id: string;
  name: string;
  type: RacerType;
  lap: number;
  finished: boolean;
  progressPercent: number;
  progressNormalized: number;
  lapsRemaining: number;
  checkpointsCleared: number;
  checkpointIndex: number;
  totalDistance: number;
  onTrack: boolean;
  vehicle: Vehicle;
}

export interface LeaderboardEntry extends RacerStatus {
  position: number;
}

export class RaceManager {
  private readonly track: Track;
  private readonly totalLaps: number;
  private readonly checkpointCount: number;
  private readonly racers = new Map<string, RacerEntry>();
  private readonly internalState = new Map<string, RacerInternalState>();

  constructor(track: Track, totalLaps: number) {
    this.track = track;
    this.totalLaps = totalLaps;
    this.checkpointCount = this.track.getCheckpointDistances().length;
  }

  registerRacer(racer: RacerEntry) {
    this.racers.set(racer.id, racer);
    this.internalState.set(racer.id, {
      lap: 1,
      finished: false,
      lastNormalized: 0,
      totalDistance: 0,
      checkpointIndex: 0,
      checkpointsCleared: 0,
      progress: {
        distance: 0,
        normalized: 0,
        checkpointIndex: 0,
        onTrack: true
      },
      onTrack: true
    });
  }

  updateRacerProgress(id: string, progress: ProgressInfo) {
    const state = this.internalState.get(id);
    if (!state) {
      return;
    }

    const normalizedWrapped = ((progress.normalized % 1) + 1) % 1;
    const deltaNormalized = normalizedWrapped - state.lastNormalized;

    if (!state.finished) {
      if (deltaNormalized < -0.5) {
        state.lap += 1;
        if (state.lap > this.totalLaps) {
          state.finished = true;
          state.lastNormalized = 1;
        }
      } else if (deltaNormalized > 0.5) {
        state.lap = Math.max(1, state.lap - 1);
      }

      if (progress.checkpointIndex !== state.checkpointIndex) {
        const diff = progress.checkpointIndex - state.checkpointIndex;
        const wrappedDiff = diff < 0 ? diff + this.checkpointCount : diff;
        state.checkpointsCleared += wrappedDiff;
        state.checkpointIndex = progress.checkpointIndex;
      }
    }

    state.lastNormalized = state.finished ? 1 : normalizedWrapped;
    state.progress = progress;
    state.onTrack = progress.onTrack;

    const completedPortion = state.finished
      ? this.totalLaps
      : state.lap - 1 + state.lastNormalized;
    state.totalDistance = completedPortion * this.track.getTotalLength();
  }

  getRacerStatus(id: string): RacerStatus | undefined {
    const racer = this.racers.get(id);
    const state = this.internalState.get(id);
    if (!racer || !state) {
      return undefined;
    }

    const currentLap = Math.min(state.lap, this.totalLaps);
    const lapsRemaining = state.finished ? 0 : Math.max(0, this.totalLaps - currentLap);

    return {
      id: racer.id,
      name: racer.name,
      type: racer.type,
      lap: currentLap,
      finished: state.finished,
      progressPercent: Math.min(1, (state.lap - 1 + state.lastNormalized) / this.totalLaps) * 100,
      progressNormalized: state.lastNormalized,
      lapsRemaining,
      checkpointsCleared: state.checkpointsCleared,
      checkpointIndex: state.checkpointIndex,
      totalDistance: state.totalDistance,
      onTrack: state.onTrack,
      vehicle: racer.vehicle
    };
  }

  getLeaderboard(): LeaderboardEntry[] {
    const standings: LeaderboardEntry[] = [];

    for (const [id, racer] of this.racers.entries()) {
      const status = this.getRacerStatus(id);
      if (!status) {
        continue;
      }

      standings.push({
        ...status,
        position: 0
      });
    }

    standings.sort((a, b) => {
      if (a.finished && !b.finished) {
        return -1;
      }
      if (!a.finished && b.finished) {
        return 1;
      }

      const aProgress = this.getRaceProgressValue(a.id);
      const bProgress = this.getRaceProgressValue(b.id);

      return bProgress - aProgress;
    });

    standings.forEach((entry, index) => {
      entry.position = index + 1;
    });

    return standings;
  }

  getCheckpointCount() {
    return this.checkpointCount;
  }

  private getRaceProgressValue(id: string) {
    const state = this.internalState.get(id);
    if (!state) {
      return 0;
    }

    if (state.finished) {
      return this.totalLaps + 1;
    }

    return state.lap - 1 + state.lastNormalized;
  }
}
