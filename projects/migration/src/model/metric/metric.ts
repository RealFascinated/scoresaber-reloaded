import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";

/**
 * Mongo metric snapshot document from `metrics` collection.
 */
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: { collection: "metrics" },
})
export class MetricValue {
  /**
   * The metric id.
   */
  @prop()
  public _id!: string;

  /**
   * The metric value payload.
   */
  @prop()
  public value?: unknown;
}

export type MetricValueDocument = MetricValue & Document;
export const MetricValueModel: ReturnModelType<typeof MetricValue> = getModelForClass(MetricValue);
