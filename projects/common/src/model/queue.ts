import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: { collection: "queues" },
})
export class Queue<T> {
  /**
   * The id of the queue
   */
  @prop()
  public id!: string;

  /**
   * The items in the queue
   */
  @prop()
  public items!: T[];
}

export type QueueDocument<T> = Queue<T> & Document;
export const QueueModel: ReturnModelType<typeof Queue> = getModelForClass(Queue);
