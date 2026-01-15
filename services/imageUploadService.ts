// Image Upload Service
// Uses backend /upload endpoint

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

interface UploadResponse {
  success: boolean;
  data: {
    url: string;
    [key: string]: any;
  };
}

class ImageUploadService {
  /**
   * Upload an image file to Backend
   * @param file - The file to upload (File object)
   * @param name - Optional custom name (unused in backend for now)
   * @returns Promise with the upload response
   */
  async uploadFile(file: File, name?: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Get token from localStorage
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
    }

    const responseData = await response.json();
    const data = responseData.data;

    // Build the full URL correctly
    // API_BASE is like "http://localhost:8080/api"
    // We need the base without /api: "http://localhost:8080"
    // data.url is like "/uploads/filename.jpg"
    const baseUrl = API_BASE.replace('/api', '');
    const uploadUrl = data.url.startsWith('/') ? data.url : '/' + data.url;
    const fullUrl = baseUrl + uploadUrl;

    console.log('📸 Upload successful:', { dataUrl: data.url, fullUrl });

    // Adapt response to match what components expect
    // Components expect: response.success and response.data.url
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
          mime: file.type,
          extension: file.name.split('.').pop() || '',
          url: fullUrl,
        },
        thumb: {
          filename: data.filename,
          name: data.filename,
          mime: file.type,
          extension: file.name.split('.').pop() || '',
          url: fullUrl,
        },
        delete_url: ""
      }
    } as UploadResponse;
  }

  /**
   * Upload an image from base64 string
   * @param base64 - Base64 encoded image data
   */
  async uploadBase64(base64: string, name?: string): Promise<UploadResponse> {
    // Convert base64 to blob/file
    const res = await fetch(base64);
    const blob = await res.blob();
    const file = new File([blob], name || "image.png", { type: blob.type });
    return this.uploadFile(file, name);
  }

  /**
   * Upload an image from URL
   * @param imageUrl - URL of the image to upload
   */
  async uploadFromUrl(imageUrl: string, name?: string): Promise<UploadResponse> {
    // If it's already a backend URL, just return it
    if (imageUrl.includes(API_BASE.replace('/api', ''))) {
      return {
        success: true,
        status: 200,
        data: {
          url: imageUrl,
          display_url: imageUrl,
        }
      } as any;
    }

    // Otherwise try to fetch and upload (might fail due to CORS)
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

  /**
   * Convert File to base64 string
   * ... (rest of methods)
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Validate if file is a valid image
   */
  isValidImage(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    const maxSize = 32 * 1024 * 1024; // 32MB

    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  /**
   * Get file size in human readable format
   */
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
