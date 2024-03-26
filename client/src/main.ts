import { Form } from "./form";
import { addChart } from "./sieve-curve";

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const offscreen = canvas.transferControlToOffscreen();

window.addEventListener("resize", () => {
  worker.postMessage({
    messageName: "resize",
    width: canvas.clientWidth,
    height: canvas.clientHeight,
  });
});

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

// worker.onmessage = (e: MessageEvent<Message>) => {
//   const { messageName } = e.data;

//   switch (messageName) {
//     case "stlFile":
//       downloadSTL(e.data.stlFile);
//       break;

//     default:
//       break;
//   }
// };

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
