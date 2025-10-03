import { Group } from 'three';

import { Track, TrackConfig } from '../game/Track';

export interface GameMap {
  id: string;
  name: string;
  description: string;
  trackConfig: TrackConfig;
  decorateScene?: (track: Track, root: Group) => void;
}
