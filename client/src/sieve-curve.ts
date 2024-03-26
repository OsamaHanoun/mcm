import { Chart } from "chart.js/auto";
import { CSVAggregateReader } from "./csv-aggregate-reader";
import { SieveAnalysis } from "@mcm/libs/src/sieve-analysis";

const addChart = async (csv: string) => {
  const baseAggregateArray = await CSVAggregateReader.parse(csv);
  const data = SieveAnalysis.calculateCurve(baseAggregateArray);
  const canvasElement = document.getElementById("chart") as HTMLCanvasElement;

  const chart = new Chart(canvasElement, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Sieve Curve",
          data: data,
          showLine: true,
        },
      ],
    },
    options: {
      scales: {
        x: {
          display: true,
          type: "logarithmic",
        },
      },
    },
  });
};

export { addChart };
