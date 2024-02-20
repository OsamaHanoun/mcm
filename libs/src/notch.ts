import {
  Color3,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  StandardMaterial,
  Vector3,
} from "babylonjs";
import { CuboidContainer } from "./cuboid-container";
import { CylinderContainer } from "./cylinder-container";

export class Notch {
  private isNullEngine: boolean;
  private readonly width: number;
  private readonly height: number;
  private readonly container: CuboidContainer | CylinderContainer;
  private readonly direction: "x" | "z";

  constructor(
    isNullEngine: boolean,
    direction: "x" | "z",
    width: number,
    height: number,
    container: CuboidContainer | CylinderContainer
  ) {
    this.isNullEngine = isNullEngine;
    this.direction = direction;
    this.width = width;
    this.height = height;
    this.container = container;
    this.addNotch();
  }

  private addNotch(): void {
    let width = 0;
    let depth = 0;
    let positionX = 0;
    let positionZ = 0;
    const positionY = this.height / 2;

    if (this.container instanceof CuboidContainer) {
      width = this.direction === "z" ? this.width : this.container.depth;
      depth = this.direction === "x" ? this.width : this.container.width;
      positionX = this.container.width / 2;
      positionZ = this.container.depth / 2;
    } else if (this.container instanceof CylinderContainer) {
      width = this.direction === "z" ? this.width : this.container.radius * 2;
      depth = this.direction === "x" ? this.width : this.container.radius * 2;
      positionX = this.container.radius;
      positionZ = this.container.radius;
    }

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

    mesh.position = new Vector3(positionX, positionY, positionZ);
    new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0 });
  }
}
