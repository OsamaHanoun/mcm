import {
  Color3,
  Debug,
  HavokPlugin,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsBody,
  PhysicsEventType,
  PhysicsMotionType,
  PhysicsShapeConvexHull,
  PhysicsShapeType,
  PhysicsViewer,
  Scene,
  StandardMaterial,
  Vector3,
} from "babylonjs";

import { AggregateGenerator } from "./aggregate-generator";
import { BaseAggregate } from "./base-aggregate";
import { CuboidContainer } from "./cuboid-container";
import { shuffle } from "lodash-es";
import { CylinderContainer } from "./cylinder-container";
import { NotchParams } from "./types";

export class Sample {
  private baseAggregateArray: BaseAggregate[];
  private container: CuboidContainer | CylinderContainer;
  private grid = { x: 0, y: 0, z: 0 };
  private maxDimension = 0;
  private totalCount = 0;
  private totalVolumeFraction = 0;
  private totalAggregatesVolume = 0;
  private currentLocation = { x: 1, y: 1, z: 1 };
  private startLocation = { x: 0, y: 0, z: 0 };
  private scene: Scene;
  private meshToPhysicsBodyMap = new Map<PhysicsBody, Mesh>();
  private aggregatesTracker: string[] = [];
  private isNullEngine: boolean;
  private physicsEngine: HavokPlugin;
  private notchParams?: NotchParams;
  private bodyToMeshScale: number;

  constructor(
    baseAggregateArray: BaseAggregate[],
    scene: Scene,
    physicsEngine: HavokPlugin,
    isNullEngine: boolean,
    container: CuboidContainer | CylinderContainer,
    bodyToMeshScale: number = 1,
    notchParams?: NotchParams
  ) {
    this.baseAggregateArray = baseAggregateArray;
    this.container = container;
    this.scene = scene;
    this.physicsEngine = physicsEngine;
    this.isNullEngine = isNullEngine;
    this.notchParams = notchParams;
    this.bodyToMeshScale = bodyToMeshScale;

    this.calculateMaxDimension();
    this.calculateGrid();
    this.calculateStartLocation();
    this.addCountParam();
    this.calculateTotalCount();
    this.addTrigger();

    const cb = () => {
      if (this.currentLocation.y < this.grid.y) {
        for (let index = 0; index < this.grid.x * this.grid.z; index++) {
          const mesh = this.addAggregate();
          mesh && this.addToVolumeFraction(mesh);
        }
      } else {
        scene.unregisterBeforeRender(cb);
      }
    };

    scene.registerBeforeRender(cb);
  }

  private addAggregate(): Mesh | undefined {
    const baseAggregate = this.getRandomAggregate();

    if (!baseAggregate) return;

    const mesh = AggregateGenerator.generate(baseAggregate);
    mesh.position = this.getAggregatePosition();
    mesh.scaling.scaleInPlace(this.bodyToMeshScale);

    const body = new PhysicsBody(
      mesh,
      PhysicsMotionType.DYNAMIC,
      false,
      this.scene
    );
    body.shape = new PhysicsShapeConvexHull(mesh, this.scene);
    body.shape.material = { friction: 0.5, restitution: 0 };

    mesh.scaling.scaleInPlace(1 / this.bodyToMeshScale);
    this.meshToPhysicsBodyMap.set(body, mesh);

    return mesh;
  }

  private addToVolumeFraction(mesh: Mesh) {
    const containerVolume = this.container.volume;
    const volume = AggregateGenerator.calculateVolume(mesh);
    this.totalAggregatesVolume += volume ?? 0;
    this.totalVolumeFraction =
      (this.totalAggregatesVolume / containerVolume) * 100;
    console.log(this.totalVolumeFraction);
  }

  private calculateMaxDimension() {
    this.maxDimension = this.baseAggregateArray.reduce(
      (previousValue, currentValue) => {
        return Math.max(
          previousValue,
          currentValue.a,
          currentValue.b,
          currentValue.c
        );
      },
      0
    );
  }

  private calculateGrid() {
    const y = Math.floor(this.container.height / this.maxDimension) + 5;

    if (this.container instanceof CuboidContainer) {
      const { width, depth } = this.container;
      this.grid = {
        x: Math.floor(width / this.maxDimension),
        z: Math.floor(depth / this.maxDimension),
        y,
      };
    } else if (this.container instanceof CylinderContainer) {
      const edgeLength = this.container.radius * 2 ** 0.5;
      this.grid = {
        x: Math.floor(edgeLength / this.maxDimension),
        z: Math.floor(edgeLength / this.maxDimension),
        y,
      };
    }
  }

  private calculateStartLocation() {
    if (this.container instanceof CuboidContainer) {
      const { width, depth } = this.container;
      this.startLocation.x = -width / 2;
      this.startLocation.z = -depth / 2;
    } else if (this.container instanceof CylinderContainer) {
      const { radius } = this.container;
      this.startLocation.x = -radius * 2 ** 0.5 * 0.5;
      this.startLocation.z = this.startLocation.x;
    }

    if (this.notchParams) {
      this.startLocation.y = this.notchParams.height + this.maxDimension / 2;
    }
  }

  private calculateTotalCount() {
    this.totalCount = this.baseAggregateArray.reduce(
      (count, params) => (params.count ? count + params.count : count),
      0
    );
  }

  private addCountParam() {
    const largestAggregate = this.baseAggregateArray.reduce(
      (largestAggregate, currentAggregate) => {
        const maxVolume = largestAggregate.volume ?? 0;
        const currentVolume = currentAggregate.volume ?? 0;
        return maxVolume > currentVolume ? largestAggregate : currentAggregate;
      }
    );

    if (!largestAggregate.volume) return;

    const totalVolume =
      largestAggregate.volume / largestAggregate.maxVolumeFriction;

    this.baseAggregateArray.forEach((aggregate) => {
      const { maxVolumeFriction, volume = 1 } = aggregate;
      aggregate.count = Math.round((maxVolumeFriction * totalVolume) / volume);
    });
  }

  private getAggregatePosition(): Vector3 {
    const x =
      this.startLocation.x +
      this.currentLocation.x * this.maxDimension -
      0.5 * this.maxDimension;
    const y = this.startLocation.y + this.currentLocation.y * this.maxDimension;
    const z =
      this.startLocation.z +
      this.currentLocation.z * this.maxDimension -
      0.5 * this.maxDimension;

    if (
      this.currentLocation.x === this.grid.x &&
      this.currentLocation.z === this.grid.z
    ) {
      this.currentLocation.x = 1;
      this.currentLocation.z = 1;
      this.currentLocation.y =
        this.currentLocation.y !== this.grid.y
          ? this.currentLocation.y + 1
          : this.grid.y;
    } else if (this.currentLocation.x === this.grid.x) {
      this.currentLocation.x = 1;
      this.currentLocation.z += 1;
    } else {
      this.currentLocation.x++;
    }

    return new Vector3(x, y, z);
  }

  private getRandomAggregate(): BaseAggregate | undefined {
    if (!this.aggregatesTracker.length) {
      this.baseAggregateArray.forEach(({ id, count = 0 }) => {
        for (let index = 0; index < count; index++) {
          this.aggregatesTracker.push(id);
        }
      });

      this.aggregatesTracker = shuffle(this.aggregatesTracker);
    }

    const randomIndex = Math.floor(
      Math.random() * this.aggregatesTracker.length
    );
    const id = this.aggregatesTracker[randomIndex];
    this.aggregatesTracker.splice(randomIndex, 1);

    return this.baseAggregateArray.find((params) => params.id === id);
  }

  private addTrigger() {
    let width = 1;
    let depth = 1;

    if (this.container instanceof CuboidContainer) {
      width = this.container.width;
      depth = this.container.depth;
    } else if (this.container instanceof CylinderContainer) {
      width = this.container.radius * 2;
      depth = width;
    }

    const mesh = MeshBuilder.CreatePlane("trigger-plane", {
      height: depth,
      width,
      sideOrientation: Mesh.DOUBLESIDE,
    });
    mesh.position.y = Math.floor((this.grid.y - 3) * this.maxDimension);
    mesh.rotation.x = Math.PI / 2;
    new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
      mass: 0,
      isTriggerShape: true,
    });

    if (!this.isNullEngine) {
      mesh.material = new StandardMaterial("red");
      mesh.material.alpha = 0.7;
      (mesh.material as StandardMaterial).diffuseColor = Color3.Red();
    }

    const observable = this.physicsEngine.onTriggerCollisionObservable;
    const totalPerLayer = this.grid.x * this.grid.z;
    let countTriggerExited = 0;

    observable.add((collisionEvent) => {
      const { collider } = collisionEvent;
      const mesh = this.meshToPhysicsBodyMap.get(collider);

      if (collisionEvent.type === PhysicsEventType.TRIGGER_ENTERED && mesh) {
        countTriggerExited++;
        this.addToVolumeFraction(mesh);
      }

      if (totalPerLayer === countTriggerExited) {
        for (let index = 0; index < totalPerLayer; index++) {
          this.addAggregate();
        }

        countTriggerExited = 0;
      }
    });
  }

  private addDecelerationLayers() {}
}
