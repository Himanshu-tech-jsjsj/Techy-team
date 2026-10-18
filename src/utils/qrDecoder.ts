import jsQR from 'jsqr';

export interface DecodedQR {
  data: string;
  source: 'file' | 'camera' | 'sample';
}

/**
 * Decodes a QR code from an HTMLImageElement or ImageData using jsQR
 */
export async function decodeQrFromImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            reject(new Error('Canvas context could not be created'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, img.width, img.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          // If not detected, try high-contrast grayscale pass
          if (!code) {
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
              const threshold = avg > 128 ? 255 : 0;
              data[i] = threshold;
              data[i + 1] = threshold;
              data[i + 2] = threshold;
            }
            ctx.putImageData(imageData, 0, 0);
            const contrastData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            code = jsQR(contrastData.data, contrastData.width, contrastData.height, {
              inversionAttempts: 'attemptBoth',
            });
          }

          if (code && code.data) {
            resolve(code.data.trim());
          } else {
            reject(new Error('No readable QR code found in the uploaded image. Please ensure the QR code is clearly visible and not blurred.'));
          }
        } catch (err: any) {
          reject(new Error(`Error decoding QR code: ${err.message}`));
        }
      };

      img.onerror = () => {
        reject(new Error('Could not parse image file. Please provide a valid PNG, JPG, or WEBP image.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Error reading image file'));
    };

    reader.readAsDataURL(file);
  });
}
