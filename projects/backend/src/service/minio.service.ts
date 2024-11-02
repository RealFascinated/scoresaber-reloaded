import { getMinioBucketName, MinioBucket } from "@ssr/common/minio-buckets";
import { Client } from "minio";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: Number(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

export default class MinioService {
  /**
   * Saves a file to Minio.
   *
   * @param bucket the bucket to save to
   * @param filename the filename to save as
   * @param data the data to save
   */
  public static async saveFile(bucket: MinioBucket, filename: string, data: Buffer) {
    await minioClient.putObject(getMinioBucketName(bucket), filename, data);
  }

  /**
   * Removes a file from Minio.
   *
   * @param bucket the bucket to remove from
   * @param filename the filename to remove
   */
  public static async deleteFile(bucket: MinioBucket, filename: string) {
    await minioClient.removeObject(getMinioBucketName(bucket), filename);
  }
}
