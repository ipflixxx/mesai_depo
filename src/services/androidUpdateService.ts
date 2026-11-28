import {
  ALLOWED_APK_URL_PREFIXES,
  APP_ID,
  APP_VERSION_CODE,
  APP_VERSION_NAME,
  DEFAULT_DISTRIBUTION_CHANNEL,
  RELEASES_MANIFEST_URL,
} from '../config/appInfo';
import { AppLanguage, formatTemplate, getTranslations } from '../i18n';
import { isNativeAndroidPlatform, MesaiUpdater } from '../native/mesaiUpdater';
import {
  AppRuntimeInfo,
  ReleaseManifest,
  UpdateCheckResult,
} from '../types/update';

export async function getAppRuntimeInfo(): Promise<AppRuntimeInfo> {
  const nativeAndroid = isNativeAndroidPlatform();
  if (nativeAndroid) {
    try {
      const info = await MesaiUpdater.getAppInfo();
      return {
        appId: info.appId || APP_ID,
        versionName: info.versionName || APP_VERSION_NAME,
        versionCode: Number(info.versionCode) || APP_VERSION_CODE,
        channel: info.channel === 'play' ? 'play' : 'direct',
        isNativeAndroid: true,
      };
    } catch {
      // Fallback to injected build constants if native plugin call fails
    }
  }

  return {
    appId: APP_ID,
    versionName: APP_VERSION_NAME,
    versionCode: APP_VERSION_CODE,
    channel: DEFAULT_DISTRIBUTION_CHANNEL,
    isNativeAndroid: false,
  };
}

export function compareSemver(remote: string, current: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('.')
      .map((part) => parseInt(part.replace(/[^\d]/g, ''), 10) || 0);
  const a = parse(remote);
  const b = parse(current);
  const len = Math.max(a.length, b.length, 3);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export function isValidSha256(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash.trim());
}

export function isTrustedApkUrl(url: string): boolean {
  return ALLOWED_APK_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export function validateReleaseManifest(
  raw: unknown,
  lang: AppLanguage = 'tr'
): ReleaseManifest {
  const errs = getTranslations(lang).updater.serviceErrors;

  if (!raw || typeof raw !== 'object') {
    throw new Error(errs.invalidManifest);
  }

  const obj = raw as Record<string, unknown>;
  const appId = typeof obj.appId === 'string' ? obj.appId.trim() : '';
  if (appId !== APP_ID) {
    throw new Error(errs.appIdMismatch);
  }

  const versionName = typeof obj.versionName === 'string' ? obj.versionName.trim() : '';
  const versionCode = Number(obj.versionCode);
  if (!versionName || !Number.isInteger(versionCode) || versionCode <= 0) {
    throw new Error(errs.invalidVersion);
  }

  const apkUrl = typeof obj.apkUrl === 'string' ? obj.apkUrl.trim() : '';
  if (!apkUrl || !isTrustedApkUrl(apkUrl)) {
    throw new Error(errs.untrustedUrl);
  }

  const sha256 = typeof obj.sha256 === 'string' ? obj.sha256.trim().toLowerCase() : '';
  if (!isValidSha256(sha256)) {
    throw new Error(errs.invalidSha256);
  }

  let releaseNotes: string[] = [];
  if (Array.isArray(obj.releaseNotes)) {
    releaseNotes = obj.releaseNotes
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  } else if (typeof obj.releaseNotes === 'string' && obj.releaseNotes.trim()) {
    releaseNotes = obj.releaseNotes
      .split('\n')
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
  }

  const minSupportedVersionCode =
    obj.minSupportedVersionCode !== undefined
      ? Number(obj.minSupportedVersionCode)
      : undefined;

  return {
    appId,
    versionName,
    versionCode,
    minSupportedVersionCode:
      minSupportedVersionCode && Number.isFinite(minSupportedVersionCode)
        ? minSupportedVersionCode
        : undefined,
    mandatory: Boolean(obj.mandatory),
    publishedAt: typeof obj.publishedAt === 'string' ? obj.publishedAt : '',
    apkUrl,
    sha256,
    sizeBytes:
      typeof obj.sizeBytes === 'number' && obj.sizeBytes > 0 ? obj.sizeBytes : undefined,
    releaseNotes,
  };
}

export async function checkForAndroidUpdate(
  runtimeInfo?: AppRuntimeInfo,
  lang: AppLanguage = 'tr'
): Promise<UpdateCheckResult> {
  const info = runtimeInfo ?? (await getAppRuntimeInfo());
  const checkedAt = new Date().toISOString();
  const errs = getTranslations(lang).updater.serviceErrors;

  // Google Play distribution uses Google Play In-App Update API only
  if (info.channel === 'play') {
    if (!info.isNativeAndroid) {
      return {
        hasUpdate: false,
        mandatory: false,
        channel: 'play',
        currentVersionName: info.versionName,
        currentVersionCode: info.versionCode,
        manifest: null,
        checkedAt,
      };
    }

    try {
      const playRes = await MesaiUpdater.checkPlayStoreUpdate();
      return {
        hasUpdate: playRes.updateAvailable,
        mandatory: playRes.isImmediate,
        channel: 'play',
        currentVersionName: info.versionName,
        currentVersionCode: info.versionCode,
        manifest: null,
        playStoreAvailableVersionCode: playRes.availableVersionCode,
        checkedAt,
      };
    } catch (err) {
      return {
        hasUpdate: false,
        mandatory: false,
        channel: 'play',
        currentVersionName: info.versionName,
        currentVersionCode: info.versionCode,
        manifest: null,
        checkedAt,
        error: err instanceof Error ? err.message : errs.playCheckFailed,
      };
    }
  }

  // Direct APK distribution checks public latest.json from ipflixxx/mesai_releases
  try {
    const response = await fetch(`${RELEASES_MANIFEST_URL}?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (response.status === 404) {
      return {
        hasUpdate: false,
        mandatory: false,
        channel: 'direct',
        currentVersionName: info.versionName,
        currentVersionCode: info.versionCode,
        manifest: null,
        checkedAt,
        error: errs.noReleaseYet,
      };
    }

    if (!response.ok) {
      throw new Error(formatTemplate(errs.serverHttpError, { status: response.status }));
    }

    const raw = await response.json();
    const manifest = validateReleaseManifest(raw, lang);

    const newerByCode = manifest.versionCode > info.versionCode;
    const newerBySemver =
      manifest.versionCode === info.versionCode &&
      compareSemver(manifest.versionName, info.versionName) > 0;
    const hasUpdate = newerByCode || newerBySemver;

    const mandatory =
      hasUpdate &&
      (manifest.mandatory ||
        (manifest.minSupportedVersionCode !== undefined &&
          info.versionCode < manifest.minSupportedVersionCode));

    return {
      hasUpdate,
      mandatory,
      channel: 'direct',
      currentVersionName: info.versionName,
      currentVersionCode: info.versionCode,
      manifest,
      checkedAt,
    };
  } catch (err) {
    return {
      hasUpdate: false,
      mandatory: false,
      channel: 'direct',
      currentVersionName: info.versionName,
      currentVersionCode: info.versionCode,
      manifest: null,
      checkedAt,
      error: err instanceof Error ? err.message : errs.connectionError,
    };
  }
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}
