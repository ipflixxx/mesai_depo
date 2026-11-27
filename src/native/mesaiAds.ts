import { registerPlugin } from '@capacitor/core';
import { isNativeAndroidPlatform } from './mesaiUpdater';

export interface NativeAdConfigStatus {
  environment: 'test' | 'production';
  isTestMode: boolean;
  interstitialAdUnitId: string;
  isInitialized: boolean;
  isAdReady: boolean;
  isLoading: boolean;
  isShowing: boolean;
}

export interface NativeAdInitResult {
  initialized: boolean;
  isTestMode?: boolean;
  environment?: 'test' | 'production';
  error?: string;
}

export interface NativeAdLoadResult {
  loaded: boolean;
  alreadyLoaded?: boolean;
  reason?: string;
}

export interface NativeAdShowResult {
  shown: boolean;
  reason?: string;
}

export interface MesaiAdsPlugin {
  getAdConfig(): Promise<NativeAdConfigStatus>;
  initialize(options: { adUnitId?: string }): Promise<NativeAdInitResult>;
  preloadInterstitial(): Promise<NativeAdLoadResult>;
  showInterstitial(): Promise<NativeAdShowResult>;
}

export const MesaiAds = registerPlugin<MesaiAdsPlugin>('MesaiAds');

export async function getNativeAdConfig(): Promise<NativeAdConfigStatus | null> {
  if (!isNativeAndroidPlatform()) return null;
  try {
    return await MesaiAds.getAdConfig();
  } catch {
    return null;
  }
}

export async function initializeNativeAds(adUnitId?: string): Promise<NativeAdInitResult> {
  if (!isNativeAndroidPlatform()) {
    return { initialized: false };
  }
  try {
    return await MesaiAds.initialize(adUnitId ? { adUnitId } : {});
  } catch (err) {
    return {
      initialized: false,
      error: err instanceof Error ? err.message : 'AdMob initialization failed',
    };
  }
}

export async function preloadNativeInterstitial(): Promise<NativeAdLoadResult> {
  if (!isNativeAndroidPlatform()) {
    return { loaded: false, reason: 'not_native_android' };
  }
  try {
    return await MesaiAds.preloadInterstitial();
  } catch (err) {
    return {
      loaded: false,
      reason: err instanceof Error ? err.message : 'preload_failed',
    };
  }
}

export async function showNativeInterstitial(): Promise<NativeAdShowResult> {
  if (!isNativeAndroidPlatform()) {
    return { shown: false, reason: 'not_native_android' };
  }
  try {
    return await MesaiAds.showInterstitial();
  } catch (err) {
    return {
      shown: false,
      reason: err instanceof Error ? err.message : 'show_failed',
    };
  }
}
