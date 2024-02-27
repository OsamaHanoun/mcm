import { BaseAggregate } from "..";

export class SieveAnalysis {
  static readonly sizeArray = [
    0, 0.063, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 31.5, 63,
  ];

  static calculateCurve(
    baseAggregateArray: BaseAggregate[]
  ): { x: number; y: number }[] {
    const retainedArray: number[] =
      this.calculatePercentRetained(baseAggregateArray);
    const passingPercentageArray: number[] =
      this.calculatePassingPercentage(retainedArray);
    const data: { x: number; y: number }[] = [];

    for (let index = 0; index < this.sizeArray.length; index++) {
      const point = {
        x: this.sizeArray[index],
        y: passingPercentageArray[index],
      };

      data.push(point);
    }

    return data;
  }

  private static findSecondLargest(baseAggregate: BaseAggregate): number {
    const { a, b, c } = baseAggregate;

    return [a, b, c].sort()[1];
  }

  private static calculatePercentRetained(
    aggregateArray: BaseAggregate[]
  ): number[] {
    const retainedArray: number[] = new Array(this.sizeArray.length).fill(0);

    aggregateArray.forEach((aggregate) => {
      const aggregateSize = this.findSecondLargest(aggregate);
      const volumeFraction = aggregate.maxVolumeFriction * 100;
      const sizeIndex = this.sizeArray.findIndex(
        (size) => aggregateSize < size
      );

      if (sizeIndex !== -1) {
        retainedArray[sizeIndex - 1] += volumeFraction;
      } else {
        retainedArray[sizeIndex] += volumeFraction;
      }
    });

    return retainedArray;
  }

  private static calculatePassingPercentage(retainedArray: number[]): number[] {
    let remainPercentage = 100;
    const percentFiner: number[] = [];

    for (let index = retainedArray.length - 1; 0 <= index; index--) {
      remainPercentage -= retainedArray[index];
      percentFiner[index] = remainPercentage > 0 ? remainPercentage : 0;
    }

    return percentFiner;
  }
}
