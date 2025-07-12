import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { getMinioBucketName, MinioBucket } from "@ssr/common/minio-buckets";
import { Client } from "minio";
import { Readable } from "node:stream";

const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export default class MinioService {
  constructor() {
    for (const bucket of Object.values(MinioBucket)) {
      minioClient.makeBucket(getMinioBucketName(bucket)).then(() => {
        Logger.info(`Bucket ${getMinioBucketName(bucket)} created`);
      });
    }
  }

  /**
   * Gets the Minio client.
   *
   * @returns the Minio client
   */
  public static getMinioClient() {
    return minioClient;
  }

  /**
   * Gets a file from Minio.
   *
   * @param bucket the bucket to get the file from
   * @param filename the filename to get
   * @returns the file
   */
  public static async getFile(bucket: MinioBucket, filename: string): Promise<Buffer | null> {
    try {
      const data = await minioClient.getObject(getMinioBucketName(bucket), filename);
      const chunks: Buffer[] = [];
      for await (const chunk of data) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
  }

  /**
   * Gets a file stream from Minio.
   *
   * @param bucket the bucket to get the file from
   * @param filename the filename to get
   * @returns the file stream
   */
  public static async getFileStream(bucket: MinioBucket, filename: string): Promise<Readable> {
    return minioClient.getObject(getMinioBucketName(bucket), filename);
  }

  /**
   * Saves a file to Minio.
   *
   * @param bucket the bucket to save to
   * @param filename the filename to save as
   * @param data the data to save
   * @param contentType the content type of the file
   */
  public static async saveFile(bucket: MinioBucket, filename: string, data: Buffer) {
    try {
      await minioClient.putObject(getMinioBucketName(bucket), filename, data);
    } catch (error) {
      Logger.error(`Failed to save file to Minio: ${error}`);
    }
  }

  /**
   * Removes a file from Minio.
   *
   * @param bucket the bucket to remove from
   * @param filename the filename to remove
   */
  public static async deleteFile(bucket: MinioBucket, filename: string) {
    try {
      await minioClient.removeObject(getMinioBucketName(bucket), filename);
    } catch (error) {
      Logger.error(`Failed to delete file from Minio: ${error}`);
    }
  }

  /**
   * Gets the stats of a bucket.
   *
   * @param bucket the bucket to get the stats of
   * @returns the stats of the bucket
   */
  public static async getBucketStats(bucket: MinioBucket): Promise<{
    totalSize: number;
    totalObjects: number;
  }> {
    try {
      const objects = await minioClient.listObjects(getMinioBucketName(bucket), "", true);
      let totalSize = 0;
      let totalObjects = 0;
      for await (const object of objects) {
        totalSize += object.size;
        totalObjects++;
      }
      return {
        totalSize,
        totalObjects,
      };
    } catch (error) {
      Logger.error(`Failed to get bucket stats from Minio: ${error}`);
      return {
        totalSize: 0,
        totalObjects: 0,
      };
    }
  }
}
