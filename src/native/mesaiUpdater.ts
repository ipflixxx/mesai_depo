import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { DistributionChannel, UpdateProgressEvent } from '../types/update';

export interface NativeAppInfo {
  appId: string;
  versionName: string;
  versionCode: number;
  channel: DistributionChannel;
}

export interface PlayStoreUpdateResult {
  updateAvailable: boolean;
  isImmediate: boolean;
  availableVersionCode?: number;
}

export interface ApkInstallResult {
  status: 'installer_launched' | 'permission_required';
}

export interface MesaiUpdaterPlugin {
  getAppInfo(): Promise<NativeAppInfo>;
  checkPlayStoreUpdate(): Promise<PlayStoreUpdateResult>;
  startPlayStoreUpdate(options: { immediate: boolean }): Promise<{ started: boolean }>;
  downloadAndInstallApk(options: {
    url: string;
    sha256: string;
    versionName: string;
  }): Promise<ApkInstallResult>;
  openUnknownSourcesSettings(): Promise<void>;
  exportFile(options: {
    filename: string;
    mimeType: string;
    base64Data: string;
  }): Promise<{ shared: boolean }>;
  setSystemBarAppearance(options: { isDark: boolean }): Promise<void>;
  addListener(
    eventName: 'updateDownloadProgress',
    listenerFunc: (event: UpdateProgressEvent) => void
  ): Promise<PluginListenerHandle>;
}

export const MesaiUpdater = registerPlugin<MesaiUpdaterPlugin>('MesaiUpdater');

export function isNativeAndroidPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}
