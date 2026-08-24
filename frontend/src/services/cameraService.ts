/**
 * cameraService.ts
 * Reusable service for native Android camera access via Capacitor.
 * The Android app NEVER depends on ESP32-CAM — this is the phone's own camera.
 */
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface CapturedImage {
  /** Base64-encoded image string with data URI prefix (data:image/jpeg;base64,...) */
  dataUrl: string;
  /** Raw base64 string without prefix — used for Cloudinary upload */
  base64: string;
  format: string;
}

export type CameraError =
  | 'PERMISSION_DENIED'
  | 'CAMERA_UNAVAILABLE'
  | 'USER_CANCELLED'
  | 'INVALID_IMAGE'
  | 'UNKNOWN';

export interface CameraResult {
  success: boolean;
  image?: CapturedImage;
  error?: CameraError;
  errorMessage?: string;
}

/**
 * Check and request camera permission on Android.
 * Returns true if permission is granted.
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    if (!Capacitor.isNativePlatform()) {
      // In browser (dev mode), permissions are not needed
      return true;
    }

    const status = await Camera.checkPermissions();

    if (status.camera === 'granted') {
      return true;
    }

    if (status.camera === 'denied') {
      // Permission was previously denied — user must go to Settings
      return false;
    }

    // Request permission
    const requested = await Camera.requestPermissions({ permissions: ['camera'] });
    return requested.camera === 'granted';
  } catch {
    return false;
  }
};

/**
 * Open the native Android camera, capture a photo, and return it as base64.
 * In browser (dev mode), falls back to file picker.
 */
export const captureImage = async (): Promise<CameraResult> => {
  try {
    // ── Check permission first ────────────────────────────────────────────────
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      return {
        success: false,
        error: 'PERMISSION_DENIED',
        errorMessage:
          'Camera permission is required. Please enable it in your device Settings.',
      };
    }

    // ── Launch native camera ──────────────────────────────────────────────────
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera, // Always uses native camera, NOT gallery
      saveToGallery: false,
      correctOrientation: true,
      presentationStyle: 'fullscreen',
    });

    if (!photo.base64String) {
      return {
        success: false,
        error: 'INVALID_IMAGE',
        errorMessage: 'No image data was returned from the camera.',
      };
    }

    const format = photo.format || 'jpeg';
    const base64 = photo.base64String;
    const dataUrl = `data:image/${format};base64,${base64}`;

    return {
      success: true,
      image: { dataUrl, base64, format },
    };
  } catch (err: any) {
    const message = err?.message || String(err);

    if (message.toLowerCase().includes('cancel') || message.toLowerCase().includes('dismissed')) {
      return { success: false, error: 'USER_CANCELLED', errorMessage: 'Camera was closed.' };
    }

    if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('denied')) {
      return {
        success: false,
        error: 'PERMISSION_DENIED',
        errorMessage: 'Camera permission denied. Enable it in device Settings.',
      };
    }

    if (message.toLowerCase().includes('not available') || message.toLowerCase().includes('unavailable')) {
      return {
        success: false,
        error: 'CAMERA_UNAVAILABLE',
        errorMessage: 'Camera is not available on this device.',
      };
    }

    return {
      success: false,
      error: 'UNKNOWN',
      errorMessage: `Camera error: ${message}`,
    };
  }
};
