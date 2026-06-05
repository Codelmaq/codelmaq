/**
 * High-Performance Client-Side Image Compression Tool for Offline APK
 * Prevents memory leak and storage bloat inside Android Webview wrapper (APK).
 */
export async function compressImage(fileOrDataUrl: File | string, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const handleCompression = (src: string) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Apply aspect ratio preservation calculations
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback if canvas context cannot be initialized
          resolve(src);
          return;
        }

        // Draw image stretched to our compressed target width/height
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas image into high-efficiency JPEG dataURI
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = (e) => {
        reject(new Error('Erro ao carregar imagem para compressão: ' + e));
      };

      img.src = src;
    };

    if (fileOrDataUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleCompression(event.target.result as string);
        } else {
          reject(new Error('Leitura de ficheiro vazia'));
        }
      };
      reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem'));
      reader.readAsDataURL(fileOrDataUrl);
    } else {
      handleCompression(fileOrDataUrl);
    }
  });
}
