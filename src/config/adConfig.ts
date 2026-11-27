export type AdEnvironmentMode = 'test' | 'production';

/**
 * Master test-mode switch. Keep true until live AdMob ads are explicitly approved.
 */
export const ADMOB_IS_TEST_MODE = true;

/**
 * Google Mobile Ads official Android test identifiers.
 */
export const GOOGLE_TEST_ADMOB_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const GOOGLE_TEST_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';

/**
 * Production AdMob identifiers for MESAİ (com.mesai.app).
 * Inactive while ADMOB_IS_TEST_MODE is true.
 */
export const PRODUCTION_ADMOB_APP_ID = 'ca-app-pub-6163614817121854~5113437207';
export const PRODUCTION_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-6163614817121854/2682714980';

export const ADMOB_PROFILES = {
  test: {
    appId: GOOGLE_TEST_ADMOB_APP_ID,
    interstitialAdUnitId: GOOGLE_TEST_INTERSTITIAL_AD_UNIT_ID,
  },
  production: {
    appId: PRODUCTION_ADMOB_APP_ID,
    interstitialAdUnitId: PRODUCTION_INTERSTITIAL_AD_UNIT_ID,
  },
} as const;

export const INTERSTITIAL_AD_FREQUENCY = 2;
export const AD_COUNTER_STORAGE_KEY = 'mesai_ad_state_v1';

export interface AdMobConfig {
  requestedMode: AdEnvironmentMode;
  effectiveMode: AdEnvironmentMode;
  isTestMode: boolean;
  isProductionConfigured: boolean;
  adsEnabled: boolean;
  appId: string;
  interstitialAdUnitId: string;
  productionAppId: string;
  productionInterstitialAdUnitId: string;
  interstitialFrequency: number;
}

const ADMOB_APP_ID_REGEX = /^ca-app-pub-\d{10,20}~\d{6,16}$/;
const ADMOB_UNIT_ID_REGEX = /^ca-app-pub-\d{10,20}\/\d{6,16}$/;
const GOOGLE_TEST_PUBLISHER_PREFIX = 'ca-app-pub-3940256099942544';

function readEnv(): Record<string, string | undefined> {
  try {
    return ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ??
      {}) as Record<string, string | undefined>;
  } catch {
    return {};
  }
}

export function isValidProductionAdMobAppId(value: string): boolean {
  const trimmed = value.trim();
  return (
    ADMOB_APP_ID_REGEX.test(trimmed) && !trimmed.startsWith(GOOGLE_TEST_PUBLISHER_PREFIX)
  );
}

export function isValidProductionAdUnitId(value: string): boolean {
  const trimmed = value.trim();
  return (
    ADMOB_UNIT_ID_REGEX.test(trimmed) && !trimmed.startsWith(GOOGLE_TEST_PUBLISHER_PREFIX)
  );
}

export function resolveAdMobConfig(
  envOverride?: Record<string, string | undefined>,
  forceTestMode: boolean = ADMOB_IS_TEST_MODE
): AdMobConfig {
  const env = envOverride ?? readEnv();
  const envAppId = String(env.VITE_ADMOB_APP_ID || '').trim() || ADMOB_PROFILES.production.appId;
  const envInterstitialId =
    String(env.VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID || '').trim() ||
    ADMOB_PROFILES.production.interstitialAdUnitId;

  const isProductionConfigured =
    isValidProductionAdMobAppId(envAppId) && isValidProductionAdUnitId(envInterstitialId);

  const requestedMode: AdEnvironmentMode =
    !forceTestMode && String(env.VITE_ADMOB_ENV || '').trim().toLowerCase() === 'production'
      ? 'production'
      : 'test';

  if (forceTestMode || requestedMode === 'test') {
    return {
      requestedMode,
      effectiveMode: 'test',
      isTestMode: true,
      isProductionConfigured,
      adsEnabled: true,
      appId: ADMOB_PROFILES.test.appId,
      interstitialAdUnitId: ADMOB_PROFILES.test.interstitialAdUnitId,
      productionAppId: isProductionConfigured ? envAppId : '',
      productionInterstitialAdUnitId: isProductionConfigured ? envInterstitialId : '',
      interstitialFrequency: INTERSTITIAL_AD_FREQUENCY,
    };
  }

  if (isProductionConfigured) {
    return {
      requestedMode: 'production',
      effectiveMode: 'production',
      isTestMode: false,
      isProductionConfigured: true,
      adsEnabled: true,
      appId: envAppId,
      interstitialAdUnitId: envInterstitialId,
      productionAppId: envAppId,
      productionInterstitialAdUnitId: envInterstitialId,
      interstitialFrequency: INTERSTITIAL_AD_FREQUENCY,
    };
  }

  return {
    requestedMode: 'production',
    effectiveMode: 'production',
    isTestMode: false,
    isProductionConfigured: false,
    adsEnabled: false,
    appId: '',
    interstitialAdUnitId: '',
    productionAppId: '',
    productionInterstitialAdUnitId: '',
    interstitialFrequency: INTERSTITIAL_AD_FREQUENCY,
  };
}
