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
  score: number;
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
  score: number;
}

export interface LeaderboardEntry extends RacerStatus {
  position: number;
}

export interface ProgressUpdate {
  checkpointsPassed: number;
  scoreEarned: number;
  lapCompleted: boolean;
}

export class RaceManager {
  private readonly track: Track;
  private readonly totalLaps: number;
  private readonly checkpointCount: number;
  private readonly racers = new Map<string, RacerEntry>();
  private readonly internalState = new Map<string, RacerInternalState>();
  private static readonly CHECKPOINT_POINTS = 150;
  private static readonly LAP_COMPLETION_POINTS = 500;

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
      onTrack: true,
      score: 0
    });
  }

  updateRacerProgress(id: string, progress: ProgressInfo): ProgressUpdate {
    const state = this.internalState.get(id);
    if (!state) {
      return { checkpointsPassed: 0, scoreEarned: 0, lapCompleted: false };
    }

    const normalizedWrapped = ((progress.normalized % 1) + 1) % 1;
    const deltaNormalized = normalizedWrapped - state.lastNormalized;

    let checkpointsPassed = 0;
    let scoreEarned = 0;
    let lapCompleted = false;

    if (!state.finished) {
      if (deltaNormalized < -0.5) {
        state.lap += 1;
        if (state.lap > this.totalLaps) {
          state.finished = true;
          state.lastNormalized = 1;
          scoreEarned += RaceManager.LAP_COMPLETION_POINTS;
          state.score += RaceManager.LAP_COMPLETION_POINTS;
          lapCompleted = true;
        }
        if (!state.finished) {
          scoreEarned += RaceManager.LAP_COMPLETION_POINTS;
          state.score += RaceManager.LAP_COMPLETION_POINTS;
          lapCompleted = true;
        }
      } else if (deltaNormalized > 0.5) {
        state.lap = Math.max(1, state.lap - 1);
      }

      if (progress.checkpointIndex !== state.checkpointIndex) {
        const diff = progress.checkpointIndex - state.checkpointIndex;
        const wrappedDiff = diff < 0 ? diff + this.checkpointCount : diff;
        const movingForward = deltaNormalized < 0.5;
        state.checkpointIndex = progress.checkpointIndex;
        if (movingForward && wrappedDiff > 0) {
          state.checkpointsCleared += wrappedDiff;
          checkpointsPassed = wrappedDiff;
          const checkpointPoints = wrappedDiff * RaceManager.CHECKPOINT_POINTS;
          scoreEarned += checkpointPoints;
          state.score += checkpointPoints;
        }
      }
    }

    state.lastNormalized = state.finished ? 1 : normalizedWrapped;
    state.progress = progress;
    state.onTrack = progress.onTrack;

    const completedPortion = state.finished
      ? this.totalLaps
      : state.lap - 1 + state.lastNormalized;
    state.totalDistance = completedPortion * this.track.getTotalLength();

    return { checkpointsPassed, scoreEarned, lapCompleted };
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
      vehicle: racer.vehicle,
      score: state.score
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
      if (a.score !== b.score) {
        return b.score - a.score;
      }

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
