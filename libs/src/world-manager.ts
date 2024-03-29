import HavokPhysics from "@babylonjs/havok";
import {
  Engine,
  NullEngine,
  Scene,
  HavokPlugin,
  Vector3,
  Mesh,
  Color4,
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
import { NotchParams } from "./types";
export class WorldManager {
  private canvas?: HTMLCanvasElement;
  private engine: Engine | NullEngine;
  private isNullEngine: boolean;
  private scene?: Scene;
  private baseAggregateArray: BaseAggregate[];
  private shape: Cuboid | Cylinder;
  private sample?: Sample;
  private notchParams?: NotchParams;
  private bodyToMeshScale: number;
  private friction: number;
  private restitution: number;
  private gravity: number;
  private subTimeStep: number;

  constructor(
    canvas: HTMLCanvasElement | undefined,
    isNullEngine: boolean,
    shape: Cuboid | Cylinder,
    baseAggregateArray: BaseAggregate[],
    bodyToMeshScale: number = 1,
    gravity = -9.8,
    friction = 0.5,
    restitution = 0,
    subTimeStep = 0,
    notchParams?: NotchParams
  ) {
    this.isNullEngine = isNullEngine;
    this.canvas = canvas;
    this.shape = shape;
    this.baseAggregateArray = baseAggregateArray;
    this.bodyToMeshScale = bodyToMeshScale;
    this.friction = friction;
    this.restitution = restitution;
    this.gravity = gravity;
    this.subTimeStep = subTimeStep;
    this.notchParams = notchParams;
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

    if (this.notchParams) {
      new Notch(this.isNullEngine, this.notchParams, container);
    }

    new Camera(container);
    this.sample = new Sample(
      this.baseAggregateArray,
      this.scene,
      physicsEngine,
      this.isNullEngine,
      container,
      this.bodyToMeshScale,
      this.restitution,
      this.friction,
      this.notchParams
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
    scene.enablePhysics(new Vector3(0, this.gravity, 0), physicsEngine);
    scene.getPhysicsEngine()?.setSubTimeStep(this.subTimeStep);
    scene.clearColor = new Color4(0, 0, 0, 0);

    return scene;
  }
}
