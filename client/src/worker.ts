import { Cuboid } from "@mcm/libs/src/cuboid";
import { CSVAggregateReader } from "./csv-aggregate-reader";
import { WorldManager } from "@mcm/libs";
import { Cylinder } from "@mcm/libs/src/cylinder";
import { NotchParams } from "@mcm/libs/src/types";

let worldManager: WorldManager;

onmessage = async function (evt: MessageEvent<Message>) {
  const { messageName } = evt.data;

  switch (messageName) {
    case "run":
      const formData = evt.data.formData;
      const baseAggregateArray = await CSVAggregateReader.parse(
        formData["csv-file"]
      );
      const shape =
        formData["container-shape"] === "cuboid"
          ? new Cuboid(
              +formData["container-width"],
              +formData["container-height"],
              +formData["container-depth"]
            )
          : new Cylinder(
              +formData["container-radius"],
              +formData["container-height"],
              +formData["container-segments"]
            );

      let notchParams: NotchParams | undefined = undefined;

      if (formData["has-notch"] === "on") {
        notchParams = {
          direction: formData["notch-direction"],
          width: +formData["notch-width"],
          height: +formData["notch-height"],
        };
      }

      const bodyToMeshScale = +formData["engine-scale"] || undefined;
      const gravity = +formData["engine-gravity"] || undefined;
      const friction = +formData["engine-friction"] || undefined;
      const restitution = +formData["engine-restitution"] || undefined;
      const subTimeStep = +formData["engine-sub-time-step"] || undefined;

      worldManager = new WorldManager(
        evt.data.canvas,
        false,
        shape,
        baseAggregateArray,
        bodyToMeshScale,
        gravity,
        friction,
        restitution,
        subTimeStep,
        notchParams
      );
      worldManager.run();
      break;

    case "resize":
      const { width, height } = evt.data;
      worldManager.resize(width, height);
      break;

    case "pauseSimulation":
      worldManager.pauseSimulation();
      break;

    case "logModel":
      worldManager.logModel();
      break;

    default:
      break;
  }
};
