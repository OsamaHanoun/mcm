import { CSG, Mesh, MeshBuilder, Scene } from "babylonjs";
import { Cuboid } from "./cuboid";
import { Cylinder } from "./cylinder";

export class Slicer {
  container: Cylinder | Cuboid;
  scene: Scene;
  notch?: Mesh;

  constructor(scene: Scene, container: Cuboid | Cylinder, notch?: Mesh) {
    this.container = container;
    this.scene = scene;
    this.notch = notch;
  }

  apply() {
    let slicerMesh!: Mesh;

    if (this.container instanceof Cuboid) {
      slicerMesh = MeshBuilder.CreateBox("slicer", {
        width: this.container.width,
        height: this.container.height,
        depth: this.container.depth,
      });
    } else if (this.container instanceof Cylinder) {
      slicerMesh = MeshBuilder.CreateCylinder("slicer", {
        height: this.container.height,
        diameter: this.container.radius * 2,
      });
    }

    slicerMesh.position.y = this.container.height * 0.5;

    let slicerCSG = CSG.FromMesh(slicerMesh);

    if (this.notch) {
      const notchCSG = CSG.FromMesh(this.notch);
      slicerCSG = slicerCSG.subtract(notchCSG);
    }

    this.scene.meshes.forEach((mesh) => {
      if (mesh.name === "aggregate") {
        const meshCSG = CSG.FromMesh(mesh as Mesh);
        meshCSG.intersect(slicerCSG).toMesh("sliced");
        mesh.physicsBody?.dispose();
        mesh.dispose();
      }
    });

    slicerMesh.dispose();
  }
}
