import {
  AD_COUNTER_STORAGE_KEY,
  INTERSTITIAL_AD_FREQUENCY,
  resolveAdMobConfig,
} from '../config/adConfig';
import {
  initializeNativeAds,
  preloadNativeInterstitial,
  showNativeInterstitial,
} from '../native/mesaiAds';
import { isNativeAndroidPlatform } from '../native/mesaiUpdater';

export interface PersistentAdState {
  successfulSaveCount: number;
}

export interface WorkEntryAdOutcome {
  saveCount: number;
  shouldShow: boolean;
  shown: boolean;
  reason?: string;
}

let hasInitializedSdk = false;
let initPromise: Promise<boolean> | null = null;
let isShowInFlight = false;

function readPersistentAdState(): PersistentAdState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { successfulSaveCount: 0 };
  }
  try {
    const raw = window.localStorage.getItem(AD_COUNTER_STORAGE_KEY);
    if (!raw) return { successfulSaveCount: 0 };
    const parsed = JSON.parse(raw) as Partial<PersistentAdState>;
    const count = Number(parsed?.successfulSaveCount);
    if (Number.isInteger(count) && count >= 0) {
      return { successfulSaveCount: count };
    }
    return { successfulSaveCount: 0 };
  } catch {
    return { successfulSaveCount: 0 };
  }
}

function writePersistentAdState(state: PersistentAdState): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(AD_COUNTER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors so saving work entries never fails
  }
}

export function getSuccessfulSaveCount(): number {
  return readPersistentAdState().successfulSaveCount;
}

export function incrementSuccessfulSaveCount(): number {
  const nextCount = getSuccessfulSaveCount() + 1;
  writePersistentAdState({ successfulSaveCount: nextCount });
  return nextCount;
}

export function shouldShowInterstitialForCount(
  saveCount: number,
  frequency: number = INTERSTITIAL_AD_FREQUENCY
): boolean {
  return Number.isInteger(saveCount) && saveCount > 0 && saveCount % frequency === 0;
}

export async function initAdsIfNeeded(): Promise<boolean> {
  if (!isNativeAndroidPlatform()) return false;

  const config = resolveAdMobConfig();
  if (!config.adsEnabled) return false;

  if (hasInitializedSdk) {
    return true;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = initializeNativeAds(config.interstitialAdUnitId)
    .then((res) => {
      hasInitializedSdk = Boolean(res.initialized);
      return hasInitializedSdk;
    })
    .catch(() => false)
    .finally(() => {
      initPromise = null;
    });

  return initPromise;
}

export async function recordSuccessfulWorkEntrySave(): Promise<WorkEntryAdOutcome> {
  const saveCount = incrementSuccessfulSaveCount();
  const config = resolveAdMobConfig();
  const shouldShow = shouldShowInterstitialForCount(saveCount, config.interstitialFrequency);

  if (!shouldShow) {
    // Quietly keep SDK initialized and preloaded for the next milestone save
    if (isNativeAndroidPlatform() && config.adsEnabled) {
      void initAdsIfNeeded().then((ok) => {
        if (ok) {
          void preloadNativeInterstitial();
        }
      });
    }
    return { saveCount, shouldShow: false, shown: false };
  }

  if (!isNativeAndroidPlatform()) {
    return { saveCount, shouldShow: true, shown: false, reason: 'not_native_android' };
  }

  if (!config.adsEnabled) {
    return { saveCount, shouldShow: true, shown: false, reason: 'ads_disabled_missing_prod_ids' };
  }

  if (isShowInFlight) {
    return { saveCount, shouldShow: true, shown: false, reason: 'already_showing' };
  }

  isShowInFlight = true;
  try {
    const initialized = await initAdsIfNeeded();
    if (!initialized) {
      return { saveCount, shouldShow: true, shown: false, reason: 'sdk_not_initialized' };
    }
    const result = await showNativeInterstitial();
    return {
      saveCount,
      shouldShow: true,
      shown: result.shown,
      reason: result.reason,
    };
  } catch {
    return { saveCount, shouldShow: true, shown: false, reason: 'unexpected_error' };
  } finally {
    isShowInFlight = false;
  }
}

export const adService = {
  getSuccessfulSaveCount,
  incrementSuccessfulSaveCount,
  shouldShowInterstitialForCount,
  initAdsIfNeeded,
  recordSuccessfulWorkEntrySave,
};
