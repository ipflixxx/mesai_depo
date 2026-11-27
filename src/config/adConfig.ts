export type AdEnvironmentMode = 'test' | 'production';

/**
 * Google Mobile Ads official Android test identifiers.
 * Used exclusively during development/test builds when real AdMob IDs are not configured.
 */
export const GOOGLE_TEST_ADMOB_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const GOOGLE_TEST_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';

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
  envOverride?: Record<string, string | undefined>
): AdMobConfig {
  const env = envOverride ?? readEnv();
  const requestedMode: AdEnvironmentMode =
    String(env.VITE_ADMOB_ENV || '').trim().toLowerCase() === 'production'
      ? 'production'
      : 'test';

  const envAppId = String(env.VITE_ADMOB_APP_ID || '').trim();
  const envInterstitialId = String(env.VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID || '').trim();
  const isProductionConfigured =
    isValidProductionAdMobAppId(envAppId) && isValidProductionAdUnitId(envInterstitialId);

  if (requestedMode === 'production') {
    if (isProductionConfigured) {
      return {
        requestedMode,
        effectiveMode: 'production',
        isTestMode: false,
        isProductionConfigured: true,
        adsEnabled: true,
        appId: envAppId,
        interstitialAdUnitId: envInterstitialId,
        interstitialFrequency: INTERSTITIAL_AD_FREQUENCY,
      };
    }

    // Never fabricate or fall back to live ads if production IDs are missing/invalid.
    return {
      requestedMode,
      effectiveMode: 'production',
      isTestMode: false,
      isProductionConfigured: false,
      adsEnabled: false,
      appId: '',
      interstitialAdUnitId: '',
      interstitialFrequency: INTERSTITIAL_AD_FREQUENCY,
    };
  }

  return {
    requestedMode: 'test',
    effectiveMode: 'test',
    isTestMode: true,
    isProductionConfigured: false,
    adsEnabled: true,
    appId: GOOGLE_TEST_ADMOB_APP_ID,
    interstitialAdUnitId: GOOGLE_TEST_INTERSTITIAL_AD_UNIT_ID,
    interstitialFrequency: INTERSTITIAL_AD_FREQUENCY,
  };
}
