import {
  createBoundingBoxCuboid,
  createGeometry,
  exportToSTL,
  mergeCloseVertices,
  rebuildWithConvexHull,
  removeGeometriesOutsideCuboid,
  removeIntersectionBetweenGeometries,
} from "@mcm/libs/src/jscad";
import { Form } from "./form";
import { addChart } from "./sieve-curve";
import { transforms } from "@jscad/modeling";
import csv from "/AB8_CMG_full.csv?url&raw";

const isDevMode = true;

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const offscreen = canvas.transferControlToOffscreen();

if (isDevMode) {
  document.getElementById("canvas-container")?.classList.remove("hide");

  const formDataObj = {
    "csv-file": csv,
    "container-shape": "cuboid",
    "container-width": "100",
    "container-height": "100",
    "container-depth": "100",
    "engine-scale": "1.2",
  };

  document.querySelectorAll(".hide")?.forEach((element) => {
    element.classList.remove("hide");
  });

  worker.postMessage(
    {
      messageName: "run",
      canvas: offscreen,
      height: canvas.clientHeight,
      formData: formDataObj,
    },
    [offscreen]
  );
} else {
  const form = new Form();
  form.formElement.addEventListener("submit", (event) => {
    const target = event.target as HTMLFormElement;
    const formData = new FormData(target);
    const formDataObj = Object.fromEntries(formData.entries());

    const reader = new FileReader();
    reader.onload = function (event) {
      const csvString = event.target?.result as string;

      formDataObj["csv-file"] = csvString;

      addChart(csvString);

      worker.postMessage(
        {
          messageName: "run",
          canvas: offscreen,
          height: canvas.clientHeight,
          formData: formDataObj,
        },
        [offscreen]
      );
    };
    reader.readAsText(formDataObj["csv-file"] as File);

    document.querySelectorAll(".hide")?.forEach((element) => {
      element.classList.remove("hide");
    });

    event.preventDefault();
    event.stopPropagation();
    form.destroy();
  });
}

window.addEventListener("resize", () => {
  worker.postMessage({
    messageName: "resize",
    width: canvas.clientWidth,
    height: canvas.clientHeight,
  });
});

worker.onmessage = (e: any) => {
  worker.terminate();
  const geometries: any[] = [];

  e.data.forEach((aggregate: any) => {
    geometries.push(createGeometry(aggregate.vertices, aggregate.indices));
  });

  // const cover = 2;
  // const croppedGeometries = removeGeometriesOutsideCuboid(
  //   geometries,
  //   [25 - cover, 25 - cover, 25 - cover],
  //   [0, (25 - cover) / 2, 0]
  // );

  // const repairedGeometries = croppedGeometries
  //   .map((geom) => rebuildWithConvexHull(geom))
  //   .filter((geom) => geom) as any[];

  // const removedIntersectionGeometries =
  //   removeIntersectionBetweenGeometries(repairedGeometries);

  exportToSTL(geometries, [25, 25, 25], [0, 25 / 2, 0]);
};

document
  .getElementById("pauseSimulation")
  ?.addEventListener("click", (event) => {
    (event.target as HTMLButtonElement).disabled = true;

    worker.postMessage({
      messageName: "pauseSimulation",
    });
  });

document.getElementById("logModel")?.addEventListener("click", () => {
  worker.postMessage({
    messageName: "logModel",
  });
});

// document.getElementById("download")?.addEventListener("click", () => {
//   worker.postMessage({
//     messageName: "pauseSimulation",
//   });

//   worker.postMessage({
//     messageName: "getMeshes",
//   });
// });

// function disableButton(event: Event) {
//   (event.target as HTMLButtonElement).disabled = true;
// }

// function downloadSTL(stlFile: any) {
//   const blob = new Blob([stlFile], { type: "application/octet-stream" });
//   const link = document.createElement("a");
//   link.href = URL.createObjectURL(blob);
//   link.download = "sample.stl";
//   document.body.append(link);
//   link.click();
//   link.remove();
//   setTimeout(() => URL.revokeObjectURL(link.href), 7000);
// }
