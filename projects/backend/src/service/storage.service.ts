import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { getS3BucketName, StorageBucket } from "@ssr/common/minio-buckets";
import { Client } from "minio";

const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
  region: env.MINIO_REGION,
});

export default class StorageService {
  constructor() {
    this.initBuckets();
  }

  /**
   * Gets a file from Minio.
   *
   * @param bucket the bucket to get the file from
   * @param filename the filename to get
   * @returns the file
   */
  public static async getFile(bucket: StorageBucket, filename: string): Promise<Buffer | undefined> {
    try {
      const data = await minioClient.getObject(getS3BucketName(bucket), filename);
      const chunks: Buffer[] = [];
      for await (const chunk of data) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch {
      return undefined;
    }
  }

  /**
   * Saves a file to Minio.
   *
   * @param bucket the bucket to save to
   * @param filename the filename to save as
   * @param data the data to save
   * @param contentType the content type of the file
   */
  public static async saveFile(bucket: StorageBucket, filename: string, data: Buffer) {
    try {
      await minioClient.putObject(getS3BucketName(bucket), filename, data);
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
  public static async deleteFile(bucket: StorageBucket, filename: string) {
    try {
      await minioClient.removeObject(getS3BucketName(bucket), filename);
    } catch (error) {
      Logger.error(`Failed to delete file from Minio: ${error}`);
    }
  }

  /**
   * Checks if a file exists in Minio.
   *
   * @param bucket the bucket to check in
   * @param filename the filename to check
   * @returns true if the file exists, false otherwise
   */
  public static async fileExists(bucket: StorageBucket, filename: string): Promise<boolean> {
    try {
      await minioClient.statObject(getS3BucketName(bucket), filename);
      return true;
    } catch {
      return false;
    }
  }

  public async initBuckets() {
    for (const bucket of Object.values(StorageBucket)) {
      const bucketName = getS3BucketName(bucket);
      if (!(await minioClient.bucketExists(bucketName))) {
        await minioClient.makeBucket(bucketName);
      }
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
}
