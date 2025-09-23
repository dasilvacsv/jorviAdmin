import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from 'sharp';
import path from 'path';

// Initialize the S3 client with MinIO configuration
const s3Client = new S3Client({
  region: "us-east-1", // This can be any value for MinIO
  endpoint: `https://${process.env.S3_ENDPOINT}:${process.env.S3_PORT || 443}`,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  forcePathStyle: true, // Required for MinIO
});

// Default bucket name
const BUCKET_NAME = process.env.S3_BUCKET || "default";

/**
 * Upload a file to MinIO S3, compressing it if it's an image larger than 3MB.
 * @param file - The file buffer to upload
 * @param key - The key (path) where the file will be stored (e.g., 'images/my-photo.jpg')
 * @param contentType - The content type of the file
 * @returns The URL of the uploaded file
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  // Define the size threshold in bytes (3 MB)
  const SIZE_THRESHOLD_BYTES = 3 * 1024 * 1024;

  let fileToUpload = file;
  let keyToUpload = key;
  let finalContentType = contentType;

  // Check if the file is an image and exceeds the size threshold
  if (contentType.startsWith('image/') && file.length > SIZE_THRESHOLD_BYTES) {
    console.log(`Large image detected (${(file.length / 1024 / 1024).toFixed(2)} MB). Compressing...`);

    // Compress the image to WebP format with 80% quality (excellent balance)
    fileToUpload = await sharp(file)
      .webp({ quality: 80 })
      .toBuffer();

    // Update the file extension to .webp
    const parsedPath = path.parse(key);
    keyToUpload = path.join(parsedPath.dir, `${parsedPath.name}.webp`);

    // Update the content type
    finalContentType = 'image/webp';

    console.log(`Image compressed to WebP. New size: ${(fileToUpload.length / 1024 / 1024).toFixed(2)} MB`);
  }

  // Use the (potentially compressed) data to upload to S3
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: keyToUpload,         // Use the updated key
    Body: fileToUpload,       // Use the updated buffer
    ContentType: finalContentType, // Use the updated ContentType
  });

  await s3Client.send(command);

  // Generate the URL using the final key
  const url = `https://${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${keyToUpload}`;
  console.log(`File uploaded successfully to: ${url}`);
  return url;
}

/**
 * Generate a presigned URL for downloading a file from S3
 * @param key - The key (path) of the file in S3
 * @param expiresIn - The number of seconds until the URL expires (default: 3600)
 * @returns The presigned URL
 */
export async function getPresignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Delete a file from MinIO S3
 * @param key - The key (path) of the file in S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}