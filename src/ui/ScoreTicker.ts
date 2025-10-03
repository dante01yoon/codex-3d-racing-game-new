export class ScoreTicker {
  private readonly container: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.right = '0';
    this.container.style.top = '-18px';
    this.container.style.pointerEvents = 'none';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'flex-end';
    parent.appendChild(this.container);
  }

  flash(amount: number) {
    if (amount <= 0) {
      return;
    }

    const entry = document.createElement('div');
    entry.textContent = `+${amount}`;
    entry.style.color = '#ffe680';
    entry.style.fontWeight = '600';
    entry.style.fontSize = '16px';
    entry.style.textShadow = '0 0 8px rgba(0, 0, 0, 0.65)';
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(12px)';

    this.container.appendChild(entry);

    const animation = entry.animate(
      [
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-24px)' }
      ],
      {
        duration: 1000,
        easing: 'ease-out'
      }
    );

    animation.finished
      .catch(() => {})
      .finally(() => {
        entry.remove();
      });

    window.setTimeout(() => {
      if (entry.parentElement) {
        entry.remove();
      }
    }, 1200);
  }

  dispose() {
    this.container.remove();
  }
}
