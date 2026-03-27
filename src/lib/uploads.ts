import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import {
  assertUploadStorageAvailable,
  resolveUploadStorageDriver,
} from "@/lib/storage-config";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

interface BinaryUploadInput {
  bytes: Buffer;
  fileName: string;
  contentType?: string;
}

async function saveLocalBrowserFile(file: File) {
  assertUploadStorageAvailable();
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || ".bin";
  const fileName = `${crypto.randomUUID().slice(0, 8)}${extension}`;
  const absolutePath = path.join(UPLOAD_DIR, fileName);

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(absolutePath, bytes);

  return {
    assetUrl: `/uploads/${fileName}`,
    fileName: file.name,
  };
}

async function saveLocalBinaryAsset(input: BinaryUploadInput) {
  assertUploadStorageAvailable();
  const extension = path.extname(input.fileName) || ".bin";
  const storedFileName = `${crypto.randomUUID().slice(0, 8)}${extension}`;
  const absolutePath = path.join(UPLOAD_DIR, storedFileName);

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(absolutePath, input.bytes);

  return {
    assetUrl: `/uploads/${storedFileName}`,
    fileName: input.fileName,
  };
}

async function saveBlobBrowserFile(file: File) {
  const extension = path.extname(file.name) || ".bin";
  const blobPath = `evidence/${crypto.randomUUID()}${extension}`;
  const uploaded = await put(blobPath, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type || undefined,
  });

  return {
    assetUrl: uploaded.url,
    fileName: file.name,
  };
}

async function saveBlobBinaryAsset(input: BinaryUploadInput) {
  const extension = path.extname(input.fileName) || ".bin";
  const blobPath = `evidence/${crypto.randomUUID()}${extension}`;
  const uploaded = await put(blobPath, input.bytes, {
    access: "public",
    addRandomSuffix: false,
    contentType: input.contentType,
  });

  return {
    assetUrl: uploaded.url,
    fileName: input.fileName,
  };
}

export async function saveBrowserFile(file: File) {
  if (resolveUploadStorageDriver() === "blob") {
    return saveBlobBrowserFile(file);
  }

  return saveLocalBrowserFile(file);
}

export async function saveBinaryAsset(input: BinaryUploadInput) {
  if (resolveUploadStorageDriver() === "blob") {
    return saveBlobBinaryAsset(input);
  }

  return saveLocalBinaryAsset(input);
}
