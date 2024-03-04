import { Cuboid } from "@mcm/libs/src/cuboid";
import { CSVAggregateReader } from "./csv-aggregate-reader";
import { WorldManager } from "@mcm/libs";
import { Cylinder } from "@mcm/libs/src/cylinder";
import { NotchParams } from "@mcm/libs/src/types";

const csvUrl = new URL("/AB8_CMG_full.csv", import.meta.url).href;

let worldManager: WorldManager;

onmessage = async function (evt: MessageEvent<Message>) {
  const { messageName } = evt.data;

  switch (messageName) {
    case "init":
      const csvResponse = await fetch(csvUrl);
      const csvString = await csvResponse.text();
      const baseAggregateArray = await CSVAggregateReader.parse(csvString);
      const notchParams: NotchParams = {
        direction: "z",
        width: 20,
        height: 15,
      };
      const shape = new Cuboid(100, 100, 100);
      // const shape = new Cylinder(15, 15);

      worldManager = new WorldManager(
        evt.data.canvas,
        false,
        shape,
        baseAggregateArray,
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
