interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  resource_type: string;
}

const CLOUDINARY_CLOUD_NAME = 'dkzklcr1a';
const CLOUDINARY_UPLOAD_PRESET = 'video_upload';

export class CloudinaryService {
  static async uploadAudio(uri: string): Promise<string> {
    try {
      const formData = new FormData();
      
      // Create file object for upload
      const file = {
        uri,
        type: 'audio/m4a',
        name: `hafalan_${Date.now()}.m4a`,
      } as any;

      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('resource_type', 'video'); // Use 'video' for audio files

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data: CloudinaryResponse = await response.json();
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload audio file');
    }
  }

  static async deleteFile(publicId: string): Promise<boolean> {
    try {
      // Note: Deletion requires signed requests in production
      // This is a placeholder for delete functionality
      console.log('Delete file:', publicId);
      return true;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }
}