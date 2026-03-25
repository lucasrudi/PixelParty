import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function saveBrowserFile(file: File) {
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
