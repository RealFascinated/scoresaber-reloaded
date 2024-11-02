import Metric from "../metric";
import { Point } from "@influxdata/influxdb-client";
import mongoose from "mongoose";

export default class MongoCollectionSizesMetric extends Metric {
  constructor() {
    super("mongo-collection-sizes");
  }

  async collect(): Promise<Point> {
    const collectionSizes = new Map<string, number>();
    const collections = await mongoose.connection.db?.collections();
    if (collections) {
      for (const collection of collections) {
        const size = collection.aggregate([
          {
            $collStats: {
              storageStats: { scale: 1 },
            },
          },
        ]);

        const collStats = await size?.next();
        if (size && collStats) {
          collectionSizes.set(collection.collectionName, collStats?.storageStats.storageSize);
        }
      }
    }

    const pointBase = this.getPointBase();
    for (const [key, value] of collectionSizes) {
      pointBase.intField(key, value);
    }
    return pointBase;
  }
}
