import { TrackBounds } from '../game/Track';

export interface MiniMapPoint {
  x: number;
  z: number;
  color: string;
  isPlayer: boolean;
}

export class MiniMap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;
  private readonly padding = 12;
  private readonly scale: number;
  private readonly bounds: TrackBounds;
  private readonly projectedTrack: Array<{ x: number; y: number }>;
  private readonly trackPath: Path2D;

  constructor(centerline: Array<{ x: number; z: number }>, bounds: TrackBounds, size = 180) {
    this.bounds = bounds;
    this.width = size;
    this.height = size;

    const boundsWidth = bounds.max.x - bounds.min.x || 1;
    const boundsDepth = bounds.max.z - bounds.min.z || 1;
    const drawable = size - this.padding * 2;
    this.scale = drawable / Math.max(boundsWidth, boundsDepth);

    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create minimap context');
    }
    this.ctx = ctx;

    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '24px';
    this.canvas.style.top = '24px';
    this.canvas.style.borderRadius = '12px';
    this.canvas.style.overflow = 'hidden';
    this.canvas.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.35)';
    this.canvas.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    this.canvas.style.background = 'rgba(6, 6, 14, 0.55)';
    this.canvas.style.backdropFilter = 'blur(6px)';

    document.body.appendChild(this.canvas);

    this.projectedTrack = centerline.map((point) => this.project(point));
    this.trackPath = new Path2D();
    if (this.projectedTrack.length) {
      this.trackPath.moveTo(this.projectedTrack[0].x, this.projectedTrack[0].y);
      for (let i = 1; i < this.projectedTrack.length; i++) {
        this.trackPath.lineTo(this.projectedTrack[i].x, this.projectedTrack[i].y);
      }
      this.trackPath.closePath();
    }
  }

  update(points: MiniMapPoint[]) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = 'rgba(6, 6, 14, 0.6)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.projectedTrack.length > 1) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke(this.trackPath);
      this.ctx.restore();
    }

    for (const point of points) {
      const projected = this.project(point);
      const radius = point.isPlayer ? 5 : 4;
      this.ctx.fillStyle = point.color;
      this.ctx.beginPath();
      this.ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      if (point.isPlayer) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
  }

  dispose() {
    this.canvas.remove();
  }

  private project(point: { x: number; z: number }) {
    const x = (point.x - this.bounds.min.x) * this.scale + this.padding;
    const y = this.height - ((point.z - this.bounds.min.z) * this.scale + this.padding);
    return { x, y };
  }
}
