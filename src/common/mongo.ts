import * as mongoose from "mongoose";

/**
 * Connects to the mongo database
 */
export async function connectMongo() {
  const connectionUri = process.env.MONGO_URI;
  if (!connectionUri) {
    throw new Error("Missing MONGO_URI");
  }
  await mongoose.connect(connectionUri);
}
