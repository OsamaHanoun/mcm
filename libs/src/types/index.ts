export type NotchParams = {
  direction: "x" | "z";
  height: number;
  width: number;
};

export enum TriggerType {
  GenerateAggregate = "T1",
  AddToStatic = "T2",
  DeleteAggregate = "T3",
}
