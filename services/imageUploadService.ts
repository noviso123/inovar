// ImgBB Image Upload Service
// API Key: 8c9e209f4d405c41879dcc76a7bdd1b6

const IMGBB_API_KEY = '8c9e209f4d405c41879dcc76a7bdd1b6';
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

interface ImgBBResponse {
  success: boolean;
  status: number;
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    width: string;
    height: string;
    size: string;
    time: string;
    expiration: string;
    image: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    thumb: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    medium?: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    delete_url: string;
  };
}

class ImageUploadService {
  /**
   * Upload an image file to ImgBB
   * @param file - The file to upload (File object)
   * @param name - Optional custom name for the image
   * @param expiration - Optional expiration in seconds (60-15552000)
   * @returns Promise with the upload response
   */
  async uploadFile(file: File, name?: string, expiration?: number): Promise<ImgBBResponse> {
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', file);

    if (name) {
      formData.append('name', name);
    }

    if (expiration && expiration >= 60 && expiration <= 15552000) {
      formData.append('expiration', String(expiration));
    }

    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ImgBB upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Upload an image from base64 string
   * @param base64 - Base64 encoded image data
   * @param name - Optional custom name for the image
   * @param expiration - Optional expiration in seconds
   * @returns Promise with the upload response
   */
  async uploadBase64(base64: string, name?: string, expiration?: number): Promise<ImgBBResponse> {
    // Remove data URL prefix if present
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', cleanBase64);

    if (name) {
      formData.append('name', name);
    }

    if (expiration && expiration >= 60 && expiration <= 15552000) {
      formData.append('expiration', String(expiration));
    }

    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ImgBB upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Upload an image from URL
   * @param imageUrl - URL of the image to upload
   * @param name - Optional custom name for the image
   * @param expiration - Optional expiration in seconds
   * @returns Promise with the upload response
   */
  async uploadFromUrl(imageUrl: string, name?: string, expiration?: number): Promise<ImgBBResponse> {
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', imageUrl);

    if (name) {
      formData.append('name', name);
    }

    if (expiration && expiration >= 60 && expiration <= 15552000) {
      formData.append('expiration', String(expiration));
    }

    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ImgBB upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Convert File to base64 string
   * @param file - File to convert
   * @returns Promise with base64 string
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
   * @param file - File to validate
   * @returns boolean
   */
  isValidImage(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    const maxSize = 32 * 1024 * 1024; // 32MB

    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  /**
   * Get file size in human readable format
   * @param bytes - File size in bytes
   * @returns Formatted string
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
export type { ImgBBResponse };
