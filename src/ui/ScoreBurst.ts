export class ScoreBurst {
  private readonly container: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.left = '50%';
    this.container.style.top = '35%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.pointerEvents = 'none';
    this.container.style.fontFamily = 'system-ui, sans-serif';
    this.container.style.fontSize = '32px';
    this.container.style.fontWeight = '700';
    this.container.style.color = '#ffe27a';
    this.container.style.textShadow = '0 2px 10px rgba(0,0,0,0.6)';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'center';
    this.container.style.gap = '8px';
    this.container.style.zIndex = '900';

    document.body.appendChild(this.container);
  }

  show(amount: number, emphasis = false) {
    if (amount <= 0) {
      return;
    }

    const entry = document.createElement('div');
    entry.textContent = `+${amount.toLocaleString()}`;
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(20px) scale(0.9)';
    entry.style.letterSpacing = '0.06em';
    entry.style.color = emphasis ? '#ffd166' : '#ffe27a';

    this.container.appendChild(entry);

    const animation = entry.animate(
      [
        { opacity: 0, transform: 'translateY(24px) scale(0.8)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0, transform: 'translateY(-28px) scale(0.95)' }
      ],
      {
        duration: emphasis ? 1400 : 1000,
        easing: 'ease-out'
      }
    );

    animation.finished
      .catch(() => {})
      .finally(() => entry.remove());
  }

  dispose() {
    this.container.remove();
  }
}
