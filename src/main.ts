import './styles.css';

import { GameWorld } from './game/GameWorld';

const mount = document.getElementById('app');
if (!mount) {
  throw new Error('Unable to find root element with id "app"');
}

const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
canvas.style.display = 'block';
canvas.style.width = '100vw';
canvas.style.height = '100vh';
mount.appendChild(canvas);

const world = new GameWorld(canvas);
world.initialize();
world.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    world.dispose();
    mount.innerHTML = '';
  });
}
