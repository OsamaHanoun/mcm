import {
  Color3,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  StandardMaterial,
  Vector3,
} from "babylonjs";
import { Cuboid } from "./cuboid";

export class CuboidContainer {
  private isNullEngine: boolean;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly volume: number;

  constructor(isNullEngine: boolean, shape: Cuboid) {
    this.isNullEngine = isNullEngine;
    this.width = shape.width;
    this.height = shape.height;
    this.depth = shape.depth;
    this.volume = this.width * this.height * this.depth;

    this.addContainer();
  }

  private addContainer() {
    const width = this.width;
    const height = this.height * 2;
    const depth = this.depth;
    const thickness = 1;
    const xShift = width / 2 + thickness / 2;
    const yShift = height / 2;
    const zShift = depth / 2 + thickness / 2;

    const wallsData = [
      {
        id: "x-",
        position: new Vector3(-xShift, yShift, 0),
        dimX: thickness,
        dimY: height,
        dimZ: depth,
      },
      {
        id: "x+",
        position: new Vector3(xShift, yShift, 0),
        dimX: thickness,
        dimY: height,
        dimZ: depth,
      },
      {
        id: "y-",
        position: new Vector3(0, -thickness / 2, 0),
        dimX: width,
        dimY: thickness,
        dimZ: depth,
      },
      {
        id: "z-",
        position: new Vector3(0, yShift, -zShift),
        dimX: width,
        dimY: height,
        dimZ: thickness,
      },
      {
        id: "z+",
        position: new Vector3(0, yShift, zShift),
        dimX: width,
        dimY: height,
        dimZ: thickness,
      },
    ];

    const box = MeshBuilder.CreateBox("box", {
      height: 1,
      width: 1,
      depth: 1,
      updatable: true,
    });

    if (!this.isNullEngine) {
      const material = new StandardMaterial("boxMaterial");
      material.alpha = 0.2;
      material.diffuseColor = Color3.Green();

      box.material = material;
    }

    wallsData.forEach(({ dimX, dimY, dimZ, position }) => {
      const boxClone = box.clone("box");
      boxClone.scaling = new Vector3(dimX, dimY, dimZ);
      boxClone.position = position;
      new PhysicsAggregate(boxClone, PhysicsShapeType.BOX, { mass: 0 });
    });

    box.dispose();
  }
}
