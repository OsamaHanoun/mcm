export class Cylinder {
  readonly radius: number;
  readonly height: number;
  readonly segments: number;

  constructor(radius: number, height: number, segments: number) {
    this.radius = radius;
    this.height = height;
    this.segments = segments;
  }
}
