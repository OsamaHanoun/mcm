import {
  Color3,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  StandardMaterial,
  Vector3,
} from "babylonjs";
import { CuboidContainer } from "./cuboid-container";
import { CylinderContainer } from "./cylinder-container";
import { NotchParams } from "./types";

export class Notch {
  private readonly isNullEngine: boolean;
  private readonly container: CuboidContainer | CylinderContainer;
  private readonly notchParams: NotchParams;

  constructor(
    isNullEngine: boolean,
    notchParams: NotchParams,
    container: CuboidContainer | CylinderContainer
  ) {
    this.isNullEngine = isNullEngine;
    this.notchParams = notchParams;
    this.container = container;
    this.addNotch();
  }

  private addNotch(): Mesh {
    const { height, direction } = this.notchParams;
    let width = 0;
    let depth = 0;
    let positionX = 0;
    let positionZ = 0;
    const positionY = height / 2;

    if (this.container instanceof CuboidContainer) {
      width = direction === "z" ? this.notchParams.width : this.container.depth;
      depth = direction === "x" ? this.notchParams.width : this.container.width;
    } else if (this.container instanceof CylinderContainer) {
      width =
        direction === "z" ? this.notchParams.width : this.container.radius * 2;
      depth =
        direction === "x" ? this.notchParams.width : this.container.radius * 2;
    }

    const mesh = MeshBuilder.CreateBox("notch", {
      height,
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

    return mesh;
  }
}
