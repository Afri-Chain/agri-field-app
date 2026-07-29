// src/utils/compression.js
import imageCompression from 'browser-image-compression';

export async function compressImage(file) {
  const options = {
    maxSizeMB: 0.15, // ~150KB
    maxWidthOrHeight: 1280,
    useWebWorker: true,
  };
  return imageCompression(file, options);
}
