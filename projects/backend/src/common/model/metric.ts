import {
  getModelForClass,
  modelOptions,
  prop,
  ReturnModelType,
  Severity,
} from "@typegoose/typegoose";
import { Document } from "mongoose";

/**
 * The model for a metric value.
 */
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: { collection: "metrics" },
})
export class MetricValue {
  /**
   * The id of the metric.
   */
  @prop()
  public _id!: string;

  /**
   * The value of this metric.
   */
  @prop()
  public value?: unknown;
}

export type MetricValueDocument = MetricValue & Document;
export const MetricValueModel: ReturnModelType<typeof MetricValue> = getModelForClass(MetricValue);
