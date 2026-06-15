/**
 * Upload service stub.
 * Replace the implementation of `uploadFile` with an S3/Cloudinary adapter
 * when cloud storage is configured. The interface remains stable.
 */

export interface UploadResult {
  url: string;
  key: string;
}

export interface UploadableFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

/**
 * Stub upload function — returns a placeholder URL.
 * Swap this for a real S3/Cloudinary upload without changing callers.
 *
 * @param _file - File to upload (unused in stub)
 * @param folder - Logical folder/prefix for the file
 * @returns Upload result with a placeholder URL
 */
export async function uploadFile(
  _file: UploadableFile,
  folder: string = 'uploads',
): Promise<UploadResult> {
  const key = `${folder}/placeholder-${Date.now()}`;
  return {
    url: `https://via.placeholder.com/200?text=Logo`,
    key,
  };
}
