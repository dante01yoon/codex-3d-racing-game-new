interface HudLeaderboardRow {
  position: number;
  name: string;
  lap: number;
  progressPercent: number;
}

interface HudState {
  speed: number;
  lap: number;
  totalLaps: number;
  lapsRemaining: number;
  position: number;
  racerCount: number;
  progressPercent: number;
  checkpointIndex: number;
  checkpointCount: number;
  offTrack: boolean;
  leaderboard: HudLeaderboardRow[];
}

export class Hud {
  private readonly container: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.right = '24px';
    this.container.style.bottom = '24px';
    this.container.style.padding = '16px 18px';
    this.container.style.background = 'rgba(0, 0, 0, 0.45)';
    this.container.style.color = '#fff';
    this.container.style.fontFamily = 'system-ui, sans-serif';
    this.container.style.fontSize = '14px';
    this.container.style.borderRadius = '10px';
    this.container.style.pointerEvents = 'none';
    this.container.style.backdropFilter = 'blur(6px)';
    this.container.style.minWidth = '220px';
    this.container.style.lineHeight = '1.5';

    document.body.appendChild(this.container);
  }

  update(state: HudState) {
    const roundedSpeed = Math.round(state.speed);
    const progress = state.progressPercent.toFixed(1);
    const checkpointDisplay = `${state.checkpointIndex + 1} / ${state.checkpointCount}`;
    const leaderboardLines = state.leaderboard
      .map((entry) => `${entry.position}. ${entry.name} — Lap ${entry.lap} (${entry.progressPercent.toFixed(1)}%)`)
      .join('<br />');

    const lines = [
      `<strong>Speed:</strong> ${roundedSpeed} km/h`,
      `<strong>Lap:</strong> ${state.lap} / ${state.totalLaps} (left: ${state.lapsRemaining})`,
      `<strong>Progress:</strong> ${progress}%`,
      `<strong>Checkpoint:</strong> ${checkpointDisplay}`,
      `<strong>Position:</strong> ${state.position} / ${state.racerCount}`
    ];

    if (state.offTrack) {
      lines.push('<em>Off track – grip reduced</em>');
    }

    if (leaderboardLines) {
      lines.push('<br /><strong>Leaders</strong>');
      lines.push(leaderboardLines);
    }

    this.container.innerHTML = lines.join('<br />');
  }

  dispose() {
    this.container.remove();
  }
}
