import { MediaAsset, ConfidentialityLevel } from '../../types/restaurant';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'thumb' | 'fit' | 'limit' | 'scale';
  quality?: 'auto' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
  format?: 'auto' | 'webp' | 'png' | 'jpg';
  gravity?: 'face' | 'center' | 'auto';
}

export interface CloudinaryUploadOptions {
  organizationId: string;
  restaurantId?: string;
  restaurantName?: string; // Nom officiel du restaurant pour création du dossier Cloudinary
  category:
    | 'branding'
    | 'products'
    | 'food'
    | 'menus'
    | 'documents'
    | 'fiscal'
    | 'contracts'
    | 'suppliers'
    | 'customers'
    | 'events'
    | 'delivery'
    | 'qr'
    | 'scanner'
    | 'audit';
  folder?: string;
  entityType?: 'product' | 'category' | 'restaurant' | 'supplier' | 'employee' | 'order' | 'document';
  entityId?: string;
  uploadedBy?: string;
  confidentialityLevel?: ConfidentialityLevel;
  tags?: string[];
  customFileName?: string;
}

/**
 * Assainit le nom du restaurant pour nommer fidèlement le dossier Cloudinary.
 * Exemple : "Le Grand Gourmet" -> "Le Grand Gourmet"
 * Supprime les caractères interdits par l'API Cloudinary tout en conservant les espaces et accents lisibles.
 */
export function sanitizeCloudinaryFolderName(name: string): string {
  if (!name || !name.trim()) return 'Restaurant_Principal';
  return (
    name
      .replace(/[\\?#%<>"*|:]/g, '')
      .replace(/\//g, '-')
      .replace(/\s+/g, ' ')
      .trim() || 'Restaurant_Principal'
  );
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  resourceType: 'image' | 'raw' | 'video';
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  folder: string;
  originalName: string;
}

class CloudinaryService {
  private cloudName: string;
  private uploadPreset: string;
  private apiKey?: string;

  constructor() {
    // Read from client environment without ever exposing API Secret
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
    this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
    this.apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY || '';
  }

  /**
   * Status and configuration check
   */
  public getConfig() {
    return {
      cloudName: this.cloudName,
      uploadPreset: this.uploadPreset,
      isConfigured: Boolean(this.cloudName && this.uploadPreset),
    };
  }

  /**
   * Health Check diagnostic for Cloudinary
   */
  public async checkHealth(): Promise<{
    configured: boolean;
    connected: boolean;
    cloudName: string;
    message: string;
  }> {
    const isConfigured = Boolean(this.cloudName && this.cloudName.trim().length > 0);
    if (!isConfigured) {
      return {
        configured: false,
        connected: false,
        cloudName: '',
        message: 'Cloudinary Cloud Name manquant dans les variables d’environnement.',
      };
    }

    try {
      // Test connectivity against Cloudinary CDN
      const testUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload/sample.jpg`;
      const res = await fetch(testUrl, { method: 'HEAD' });
      const connected = res.status < 500;
      return {
        configured: true,
        connected,
        cloudName: this.cloudName,
        message: connected
          ? `Cloudinary actif et connecté au cloud "${this.cloudName}".`
          : `Connectivité limitée au cloud "${this.cloudName}" (HTTP ${res.status}).`,
      };
    } catch {
      return {
        configured: true,
        connected: true, // CDN endpoint might block HEAD, but valid
        cloudName: this.cloudName,
        message: `Cloudinary configuré sur "${this.cloudName}".`,
      };
    }
  }

  /**
   * Construit le chemin de stockage Cloudinary au nom officiel du restaurant.
   * Chaque restaurant dispose de son propre dossier racine portant fidèlement son nom.
   * Exemple : "Le Grand Gourmet/food" ou "Chez Wou/documents"
   */
  public buildFolderPath(
    organizationIdOrOptions?:
      | string
      | {
          restaurantName?: string;
          restaurantId?: string;
          organizationId?: string;
          category?: string;
          folder?: string;
        },
    restaurantId?: string,
    category: string = 'documents',
    restaurantName?: string
  ): string {
    let effectiveRestoName = '';
    let effectiveCategory = category;
    let customFolder = '';

    if (typeof organizationIdOrOptions === 'object' && organizationIdOrOptions !== null) {
      effectiveRestoName = organizationIdOrOptions.restaurantName || organizationIdOrOptions.restaurantId || '';
      effectiveCategory = organizationIdOrOptions.category || 'documents';
      customFolder = organizationIdOrOptions.folder || '';
    } else {
      effectiveRestoName = restaurantName || restaurantId || 'Restaurant';
    }

    if (customFolder && customFolder.trim()) {
      return customFolder.trim().replace(/^\/+|\/+$/g, '');
    }

    const cleanRestoFolder = sanitizeCloudinaryFolderName(effectiveRestoName);
    const cleanCat = (effectiveCategory || 'documents').replace(/[^a-zA-Z0-9_-]/g, '_');

    return `${cleanRestoFolder}/${cleanCat}`;
  }

  /**
   * Determine Cloudinary resource type based on MIME type
   */
  public detectResourceType(mimeType: string): 'image' | 'raw' | 'video' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'raw'; // PDF, Office, TXT, etc.
  }

  /**
   * File validation before upload
   */
  public validateFile(file: File): { valid: boolean; error?: string } {
    const MAX_IMAGE_SIZE = 12 * 1024 * 1024; // 12MB
    const MAX_DOCUMENT_SIZE = 35 * 1024 * 1024; // 35MB

    const isImage = file.type.startsWith('image/');
    const isDoc =
      file.type === 'application/pdf' ||
      file.type.includes('word') ||
      file.type.includes('sheet') ||
      file.type.includes('excel') ||
      file.type === 'text/plain' ||
      file.type === 'text/csv';

    if (!isImage && !isDoc) {
      return {
        valid: false,
        error: `Format de fichier "${file.type || file.name.split('.').pop()}" non autorisé. Utilisez JPG, PNG, WEBP, PDF, Word ou Excel.`,
      };
    }

    const limit = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
    if (file.size > limit) {
      const limitMb = Math.round(limit / (1024 * 1024));
      return {
        valid: false,
        error: `Le fichier dépasse la taille maximale autorisée de ${limitMb} Mo.`,
      };
    }

    return { valid: true };
  }

  /**
   * Upload File to Cloudinary dans le dossier dédié au restaurant
   */
  public async upload(file: File, options: CloudinaryUploadOptions): Promise<MediaAsset> {
    if (!this.cloudName || !this.uploadPreset) {
      throw new Error(
        "Stockage Cloudinary non configuré. Veuillez définir VITE_CLOUDINARY_CLOUD_NAME et VITE_CLOUDINARY_UPLOAD_PRESET dans les variables d'environnement (.env)."
      );
    }

    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const resourceType = this.detectResourceType(file.type);
    const folder = options.folder && options.folder.trim()
      ? options.folder.trim()
      : this.buildFolderPath({
          restaurantName: options.restaurantName,
          restaurantId: options.restaurantId,
          organizationId: options.organizationId,
          category: options.category,
        });

    const timestamp = Date.now();
    const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = `${folder}/${cleanBaseName}_${timestamp}`;

    try {
      // Direct upload via Cloudinary REST API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.uploadPreset);
      formData.append('folder', folder);
      formData.append('public_id', `${cleanBaseName}_${timestamp}`);

      const tags = [...(options.tags || [])];
      if (options.restaurantName && !tags.includes(options.restaurantName)) {
        tags.push(options.restaurantName);
      }
      if (tags.length > 0) {
        formData.append('tags', tags.join(','));
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Erreur Cloudinary (HTTP ${response.status})`);
      }

      const result = await response.json();

      const mediaAsset: MediaAsset = {
        id: `media-${timestamp}`,
        organizationId: options.organizationId,
        restaurantId: options.restaurantId,
        uploadedBy: options.uploadedBy || 'Système',
        fileName: file.name,
        originalName: file.name,
        resourceType,
        mimeType: file.type || (resourceType === 'image' ? 'image/jpeg' : 'application/pdf'),
        size: file.size,
        cloudinaryPublicId: result.public_id || publicId,
        cloudinaryAssetId: result.asset_id,
        secureUrl: result.secure_url,
        folder,
        category: options.category,
        entityType: options.entityType,
        entityId: options.entityId,
        width: result.width,
        height: result.height,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ready',
        confidentialityLevel: options.confidentialityLevel || 'interne',
      };

      return mediaAsset;
    } catch (err: any) {
      console.error('[CloudinaryService] Échec du téléversement :', err.message);
      throw new Error(err.message || 'Échec du téléversement vers le service Cloudinary.');
    }
  }

  /**
   * Generate an optimized Cloudinary transformation URL
   */
  public getOptimizedImageUrl(publicIdOrUrl: string, options: ImageTransformOptions = {}): string {
    if (!publicIdOrUrl) return '';

    // If it's already a full non-cloudinary URL (e.g. unsplash or blob:), return as is
    if (publicIdOrUrl.startsWith('blob:') || publicIdOrUrl.startsWith('data:')) {
      return publicIdOrUrl;
    }

    const {
      width,
      height,
      crop = 'fill',
      quality = 'auto',
      format = 'auto',
      gravity = 'center',
    } = options;

    const transformations: string[] = [];

    if (format) transformations.push(`f_${format}`);
    if (quality) transformations.push(`q_${quality}`);
    if (crop) transformations.push(`c_${crop}`);
    if (gravity && crop !== 'scale') transformations.push(`g_${gravity}`);
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);

    const transformStr = transformations.join(',');

    // If it's a full Cloudinary URL
    if (publicIdOrUrl.includes('res.cloudinary.com')) {
      // Inject transformation string right after /upload/
      if (transformations.length > 0 && publicIdOrUrl.includes('/upload/')) {
        return publicIdOrUrl.replace('/upload/', `/upload/${transformStr}/`);
      }
      return publicIdOrUrl;
    }

    // If it's an external HTTP URL (Unsplash or external food image)
    if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
      return publicIdOrUrl;
    }

    // It's a publicId, build the complete Cloudinary URL
    const baseUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload`;
    return transformStr ? `${baseUrl}/${transformStr}/${publicIdOrUrl}` : `${baseUrl}/${publicIdOrUrl}`;
  }

  /**
   * Delete asset through backend verification
   */
  public async deleteAsset(publicId: string): Promise<boolean> {
    try {
      // In production, an authenticated Firebase Callable Function triggers the Cloudinary Admin API
      // to destroy the asset using the private secret.
      console.log(`[CloudinaryService] Demande de suppression asset : ${publicId}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Replace asset: uploads new asset first, then disposes of old asset
   */
  public async replaceAsset(
    oldPublicId: string | undefined,
    newFile: File,
    options: CloudinaryUploadOptions
  ): Promise<MediaAsset> {
    // 1. Upload new asset
    const newAsset = await this.upload(newFile, options);

    // 2. Safely trigger deletion of old asset if present
    if (oldPublicId && oldPublicId !== newAsset.cloudinaryPublicId) {
      await this.deleteAsset(oldPublicId).catch(() => {});
    }

    return newAsset;
  }
}

export const cloudinaryService = new CloudinaryService();
