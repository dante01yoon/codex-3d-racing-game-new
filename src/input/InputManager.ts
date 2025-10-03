type InputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
};

const defaultState: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

export class InputManager {
  private state: InputState = { ...defaultState };
  private listeners: Array<(state: InputState) => void> = [];

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  subscribe(listener: (state: InputState) => void) {
    this.listeners.push(listener);
  }

  getState() {
    return { ...this.state };
  }

  private broadcast() {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.state.forward = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.state.backward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = true;
        break;
      default:
        return;
    }

    this.broadcast();
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.state.forward = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.state.backward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = false;
        break;
      default:
        return;
    }

    this.broadcast();
  };
}
