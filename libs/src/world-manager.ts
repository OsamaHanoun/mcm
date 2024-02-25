import HavokPhysics from "@babylonjs/havok";
import {
  Engine,
  NullEngine,
  Scene,
  HavokPlugin,
  Vector3,
  Mesh,
} from "babylonjs";
import { STLExport } from "@babylonjs/serializers";
import { CuboidContainer } from "./cuboid-container";
import { Light } from "./light";
import { AxisHelper } from "./axis-helper";
import { Camera } from "./camera";
import { CylinderContainer } from "./cylinder-container";
import { BaseAggregate } from "./base-aggregate";
import { Sample } from "./sample";
import { Notch } from "./notch";
import { Cuboid } from "./cuboid";
import { Cylinder } from "./cylinder";
import { Slicer } from "./slicer";

export class WorldManager {
  private canvas?: HTMLCanvasElement;
  private engine: Engine | NullEngine;
  private isNullEngine: boolean;
  private scene?: Scene;
  private baseAggregateArray: BaseAggregate[];
  private shape: Cuboid | Cylinder;
  private sample?: Sample;

  constructor(
    canvas: HTMLCanvasElement | undefined,
    isNullEngine: boolean,
    shape: Cuboid | Cylinder,
    baseAggregateArray: BaseAggregate[]
  ) {
    this.isNullEngine = isNullEngine;
    this.canvas = canvas;
    this.shape = shape;
    this.baseAggregateArray = baseAggregateArray;
    this.engine =
      this.isNullEngine || !this.canvas
        ? new NullEngine()
        : new Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
          });
  }

  async run() {
    const physicsEngine = await this.getInitializedHavok();
    this.scene = this.createScene(physicsEngine);
    const container =
      this.shape instanceof Cuboid
        ? new CuboidContainer(this.isNullEngine, this.shape)
        : new CylinderContainer(this.isNullEngine, this.shape);

    new Camera(container);
    // new Notch(this.isNullEngine, "z", 5, 10, container);
    this.sample = new Sample(
      this.baseAggregateArray,
      this.scene,
      physicsEngine,
      this.isNullEngine,
      container
    );

    if (!this.isNullEngine && this.canvas) {
      new Light();
      new AxisHelper();
    }

    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });
  }

  resize(width: number, height: number) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  logModel() {
    this.scene?.executeOnceBeforeRender(() => {
      const exportMeshes: Mesh[] = [];

      this.scene?.meshes.forEach((mesh) => {
        if (mesh.name === "sliced") {
          exportMeshes.push(mesh as Mesh);
        } else {
          mesh.physicsBody?.dispose();
          mesh.dispose();
        }
      });

      const stlFile: DataView = STLExport.CreateSTL(
        exportMeshes as any,
        false,
        "models",
        false,
        false,
        true,
        true,
        true
      );

      console.log(stlFile);
    });
  }

  pauseSimulation() {
    this.scene?.executeOnceBeforeRender(() => {
      if (this.scene) {
        new Slicer(this.scene, this.shape).apply();
      }

      delete this.sample;
    });
  }

  private async getInitializedHavok() {
    const havokInstance = await HavokPhysics();
    return new HavokPlugin(true, havokInstance);
  }

  private createScene(physicsEngine: HavokPlugin) {
    const scene = new Scene(this.engine);
    scene.enablePhysics(new Vector3(0, -9.8, 0), physicsEngine);

    return scene;
  }
}
