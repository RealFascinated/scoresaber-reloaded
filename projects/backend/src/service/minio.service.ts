import { env } from "@ssr/common/env";
import { getMinioBucketName, MinioBucket } from "@ssr/common/minio-buckets";
import { Client } from "minio";

const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export default class MinioService {
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
   * Saves a file to Minio.
   *
   * @param bucket the bucket to save to
   * @param filename the filename to save as
   * @param data the data to save
   * @param contentType the content type of the file
   */
  public static async saveFile(
    bucket: MinioBucket,
    filename: string,
    data: Buffer,
    contentType?: string
  ) {
    await minioClient.putObject(getMinioBucketName(bucket), filename, data, undefined, {
      "Content-Type": contentType,
    });
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
  }
}
