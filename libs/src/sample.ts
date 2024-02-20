import {
  Color3,
  HavokPlugin,
  Mesh,
  MeshBuilder,
  PhysicsBody,
  PhysicsEventType,
  PhysicsMotionType,
  PhysicsShapeBox,
  PhysicsShapeConvexHull,
  Quaternion,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "babylonjs";

import { AggregateGenerator } from "./aggregate-generator";
import { BaseAggregate } from "./base-aggregate";
import { CuboidContainer } from "./cuboid-container";
import { shuffle } from "lodash-es";

export class Sample {
  private baseAggregateArray: BaseAggregate[];
  private container: CuboidContainer;
  private grid = { x: 0, y: 0, z: 0 };
  private maxDimension = 0;
  private totalCount = 0;
  private totalVolumeFraction = 0;
  private totalAggregatesVolume = 0;
  private currentLocation = { x: 0, y: 0, z: 0 };
  private scene: Scene;
  private meshToPhysicsBodyMap = new Map<PhysicsBody, Mesh>();
  private aggregatesTracker: string[] = [];
  private isNullEngine: boolean;
  private physicsEngine: HavokPlugin;

  constructor(
    baseAggregateArray: BaseAggregate[],
    scene: Scene,
    physicsEngine: HavokPlugin,
    isNullEngine: boolean,
    container: CuboidContainer
  ) {
    this.baseAggregateArray = baseAggregateArray;
    this.container = container;
    this.scene = scene;
    this.physicsEngine = physicsEngine;
    this.isNullEngine = isNullEngine;

    this.calculateMaxDimension();
    this.calculateGrid();
    this.addCountParam();
    this.calculateTotalCount();
    this.addTrigger();

    scene.registerBeforeRender(() => {
      if (this.currentLocation.y !== this.grid.y) {
        for (let index = 0; index < this.grid.x * this.grid.z; index++) {
          const mesh = this.addAggregate();
          mesh && this.addToVolumeFraction(mesh);
        }
      }
    });
  }

  addAggregate(): Mesh | undefined {
    const aggregate = this.getRandomAggregate();

    if (!aggregate) return;

    const aggregateMesh = AggregateGenerator.generate(aggregate);
    aggregateMesh.position = this.getAggregatePosition();

    const aggregateBody = new PhysicsBody(
      aggregateMesh,
      PhysicsMotionType.DYNAMIC,
      false,
      this.scene
    );
    aggregateBody.shape = new PhysicsShapeConvexHull(aggregateMesh, this.scene);
    aggregateBody.shape.material = { friction: 10, restitution: 0 };

    this.meshToPhysicsBodyMap.set(aggregateBody, aggregateMesh);

    return aggregateMesh;
  }

  addToVolumeFraction(mesh: Mesh) {
    const { width, height, depth } = this.container;

    const volume = AggregateGenerator.calculateVolume(mesh);
    this.totalAggregatesVolume += volume ?? 0;
    this.totalVolumeFraction =
      (this.totalAggregatesVolume / (width * height * depth)) * 100;
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
    const { width, height, depth } = this.container;
    this.grid = {
      x: Math.floor(width / this.maxDimension),
      y: Math.ceil(height / this.maxDimension),
      z: Math.floor(depth / this.maxDimension),
    };
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
    if (
      this.currentLocation.x >= this.grid.x - 1 &&
      this.currentLocation.z >= this.grid.z - 1
    ) {
      this.currentLocation.x = 0;
      this.currentLocation.z = 0;
      this.currentLocation.y =
        this.currentLocation.y !== this.grid.y
          ? this.currentLocation.y + 1
          : this.grid.y;
    } else if (this.currentLocation.x >= this.grid.x - 1) {
      this.currentLocation.x = 0;
      this.currentLocation.z += 1;
    } else {
      this.currentLocation.x++;
    }

    const x =
      this.currentLocation.x * this.maxDimension + 0.5 * this.maxDimension;
    const y =
      this.currentLocation.y * this.maxDimension + 0.5 * this.maxDimension;
    const z =
      this.currentLocation.z * this.maxDimension + 0.5 * this.maxDimension;

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
    const thickness = 1;
    const { width, height, depth } = this.container;

    const position = new Vector3(width / 2, height + thickness / 2, depth / 2);
    const dimensions = new Vector3(width, thickness, depth);

    if (!this.isNullEngine) {
      const triggerRepresentation = MeshBuilder.CreateBox("triggerMesh", {
        width: dimensions.x,
        height: dimensions.y,
        depth: dimensions.z,
      });
      triggerRepresentation.position = position;
      triggerRepresentation.material = new StandardMaterial("mat");
      triggerRepresentation.material.alpha = 0.7;
      (triggerRepresentation.material as StandardMaterial).diffuseColor =
        Color3.Red();
    }

    const triggerShape = new PhysicsShapeBox(
      position,
      new Quaternion(0, 0, 0, 1),
      dimensions,
      this.scene
    );
    triggerShape.isTrigger = true;

    const triggerTransform = new TransformNode("triggerTransform");
    const triggerBody = new PhysicsBody(
      triggerTransform,
      PhysicsMotionType.STATIC,
      false,
      this.scene
    );
    triggerBody.shape = triggerShape;
    const totalPerLayer = this.grid.x * this.grid.z;

    let countTriggerExited = 0;
    this.physicsEngine?.onTriggerCollisionObservable.add((event) => {
      if (event.type === PhysicsEventType.TRIGGER_EXITED) {
        countTriggerExited++;
        const mesh = this.meshToPhysicsBodyMap.get(event.collider);
        mesh && this.addToVolumeFraction(mesh);
      }

      if (totalPerLayer === countTriggerExited) {
        for (let index = 0; index < totalPerLayer; index++) {
          this.addAggregate();
        }

        countTriggerExited = 0;
      }
    });
  }

  // private getRandomAggregate() {
  // private aggregatesTracker: { id: string; count: number }[] = [];
  //   if (!this.aggregatesTracker.length) {
  //     this.aggregatesTracker = this.aggregatesParams.map(
  //       ({ id, count = 0 }) => {
  //         return { id, count };
  //       }
  //     );
  //   }

  //   const randomIndex = Math.floor(
  //     Math.random() * this.aggregatesTracker.length
  //   );
  //   const { id } = this.aggregatesTracker[randomIndex];

  //   if (--this.aggregatesTracker[randomIndex].count <= 0) {
  //     this.aggregatesTracker.splice(randomIndex, 1);
  //   }

  //   return this.aggregatesParams.find((params) => params.id === id);
  // }
}
