import { CSG, Mesh, MeshBuilder, Scene } from "babylonjs";
import { Cuboid } from "./cuboid";
import { Cylinder } from "./cylinder";

export class Slicer {
  container: Cylinder | Cuboid;
  scene: Scene;

  constructor(scene: Scene, container: Cuboid | Cylinder) {
    this.container = container;
    this.scene = scene;
  }

  apply() {
    let width = 1;
    let depth = 1;

    if (this.container instanceof Cuboid) {
      width = this.container.width;
      depth = this.container.depth;
    } else if (this.container instanceof Cylinder) {
      const diameter = this.container.radius * 2;
      width = diameter;
      depth = diameter;
    }

    const slicerMesh = MeshBuilder.CreateBox("slicer", {
      width: width,
      height: this.container.height,
      depth: depth,
    });
    slicerMesh.position.y = this.container.height * 1.5;

    const slicerCSG = CSG.FromMesh(slicerMesh);

    this.scene.meshes.forEach((mesh) => {
      if (mesh.name === "aggregate") {
        const meshCSG = CSG.FromMesh(mesh as Mesh);
        meshCSG.subtract(slicerCSG).toMesh("sliced");
        mesh.physicsBody?.dispose();
        mesh.dispose();
      }
    });

    slicerMesh.dispose();
  }
}
