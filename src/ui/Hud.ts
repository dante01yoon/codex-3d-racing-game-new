interface HudState {
  speed: number;
  offTrack: boolean;
}

export class Hud {
  private readonly container: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.right = '24px';
    this.container.style.bottom = '24px';
    this.container.style.padding = '12px 16px';
    this.container.style.background = 'rgba(0, 0, 0, 0.45)';
    this.container.style.color = '#fff';
    this.container.style.fontFamily = 'system-ui, sans-serif';
    this.container.style.fontSize = '14px';
    this.container.style.borderRadius = '8px';
    this.container.style.pointerEvents = 'none';
    this.container.style.backdropFilter = 'blur(4px)';
    this.container.style.minWidth = '160px';

    document.body.appendChild(this.container);
  }

  update(state: HudState) {
    const rounded = Math.round(state.speed);
    const lines = [`Speed: ${rounded} km/h`];

    if (state.offTrack) {
      lines.push('Off track – grip reduced');
    }

    this.container.innerHTML = lines.join('<br />');
  }

  dispose() {
    this.container.remove();
  }
}
