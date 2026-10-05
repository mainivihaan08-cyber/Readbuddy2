/**
 * Memory-safe client-side image compression utility
 * Resizes large camera photos (12MP - 48MP) to optimal OCR dimensions (max 1024-1200px)
 * and compresses them down from 15MB+ to < 200KB to prevent mobile/browser "low memory" errors.
 */

export async function compressImageFile(
  file: File,
  maxDimension: number = 1200,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If dimensions are within bounds, still downscale if width/height exceed maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          throw new Error('Could not create 2D canvas context');
        }

        // Fill background white in case of transparent png
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image onto downscaled canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as optimized JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

        // Free memory immediately
        URL.revokeObjectURL(objectUrl);
        canvas.width = 1;
        canvas.height = 1;

        resolve(compressedBase64);
      } catch (err: any) {
        URL.revokeObjectURL(objectUrl);
        // Fallback retry with smaller dimension on low-memory devices
        if (maxDimension > 800) {
          compressImageFile(file, 800, 0.6)
            .then(resolve)
            .catch(reject);
        } else {
          reject(err);
        }
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file for compression'));
    };

    img.src = objectUrl;
  });
}
