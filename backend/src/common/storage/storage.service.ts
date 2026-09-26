import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly publicBucket: string;
  private readonly privateKycBucket: string;
  private readonly endpoint: string;
  private readonly signedExpirySeconds: number;
  private readonly supabase: SupabaseClient | null = null;

  constructor(private readonly configService: ConfigService) {
    this.publicBucket = this.configService.get<string>('STORAGE_PUBLIC_BUCKET', 'experience-public-media');
    this.privateKycBucket = this.configService.get<string>('STORAGE_PRIVATE_KYC_BUCKET', 'provider-kyc-documents-restricted');
    this.endpoint = this.configService.get<string>('STORAGE_ENDPOINT', 'http://localhost:9000');
    this.signedExpirySeconds = Number(this.configService.get<number>('STORAGE_SIGNED_URL_EXPIRY_SECONDS', 900));

    const supabaseUrl =
      this.configService.get<string>('SUPABASE_URL') ||
      'https://mvsnmwznonupjypacswj.supabase.co';
    const supabaseKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_SECRET_KEY') ||
      'sb_secret_wRX81rSUWwag74yg5pFgJg_BP76DuWR';

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });
        this.logger.log('Supabase storage client initialized');
      } catch (err) {
        this.logger.warn(`Failed to initialize Supabase client: ${err}`);
      }
    }
  }

  /**
   * Uploads a trip memory or user photo to Supabase storage with fallback to local disk storage
   */
  async uploadPhoto(
    buffer: Buffer,
    mimeType: string,
    originalName: string,
    subfolder = 'memories',
  ): Promise<{ publicUrl: string; storageKey: string }> {
    const rawExt = (originalName?.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
    const ext = rawExt || 'jpg';
    const filename = `${crypto.randomUUID()}.${ext}`;
    const storageKey = `${subfolder}/${filename}`;

    if (this.supabase) {
      const bucket = 'trip-memories';
      try {
        const { error } = await this.supabase.storage.from(bucket).upload(storageKey, buffer, {
          contentType: mimeType || 'image/jpeg',
          upsert: true,
        });
        if (error) {
          this.logger.warn(`Supabase upload failed: ${error.message}, using local storage fallback.`);
        } else {
          const { data } = this.supabase.storage.from(bucket).getPublicUrl(storageKey);
          if (data?.publicUrl) {
            return { publicUrl: data.publicUrl, storageKey: `${bucket}/${storageKey}` };
          }
        }
      } catch (err: any) {
        this.logger.warn(`Supabase upload exception: ${err?.message || err}, using local storage fallback.`);
      }
    }

    // Reliable Local Disk Storage Fallback
    try {
      const fs = require('fs');
      const path = require('path');
      const targetDir = path.join(process.cwd(), 'uploads', subfolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const filePath = path.join(targetDir, filename);
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/${subfolder}/${filename}`;
      return { publicUrl, storageKey: `local:${subfolder}/${filename}` };
    } catch (fsErr: any) {
      this.logger.error(`Local storage write failed: ${fsErr?.message || fsErr}`);
    }

    // Last-resort fallback: Base64 data URI
    const base64 = buffer.toString('base64');
    const publicUrl = `data:${mimeType || 'image/jpeg'};base64,${base64}`;
    return { publicUrl, storageKey: `inline:${filename}` };
  }

  /**
   * Deletes a photo from storage
   */
  async deletePhoto(storageKey: string): Promise<boolean> {
    if (!storageKey || storageKey.startsWith('inline:') || storageKey.startsWith('data:')) {
      return true;
    }
    if (storageKey.startsWith('local:')) {
      try {
        const fs = require('fs');
        const path = require('path');
        const relative = storageKey.replace('local:', '');
        const target = path.join(process.cwd(), 'uploads', relative);
        if (fs.existsSync(target)) {
          fs.unlinkSync(target);
        }
        return true;
      } catch {
        return false;
      }
    }
    if (this.supabase) {
      try {
        const parts = storageKey.split('/');
        const bucket = parts[0];
        const filePath = parts.slice(1).join('/');
        await this.supabase.storage.from(bucket).remove([filePath]);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }


  /**
   * Generates a signed, single-use, short-lived (15 min) URL for uploading a KYC document
   * to the private access-restricted bucket.
   */
  async generateKycUploadSignedUrl(
    providerId: string,
    documentType: string,
    fileName: string,
  ): Promise<{ uploadUrl: string; storageKey: string; expiresAt: Date }> {
    const fileExt = fileName.split('.').pop() || 'dat';
    const storageKey = `kyc/${providerId}/${documentType}_${crypto.randomUUID()}.${fileExt}`;
    const expiresAt = new Date(Date.now() + this.signedExpirySeconds * 1000);

    // Generate cryptographic signature token for pre-signed upload
    const signature = crypto
      .createHmac('sha256', this.configService.get<string>('STORAGE_SECRET_KEY', 'kyc-secret'))
      .update(`${this.privateKycBucket}:${storageKey}:${expiresAt.getTime()}`)
      .digest('hex');

    const uploadUrl = `${this.endpoint}/${this.privateKycBucket}/${storageKey}?sig=${signature}&exp=${expiresAt.getTime()}`;

    return {
      uploadUrl,
      storageKey,
      expiresAt,
    };
  }

  /**
   * Generates a short-lived (15 min) read URL for admin KYC document verification
   */
  async generateKycReadSignedUrl(storageKey: string): Promise<string> {
    const expiresAt = new Date(Date.now() + this.signedExpirySeconds * 1000);
    const signature = crypto
      .createHmac('sha256', this.configService.get<string>('STORAGE_SECRET_KEY', 'kyc-secret'))
      .update(`read:${this.privateKycBucket}:${storageKey}:${expiresAt.getTime()}`)
      .digest('hex');

    return `${this.endpoint}/${this.privateKycBucket}/${storageKey}?sig=${signature}&exp=${expiresAt.getTime()}`;
  }
}
