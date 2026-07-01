/** Resize/compress a photo before sending to the API (keeps payloads under Express limits). */
export async function compressImageFile(
  file: File,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxBytes?: number;
  }
): Promise<string> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.72,
    maxBytes = 550_000,
  } = options ?? {};

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not process image");
    }
    ctx.drawImage(image, 0, 0, width, height);

    let currentQuality = quality;
    let dataUrl = canvas.toDataURL("image/jpeg", currentQuality);
    while (estimateBase64Bytes(dataUrl) > maxBytes && currentQuality > 0.45) {
      currentQuality -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", currentQuality);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to read image"));
    image.src = src;
  });
}

function estimateBase64Bytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}
