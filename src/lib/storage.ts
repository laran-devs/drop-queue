import { unlink } from "fs/promises";
import { join } from "path";

/**
 * Deletes a file from the public/uploads directory.
 * @param filePath The relative path starting with /uploads/
 */
export async function deleteUploadedFile(filePath: string | null) {
  if (!filePath || !filePath.startsWith("/uploads/")) {
    return;
  }

  try {
    const fileName = filePath.replace("/uploads/", "");
    const fullPath = join(process.cwd(), "public", "uploads", fileName);
    
    await unlink(fullPath);
    console.log(`[Storage] Deleted file: ${fullPath}`);
  } catch (error) {
    if ((error as any).code === "ENOENT") {
      console.warn(`[Storage] File not found for deletion: ${filePath}`);
    } else {
      console.error(`[Storage] Failed to delete file ${filePath}:`, error);
    }
  }
}
