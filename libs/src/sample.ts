import {
  Color3,
  Color4,
  HavokPlugin,
  IBasePhysicsCollisionEvent,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsBody,
  PhysicsEventType,
  PhysicsMotionType,
  PhysicsShapeConvexHull,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  Vector3,
} from "babylonjs";

import { AggregateGenerator } from "./aggregate-generator";
import { BaseAggregate } from "./base-aggregate";
import { CuboidContainer } from "./cuboid-container";
import { shuffle } from "lodash-es";
import { CylinderContainer } from "./cylinder-container";
import { NotchParams, TriggerType } from "./types";

export class Sample {
  public intersectedMeshes = new Map<Mesh, Set<Mesh>>();

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
  private dynamicBodyMeshMap = new Map<PhysicsBody, Mesh>();
  private staticBodyMeshMap = new Map<PhysicsBody, Mesh>();
  private bodiesInContainerSet = new Set<PhysicsBody>();
  private aggregatesTracker: string[] = [];
  private isNullEngine: boolean;
  private physicsEngine: HavokPlugin;
  private notchParams?: NotchParams;
  private bodyToMeshScale: number;
  private friction: number;
  private restitution: number;
  private totalPerLayer: number = 0;

  constructor(
    baseAggregateArray: BaseAggregate[],
    scene: Scene,
    physicsEngine: HavokPlugin,
    isNullEngine: boolean,
    container: CuboidContainer | CylinderContainer,
    bodyToMeshScale: number = 2,
    friction: number,
    restitution: number,
    notchParams?: NotchParams
  ) {
    this.baseAggregateArray = baseAggregateArray;
    this.container = container;
    this.scene = scene;
    this.physicsEngine = physicsEngine;
    this.isNullEngine = isNullEngine;
    this.notchParams = notchParams;
    this.bodyToMeshScale = bodyToMeshScale;
    this.friction = friction;
    this.restitution = restitution;

    this.calculateMaxDimension();
    this.calculateGrid();
    this.calculateStartLocation();
    this.addCountParam();
    this.calculateTotalCount();
    this.createTriggers();
    this.handleTriggers();
    this.addLayerOfAggregates();
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
    body.shape.material = {
      friction: this.friction,
      restitution: this.restitution,
    };

    mesh.scaling.scaleInPlace(1 / this.bodyToMeshScale);
    this.meshToPhysicsBodyMap.set(body, mesh);
    this.dynamicBodyMeshMap.set(body, mesh);

    return mesh;
  }

  private addLayerOfAggregates(): void {
    for (let index = 0; index < this.totalPerLayer; index++) {
      this.addAggregate();
    }
  }

  private addToVolumeFraction(mesh: Mesh) {
    const containerVolume = this.container.volume;
    const volume = AggregateGenerator.calculateVolume(mesh);
    this.totalAggregatesVolume += volume ?? 0;
    this.totalVolumeFraction =
      (this.totalAggregatesVolume / containerVolume) * 100;
    // console.log(this.totalVolumeFraction);
  }

  private calculateMaxDimension() {
    this.maxDimension =
      this.baseAggregateArray.reduce((previousValue, currentValue) => {
        return Math.max(
          previousValue,
          currentValue.a,
          currentValue.b,
          currentValue.c
        );
      }, 0) * 0.6;
  }

  private calculateGrid() {
    const y = Math.ceil(
      (this.container.height + this.maxDimension) / this.maxDimension
    );

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

    this.totalPerLayer = this.grid.x * this.grid.z;
  }

  private calculateStartLocation() {
    if (this.container instanceof CuboidContainer) {
      const { width, depth } = this.container;
      this.startLocation.x = -width / 2 + 0.25 * this.maxDimension;
      this.startLocation.z = -depth / 2 + 0.25 * this.maxDimension;
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
    const y =
      this.startLocation.y +
      this.currentLocation.y * this.maxDimension +
      this.maxDimension * 1.4;
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

  private createTriggers() {
    let xDim = 1;
    let zDim = 1;

    if (this.container instanceof CuboidContainer) {
      xDim = this.container.width;
      zDim = this.container.depth;
    } else if (this.container instanceof CylinderContainer) {
      xDim = this.container.radius * 2;
      zDim = xDim;
    }
    debugger;
    const triggers = [
      {
        id: TriggerType.GenerateAggregate,
        yPosition: this.startLocation.y + this.maxDimension,
        xDim,
        zDim,
        color: Color4.FromColor3(Color3.Red(), 0.7),
      },
      {
        id: TriggerType.DeleteAggregate,
        yPosition: -1,
        color: Color4.FromColor3(Color3.Gray(), 0),
        xDim: Math.max(xDim, zDim) * 50,
        zDim: Math.max(xDim, zDim) * 50,
      },
    ] as const;

    for (let index = 0; index < triggers.length; index++) {
      const { id: name, yPosition, color, xDim, zDim } = triggers[index];
      const mesh = MeshBuilder.CreatePlane(name, {
        width: xDim,
        height: zDim,
        sideOrientation: Mesh.DOUBLESIDE,
      });
      mesh.position.y = yPosition;
      mesh.rotation.x = Math.PI / 2;

      mesh.material = new StandardMaterial("");
      mesh.material.alpha = color.a;
      (mesh.material as StandardMaterial).diffuseColor = new Color3(
        color.r,
        color.g,
        color.b
      );

      new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
        mass: 0,
        isTriggerShape: true,
      });
    }
  }

  private handleTriggers() {
    const observable = this.physicsEngine.onTriggerCollisionObservable;
    const totalPerLayer = this.grid.x * this.grid.z;
    const createAggregateBody = this.scene.getMeshByName(
      TriggerType.GenerateAggregate
    )?.physicsBody as PhysicsBody;
    const removeAggregateBody = this.scene.getMeshByName(
      TriggerType.DeleteAggregate
    )?.physicsBody;
    const groundBody = this.scene.getMeshByName("y-")
      ?.physicsBody as PhysicsBody;
    let bodyPassedT1Set = new Set<PhysicsBody>();

    let countTriggerExited = 0;
    let lastCollisionTime = 0;
    const timeoutDuration = 20000;

    this.scene.registerBeforeRender(() => {
      const currentTime = performance.now();

      if (
        this.grid.y !== this.currentLocation.y &&
        currentTime - lastCollisionTime >= timeoutDuration
      ) {
        lastCollisionTime = currentTime;
        countTriggerExited = 0;
        this.currentLocation.y = this.currentLocation.y + 1;

        createAggregateBody.disablePreStep = false;
        createAggregateBody.transformNode.position.y =
          this.currentLocation.y * this.maxDimension;

        const groundPositionY =
          (this.currentLocation.y - 3.5) * this.maxDimension;
        groundBody.disablePreStep = false;
        groundBody.transformNode.position.y =
          groundPositionY < 0 ? 0 : groundPositionY;

        this.dynamicBodyMeshMap.forEach((_, body) => {
          body.setMotionType(PhysicsMotionType.STATIC);
        });

        this.staticBodyMeshMap.forEach((mesh, body) => {
          const boundingBox = mesh.getBoundingInfo().boundingBox;

          if (groundPositionY > boundingBox.maximumWorld.y) {
            body.dispose();
            mesh.setEnabled(false);
          } else {
            this.dynamicBodyMeshMap.set(body, mesh);
          }
        });

        this.staticBodyMeshMap = this.dynamicBodyMeshMap;
        this.dynamicBodyMeshMap = new Map();
        bodyPassedT1Set = new Set();

        setTimeout(() =>
          this.scene.executeOnceBeforeRender(() => {
            this.addLayerOfAggregates();
            createAggregateBody.disablePreStep = true;
          })
        );
      } else if (this.grid.y === this.currentLocation.y) {
        this.dynamicBodyMeshMap.forEach((_, body) => {
          body.dispose();
        });

        this.meshToPhysicsBodyMap.forEach((mesh, body, map) => {
          const boundingBox = mesh.getBoundingInfo().boundingBox;

          if (
            this.startLocation.y + this.container.height >
            boundingBox.minimumWorld.y
          ) {
            mesh.setEnabled(true);
          } else {
            mesh.dispose();
            map.delete(body);
          }
        });
      }
    });

    observable.add((collisionEvent) => {
      const { collidedAgainst, collider, type } = collisionEvent;
      const mesh = this.meshToPhysicsBodyMap.get(collider);
      if (mesh === undefined) return;

      if (
        type === PhysicsEventType.TRIGGER_ENTERED &&
        collidedAgainst === createAggregateBody &&
        !bodyPassedT1Set.has(collider)
      ) {
        bodyPassedT1Set.add(collider);
        countTriggerExited++;

        if (totalPerLayer === countTriggerExited) {
          lastCollisionTime = performance.now();

          this.addLayerOfAggregates();
          countTriggerExited = 0;
        }
      } else if (
        type === PhysicsEventType.TRIGGER_ENTERED &&
        collidedAgainst === removeAggregateBody
      ) {
        mesh.dispose();
        collider.dispose();
        this.meshToPhysicsBodyMap.delete(collider);
        this.dynamicBodyMeshMap.has(collider) && countTriggerExited++;
        this.dynamicBodyMeshMap.delete(collider);
      }
    });
  }
}
