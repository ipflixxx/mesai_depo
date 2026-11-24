export type DistributionChannel = 'play' | 'direct';

export interface AppRuntimeInfo {
  appId: string;
  versionName: string;
  versionCode: number;
  channel: DistributionChannel;
  isNativeAndroid: boolean;
}

export interface ReleaseManifest {
  appId: string;
  versionName: string;
  versionCode: number;
  minSupportedVersionCode?: number;
  mandatory: boolean;
  publishedAt: string;
  apkUrl: string;
  sha256: string;
  sizeBytes?: number;
  releaseNotes: string[];
}

export type UpdateDownloadPhase =
  | 'idle'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'permission_required'
  | 'error';

export interface UpdateProgressEvent {
  phase: 'downloading' | 'verifying' | 'installing';
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  mandatory: boolean;
  channel: DistributionChannel;
  currentVersionName: string;
  currentVersionCode: number;
  manifest: ReleaseManifest | null;
  playStoreAvailableVersionCode?: number;
  checkedAt: string;
  error?: string;
}
