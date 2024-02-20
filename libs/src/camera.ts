import { ArcRotateCamera, Vector3 } from "babylonjs";
import { CuboidContainer } from "./cuboid-container";
import { CylinderContainer } from "./cylinder-container";

export class Camera {
  constructor(containerShape: CuboidContainer | CylinderContainer) {
    new ArcRotateCamera(
      "Camera",
      Math.PI / 4,
      Math.PI / 4,
      containerShape.height * 5,
      Vector3.Zero()
    );
  }
}
