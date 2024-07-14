import QuickHull from "quickhull3d/dist/QuickHull";
import { Mesh, MeshBuilder, Vector3, VertexBuffer } from "babylonjs";
import { BaseAggregate } from "./base-aggregate.js";

export class AggregateGenerator {
  static generate(aggregate: BaseAggregate): Mesh {
    const { a, b, c, numCuts } = aggregate;
    const [r1, r2, r3] = [a / 2, b / 2, c / 2];
    const points: any = [
      [r1, 0, 0],
      [-r1, 0, 0],
      [0, r2, 0],
      [0, -r2, 0],
      [0, 0, r3],
      [0, 0, -r3],
    ];

    for (let i = 0; i < numCuts - 6; i++) {
      points.push(this.getRandomPointOnEllipsoid(r1, r2, r3));
    }

    const quickHull = new QuickHull(points);
    quickHull.build();
    const vertices = quickHull.vertices.map((vertex: any) => vertex.point);
    const faces = quickHull.collectFaces();
    const heptagonalPrism = {
      name: crypto.randomUUID(),
      category: ["Prism"],
      vertex: vertices,
      face: faces,
    };
    const Mesh = MeshBuilder.CreatePolyhedron("aggregate", {
      custom: heptagonalPrism,
    });
    Mesh.rotation = this.getRandomRotation();

    return Mesh;
  }

  static calculateVolume(mesh: Mesh) {
    let vertices = mesh.getVerticesData(VertexBuffer.PositionKind);
    let indices = mesh.getIndices();
    let volume = 0;

    if (!vertices || !indices) return undefined;

    let referencePoint = Vector3.FromArray(vertices, 0);

    for (let i = 0; i < indices.length; i += 3) {
      let p1 = Vector3.FromArray(vertices, indices[i] * 3);
      let p2 = Vector3.FromArray(vertices, indices[i + 1] * 3);
      let p3 = Vector3.FromArray(vertices, indices[i + 2] * 3);

      volume += this.calculateTetrahedronVolume(referencePoint, p1, p2, p3);
    }

    return Math.abs(volume);
  }

  private static getRandomPointOnEllipsoid(
    r1: number,
    r2: number,
    r3: number
  ): [x: number, y: number, z: number] {
    const azimuthalAngle = Math.random() * 2 * Math.PI;
    const sinPolarAngle = 2 * Math.random() - 1;
    const polarAngle = Math.asin(sinPolarAngle);
    const x = r1 * Math.cos(polarAngle) * Math.cos(azimuthalAngle);
    const y = r2 * Math.cos(polarAngle) * Math.sin(azimuthalAngle);
    const z = r3 * sinPolarAngle;

    return [x, y, z];
  }

  private static getRandomRotation() {
    const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);

    return new Vector3(
      degreesToRadians(Math.random() * 360),
      degreesToRadians(Math.random() * 360),
      degreesToRadians(Math.random() * 360)
    );
  }

  private static calculateTetrahedronVolume(
    p0: Vector3,
    p1: Vector3,
    p2: Vector3,
    p3: Vector3
  ) {
    let a = p1.subtract(p0);
    let b = p2.subtract(p0);
    let c = p3.subtract(p0);

    return a.dot(b.cross(c)) / 6;
  }
}
