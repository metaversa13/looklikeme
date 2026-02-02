import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.YANDEX_STORAGE_REGION || "ru-central1",
  endpoint: process.env.YANDEX_STORAGE_ENDPOINT || "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.YANDEX_STORAGE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.YANDEX_STORAGE_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true, // Yandex Object Storage requires path-style
});

const BUCKET = process.env.YANDEX_STORAGE_BUCKET || "looklikeme";

/**
 * Upload a buffer to Yandex Object Storage and return the public URL.
 */
export async function uploadImage(
  buffer: Buffer,
  key: string,
  contentType = "image/jpeg"
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000",
    })
  );

  // Public URL format for Yandex Object Storage
  return `https://${BUCKET}.storage.yandexcloud.net/${key}`;
}
