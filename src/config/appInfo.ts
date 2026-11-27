import { DistributionChannel } from '../types/update';

export const APP_ID = 'com.mesai.app';
export const APP_VERSION_NAME: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.10';
export const APP_VERSION_CODE: number =
  typeof __APP_VERSION_CODE__ !== 'undefined' ? __APP_VERSION_CODE__ : 10010;
export const DEFAULT_DISTRIBUTION_CHANNEL: DistributionChannel =
  typeof __DISTRIBUTION_CHANNEL__ !== 'undefined' ? __DISTRIBUTION_CHANNEL__ : 'direct';

/**
 * Public release repository (strictly public read-only manifest & APK assets).
 * Private source repository (ipflixxx/mesai_depo) and tokens are NEVER included in client builds.
 */
export const RELEASES_REPO_BASE = 'https://github.com/ipflixxx/mesai_releases';
export const RELEASES_MANIFEST_URL =
  'https://raw.githubusercontent.com/ipflixxx/mesai_releases/main/latest.json';

export const ALLOWED_APK_URL_PREFIXES = [
  'https://github.com/ipflixxx/mesai_releases/',
  'https://objects.githubusercontent.com/',
  'https://release-assets.githubusercontent.com/',
];
