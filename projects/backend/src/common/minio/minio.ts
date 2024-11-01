import { Client } from "minio";
import { getMinioBucketName, MinioBucket } from "./minio-buckets";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: Number(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

/**
 * Saves a file to Minio.
 *
 * @param bucket the bucket to save to
 * @param filename the filename to save as
 * @param data the data to save
 */
export async function saveFile(bucket: MinioBucket, filename: string, data: Buffer) {
  await minioClient.putObject(getMinioBucketName(bucket), filename, data);
}

export default minioClient;
