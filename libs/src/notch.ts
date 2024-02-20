import {
  Color3,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  StandardMaterial,
  Vector3,
} from "babylonjs";
import { CuboidContainer } from "./cuboid-container";

export class Notch {
  private isNullEngine: boolean;
  private readonly width: number;
  private readonly height: number;
  private readonly container: CuboidContainer;
  private readonly direction: "x" | "z";

  constructor(
    isNullEngine: boolean,
    direction: "x" | "z",
    width: number,
    height: number,
    container: CuboidContainer
  ) {
    this.isNullEngine = isNullEngine;
    this.direction = direction;
    this.width = width;
    this.height = height;
    this.container = container;
    this.addNotch();
  }

  private addNotch(): void {
    const width = this.direction === "z" ? this.width : this.container.depth;
    const depth = this.direction === "x" ? this.width : this.container.width;
    const mesh = MeshBuilder.CreateBox("notch", {
      height: this.height,
      width,
      depth,
    });

    if (!this.isNullEngine) {
      const material = new StandardMaterial("boxMaterial");
      material.alpha = 0.6;
      material.diffuseColor = Color3.Blue();
      mesh.material = material;
    }

    const positionX = this.container.width / 2;
    const positionY = this.height / 2;
    const positionZ = this.container.depth / 2;

    mesh.position = new Vector3(positionX, positionY, positionZ);
    new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0 });
  }
}
