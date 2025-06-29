import mongoose, { Connection } from "mongoose";
import { env } from "./env";

let mongooseConnection: Connection | null = null;

/**
 * Connects to the MongoDB database.
 */
export async function connectMongoose() {
  if (mongooseConnection) {
    return;
  }
  mongooseConnection = (await mongoose.connect(env.MONGO_CONNECTION_STRING)).connection;
}

/**
 * Returns the mongoose connection.
 */
export async function getMongooseConnection(): Promise<Connection> {
  if (!mongooseConnection) {
    await connectMongoose();
  }
  if (!mongooseConnection) {
    throw new Error("Mongoose connection not found");
  }
  return mongooseConnection;
}
