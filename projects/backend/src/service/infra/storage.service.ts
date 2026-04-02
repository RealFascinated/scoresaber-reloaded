import { SSRCache } from "@ssr/common/cache";
import { env } from "@ssr/common/env";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { getS3BucketName, StorageBucket } from "@ssr/common/minio-buckets";
import { S3Client } from "bun";
import CachePerformanceMetric from "../../metrics/impl/backend/cache-performance";

export default class StorageService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Storage");
  private static CACHE: SSRCache;
  private static readonly STORAGE_FILE_CACHE_ID = "s3_file_content";

  private static readonly S3_CLIENT = new S3Client({
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
  });

  private static getFileRef(bucket: StorageBucket, filename: string) {
    return StorageService.S3_CLIENT.file(filename, {
      bucket: getS3BucketName(bucket),
    });
  }

  constructor() {
    StorageService.CACHE = new SSRCache({
      maxObjects: 5_000,
    });
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
    const cacheKey = `${bucket}:${filename}`;
    const cached = StorageService.CACHE.get<Buffer>(cacheKey);
    if (cached !== undefined) {
      CachePerformanceMetric.recordHit(StorageService.STORAGE_FILE_CACHE_ID, "MEMORY");
      return cached;
    }
    CachePerformanceMetric.recordMiss(StorageService.STORAGE_FILE_CACHE_ID, "MEMORY");

    try {
      const s3file = StorageService.getFileRef(bucket, filename);
      const bytes = await s3file.bytes();
      const file = Buffer.from(bytes);
      StorageService.CACHE.set(cacheKey, file);
      return file;
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
      const s3file = StorageService.getFileRef(bucket, filename);
      await s3file.write(data);
      StorageService.CACHE.set(`${bucket}:${filename}`, data);
    } catch (error) {
      StorageService.logger.error(`Failed to save file to S3: ${error}`);
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
      const s3file = StorageService.getFileRef(bucket, filename);
      await s3file.delete();
      StorageService.CACHE.remove(`${bucket}:${filename}`);
    } catch (error) {
      StorageService.logger.error(`Failed to delete file from S3: ${error}`);
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
      const s3file = StorageService.getFileRef(bucket, filename);
      return await s3file.exists();
    } catch {
      return false;
    }
  }

  public async initBuckets() {
    for (const bucket of Object.values(StorageBucket)) {
      try {
        // Bun's S3 client currently focuses on object operations (read/write/delete/list) and does not expose
        // an API for creating buckets. We do a lightweight request as a sanity check so misconfiguration is
        // surfaced early in dev/prod logs.
        await StorageService.S3_CLIENT.list(
          { maxKeys: 1 },
          {
            bucket: getS3BucketName(bucket),
          },
        );
      } catch (error) {
        StorageService.logger.warn(
          `S3 bucket not accessible (must exist already): ${getS3BucketName(bucket)} (${error})`,
        );
      }
    }
  }
}
