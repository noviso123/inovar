// Image Upload Service with Auto-Optimization
// Uses backend /upload endpoint

import { apiService } from './apiService';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface UploadResponse {
  success: boolean;
  data: {
    url: string;
    [key: string]: any;
  };
}

class ImageUploadService {
  /**
   * Upload an image file to Backend with auto-optimization
   */
  async uploadFile(file: File, name?: string, mode: 'logo' | 'hd' | 'eco' = 'hd'): Promise<UploadResponse> {

    // Auto-compress based on mode
    let fileToUpload = file;

    // Skip compression for non-images
    if (file.type.startsWith('image/')) {
       try {
         console.log(`📉 Processing image (${this.formatFileSize(file.size)}) Mode: ${mode}...`);
         fileToUpload = await this.compressImage(file, mode);
         console.log(`✅ Processed to ${this.formatFileSize(fileToUpload.size)}`);
       } catch (e) {
         console.warn('Compression failed, trying original file', e);
       }
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    if (mode === 'logo' && name) {
        // Assume 'name' contains the context or companyId if passed
        formData.append('type', 'logo');
        formData.append('companyId', name.replace('company-logo-', ''));
    }

    console.log(`📤 Uploading to ${API_BASE}/upload...`);
    const responseData = await apiService.upload('/upload', formData);

    const data = responseData.data;
    if (!data || !data.url) {
        throw new Error('Servidor não retornou a URL do arquivo');
    }

    let fullUrl = data.url;

    // Robustly handle relative vs absolute URLs
    if (data.url.startsWith('/') && !data.url.startsWith('http')) {
        // Remove /api from end of VITE_API_URL or use origin if relative API base
        let baseUrl = API_BASE.split('/api')[0];
        if (!baseUrl.startsWith('http')) {
            baseUrl = window.location.origin;
        }
        fullUrl = `${baseUrl}${data.url}`;
    }

    console.log('📸 Upload successful:', { dataUrl: data.url, fullUrl });

    return {
      success: true,
      status: 200,
      data: {
        id: data.filename,
        title: data.filename,
        url_viewer: fullUrl,
        url: fullUrl,
        display_url: fullUrl,
        width: "0",
        height: "0",
        size: "0",
        time: String(Date.now()),
        expiration: "0",
        image: {
          filename: data.filename,
          name: data.filename,
          mime: fileToUpload.type,
          extension: fileToUpload.name.split('.').pop() || '',
          url: fullUrl,
        },
        thumb: {
          filename: data.filename,
          name: data.filename,
          mime: fileToUpload.type,
          extension: fileToUpload.name.split('.').pop() || '',
          url: fullUrl,
        },
        delete_url: ""
      }
    } as UploadResponse;
  }

  /**
   * Client-side image compression using Canvas
   */
  private async compressImage(file: File, mode: 'logo' | 'hd' | 'eco'): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Config per mode
                let MAX_WIDTH = 1920;
                let MAX_HEIGHT = 1080;
                let QUALITY = 0.8;
                let TYPE = 'image/jpeg';

                if (mode === 'logo') {
                    // Logo: High res, PNG if needed (transparency), or High Quality JPEG
                    MAX_WIDTH = 3000;
                    MAX_HEIGHT = 3000;
                    QUALITY = 1.0;
                    // Preserve PNG for transparency
                    if (file.type === 'image/png') TYPE = 'image/png';
                } else if (mode === 'eco') {
                    // Eco: Smaller, lower quality
                    MAX_WIDTH = 1280;
                    MAX_HEIGHT = 720;
                    QUALITY = 0.6;
                }

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Convert to blob
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas to Blob failed'));
                        return;
                    }
                    // Determine extension based on type
                    let newName = file.name;
                    if (TYPE === 'image/jpeg' && !newName.endsWith('.jpg') && !newName.endsWith('.jpeg')) {
                        newName = newName.replace(/\.[^/.]+$/, ".jpg");
                    }

                    const newFile = new File([blob], newName, {
                        type: TYPE,
                        lastModified: Date.now(),
                    });
                    resolve(newFile);
                }, TYPE, QUALITY);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
  }

  async uploadBase64(base64: string, name?: string): Promise<UploadResponse> {
    const res = await fetch(base64);
    const blob = await res.blob();
    const file = new File([blob], name || "image.png", { type: blob.type });
    return this.uploadFile(file, name);
  }

  async uploadFromUrl(imageUrl: string, name?: string): Promise<UploadResponse> {
    if (imageUrl.includes(API_BASE.replace('/api', ''))) {
      return {
        success: true,
        status: 200,
        data: { url: imageUrl, display_url: imageUrl }
      } as any;
    }
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], name || "image.png", { type: blob.type });
      return this.uploadFile(file, name);
    } catch (e) {
      console.error("Failed to fetch URL for upload", e);
      throw e;
    }
  }

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  // Relaxed check - allows more types for auto-conversion attempt
  isValidImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const imageUploadService = new ImageUploadService();
export type { UploadResponse };
