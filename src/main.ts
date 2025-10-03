import './styles.css';

import { GameWorld } from './game/GameWorld';
import { availableMaps } from './maps';
import type { GameMap } from './maps/types';

const mount = document.getElementById('app');
if (!mount) {
  throw new Error('Unable to find root element with id "app"');
}

let world: GameWorld | null = null;

const createCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.id = 'game-canvas';
  canvas.style.display = 'block';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  return canvas;
};

const startWorld = (map: GameMap) => {
  if (world) {
    world.dispose();
    world = null;
  }

  mount.innerHTML = '';
  const canvas = createCanvas();
  mount.appendChild(canvas);

  world = new GameWorld(canvas, map);
  world.initialize();
  world.start();
};

const selectionOverlay = document.createElement('div');
selectionOverlay.style.position = 'absolute';
selectionOverlay.style.left = '0';
selectionOverlay.style.top = '0';
selectionOverlay.style.width = '100vw';
selectionOverlay.style.height = '100vh';
selectionOverlay.style.display = 'flex';
selectionOverlay.style.alignItems = 'center';
selectionOverlay.style.justifyContent = 'center';
selectionOverlay.style.background = 'rgba(4, 6, 12, 0.85)';
selectionOverlay.style.color = '#fff';
selectionOverlay.style.fontFamily = 'system-ui, sans-serif';
selectionOverlay.style.zIndex = '1000';
selectionOverlay.style.padding = '32px';
selectionOverlay.style.boxSizing = 'border-box';
selectionOverlay.style.gap = '24px';
selectionOverlay.style.flexWrap = 'wrap';

const title = document.createElement('h1');
title.textContent = 'Select Circuit';
title.style.width = '100%';
title.style.textAlign = 'center';
title.style.margin = '0 0 16px';
title.style.fontSize = '32px';
selectionOverlay.appendChild(title);

availableMaps.forEach((map) => {
  const card = document.createElement('button');
  card.type = 'button';
  card.style.width = '260px';
  card.style.padding = '18px';
  card.style.borderRadius = '14px';
  card.style.border = '1px solid rgba(255,255,255,0.15)';
  card.style.background = 'rgba(15, 19, 28, 0.65)';
  card.style.color = '#fff';
  card.style.cursor = 'pointer';
  card.style.textAlign = 'left';
  card.style.transition = 'transform 160ms ease, background 160ms ease';

  card.innerHTML = `
    <strong style="font-size:18px; display:block; margin-bottom:6px;">${map.name}</strong>
    <span style="opacity:0.8; line-height:1.4; font-size:14px;">${map.description}</span>
  `;

  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-4px)';
    card.style.background = 'rgba(28, 35, 46, 0.85)';
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)';
    card.style.background = 'rgba(15, 19, 28, 0.65)';
  });

  card.addEventListener('click', () => {
    selectionOverlay.remove();
    startWorld(map);
  });

  selectionOverlay.appendChild(card);
});

document.body.appendChild(selectionOverlay);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    world?.dispose();
    world = null;
    selectionOverlay.remove();
    mount.innerHTML = '';
  });
}
