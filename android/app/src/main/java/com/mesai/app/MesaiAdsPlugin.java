package com.mesai.app;

import android.app.Activity;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "MesaiAds")
public class MesaiAdsPlugin extends Plugin {
    private static final String TEST_INTERSTITIAL_PREFIX = "ca-app-pub-3940256099942544/";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final List<PluginCall> pendingInitCalls = new ArrayList<>();

    private boolean isInitialized = false;
    private boolean isInitializing = false;
    private boolean isLoading = false;
    private boolean isShowing = false;
    private boolean isInForeground = false;

    private InterstitialAd loadedInterstitial = null;
    private PluginCall pendingShowCall = null;
    private String activeAdUnitId = BuildConfig.ADMOB_INTERSTITIAL_AD_UNIT_ID;

    @Override
    public void load() {
        super.load();
        mainHandler.post(() -> isInForeground = true);
    }

    @Override
    protected void handleOnStart() {
        super.handleOnStart();
        mainHandler.post(() -> isInForeground = true);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        mainHandler.post(() -> {
            isInForeground = true;
            if (isInitialized && loadedInterstitial == null && !isLoading && !isShowing) {
                loadInterstitialInternal(null);
            }
        });
    }

    @Override
    protected void handleOnPause() {
        mainHandler.post(() -> isInForeground = false);
        super.handleOnPause();
    }

    @Override
    protected void handleOnStop() {
        mainHandler.post(() -> isInForeground = false);
        super.handleOnStop();
    }

    @Override
    protected void handleOnDestroy() {
        mainHandler.post(() -> {
            isInForeground = false;
            isLoading = false;
            isShowing = false;

            if (loadedInterstitial != null) {
                loadedInterstitial.setFullScreenContentCallback(null);
                loadedInterstitial = null;
            }

            if (pendingShowCall != null) {
                JSObject res = new JSObject();
                res.put("shown", false);
                res.put("reason", "activity_destroyed");
                pendingShowCall.resolve(res);
                pendingShowCall = null;
            }

            if (!pendingInitCalls.isEmpty()) {
                JSObject initRes = new JSObject();
                initRes.put("initialized", isInitialized);
                initRes.put("environment", BuildConfig.ADMOB_ENV);
                initRes.put("isTestMode", BuildConfig.ADMOB_IS_TEST_MODE);
                for (PluginCall pending : pendingInitCalls) {
                    pending.resolve(initRes);
                }
                pendingInitCalls.clear();
            }
        });
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getAdConfig(PluginCall call) {
        mainHandler.post(() -> call.resolve(buildStatusPayload()));
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        final String requestedAdUnitId = call.getString("adUnitId");

        mainHandler.post(() -> {
            Context appContext = getContext() != null ? getContext().getApplicationContext() : null;
            if (appContext == null) {
                JSObject err = new JSObject();
                err.put("initialized", false);
                err.put("error", "context_unavailable");
                call.resolve(err);
                return;
            }

            activeAdUnitId = resolveSafeAdUnitId(requestedAdUnitId);

            if (isInitialized) {
                JSObject ret = new JSObject();
                ret.put("initialized", true);
                ret.put("environment", BuildConfig.ADMOB_ENV);
                ret.put("isTestMode", BuildConfig.ADMOB_IS_TEST_MODE);
                call.resolve(ret);
                if (loadedInterstitial == null && !isLoading && !isShowing) {
                    loadInterstitialInternal(null);
                }
                return;
            }

            pendingInitCalls.add(call);
            if (isInitializing) {
                return;
            }

            isInitializing = true;
            try {
                MobileAds.initialize(appContext, initializationStatus ->
                    mainHandler.post(() -> {
                        isInitializing = false;
                        isInitialized = true;

                        JSObject ret = new JSObject();
                        ret.put("initialized", true);
                        ret.put("environment", BuildConfig.ADMOB_ENV);
                        ret.put("isTestMode", BuildConfig.ADMOB_IS_TEST_MODE);

                        for (PluginCall pending : pendingInitCalls) {
                            pending.resolve(ret);
                        }
                        pendingInitCalls.clear();

                        if (loadedInterstitial == null && !isLoading && !isShowing) {
                            loadInterstitialInternal(null);
                        }
                    })
                );
            } catch (Exception e) {
                isInitializing = false;
                isInitialized = false;
                JSObject err = new JSObject();
                err.put("initialized", false);
                err.put("environment", BuildConfig.ADMOB_ENV);
                err.put("isTestMode", BuildConfig.ADMOB_IS_TEST_MODE);
                err.put("error", e.getMessage() != null ? e.getMessage() : "sdk_init_failed");
                for (PluginCall pending : pendingInitCalls) {
                    pending.resolve(err);
                }
                pendingInitCalls.clear();
            }
        });
    }

    @PluginMethod
    public void preloadInterstitial(PluginCall call) {
        mainHandler.post(() -> {
            if (!isInitialized) {
                JSObject ret = new JSObject();
                ret.put("loaded", false);
                ret.put("reason", "sdk_not_initialized");
                call.resolve(ret);
                return;
            }

            if (loadedInterstitial != null) {
                JSObject ret = new JSObject();
                ret.put("loaded", true);
                ret.put("alreadyLoaded", true);
                call.resolve(ret);
                return;
            }

            loadInterstitialInternal(call);
        });
    }

    @PluginMethod
    public void showInterstitial(PluginCall call) {
        mainHandler.post(() -> {
            if (isShowing || pendingShowCall != null) {
                JSObject ret = new JSObject();
                ret.put("shown", false);
                ret.put("reason", "already_showing");
                call.resolve(ret);
                return;
            }

            Activity activity = getActivity();
            if (!isInForeground || activity == null || activity.isFinishing() || activity.isDestroyed()) {
                JSObject ret = new JSObject();
                ret.put("shown", false);
                ret.put("reason", "activity_not_foreground");
                call.resolve(ret);
                return;
            }

            if (!isInitialized) {
                JSObject ret = new JSObject();
                ret.put("shown", false);
                ret.put("reason", "sdk_not_initialized");
                call.resolve(ret);
                return;
            }

            if (loadedInterstitial == null) {
                if (!isLoading) {
                    loadInterstitialInternal(null);
                }
                JSObject ret = new JSObject();
                ret.put("shown", false);
                ret.put("reason", "ad_not_ready");
                call.resolve(ret);
                return;
            }

            final InterstitialAd adToShow = loadedInterstitial;
            loadedInterstitial = null;
            isShowing = true;
            pendingShowCall = call;

            adToShow.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdShowedFullScreenContent() {
                    mainHandler.post(() -> isShowing = true);
                }

                @Override
                public void onAdDismissedFullScreenContent() {
                    mainHandler.post(() -> {
                        isShowing = false;
                        adToShow.setFullScreenContentCallback(null);
                        if (pendingShowCall != null) {
                            JSObject ret = new JSObject();
                            ret.put("shown", true);
                            pendingShowCall.resolve(ret);
                            pendingShowCall = null;
                        }
                        if (isInForeground) {
                            loadInterstitialInternal(null);
                        }
                    });
                }

                @Override
                public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                    mainHandler.post(() -> {
                        isShowing = false;
                        adToShow.setFullScreenContentCallback(null);
                        if (pendingShowCall != null) {
                            JSObject ret = new JSObject();
                            ret.put("shown", false);
                            ret.put("reason", adError.getMessage());
                            pendingShowCall.resolve(ret);
                            pendingShowCall = null;
                        }
                        if (isInForeground) {
                            loadInterstitialInternal(null);
                        }
                    });
                }
            });

            try {
                adToShow.show(activity);
            } catch (Exception e) {
                isShowing = false;
                adToShow.setFullScreenContentCallback(null);
                if (pendingShowCall != null) {
                    JSObject ret = new JSObject();
                    ret.put("shown", false);
                    ret.put("reason", e.getMessage() != null ? e.getMessage() : "show_exception");
                    pendingShowCall.resolve(ret);
                    pendingShowCall = null;
                }
            }
        });
    }

    private void loadInterstitialInternal(PluginCall optionalCall) {
        if (!isInitialized) {
            if (optionalCall != null) {
                JSObject ret = new JSObject();
                ret.put("loaded", false);
                ret.put("reason", "sdk_not_initialized");
                optionalCall.resolve(ret);
            }
            return;
        }

        if (loadedInterstitial != null || isLoading || isShowing) {
            if (optionalCall != null) {
                JSObject ret = new JSObject();
                ret.put("loaded", loadedInterstitial != null);
                ret.put("reason", isLoading ? "already_loading" : "already_ready_or_showing");
                optionalCall.resolve(ret);
            }
            return;
        }

        Context appContext = getContext() != null ? getContext().getApplicationContext() : null;
        if (appContext == null || activeAdUnitId == null || activeAdUnitId.trim().isEmpty()) {
            if (optionalCall != null) {
                JSObject ret = new JSObject();
                ret.put("loaded", false);
                ret.put("reason", "missing_context_or_unit_id");
                optionalCall.resolve(ret);
            }
            return;
        }

        isLoading = true;
        try {
            AdRequest adRequest = new AdRequest.Builder().build();
            InterstitialAd.load(
                appContext,
                activeAdUnitId,
                adRequest,
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(@NonNull InterstitialAd interstitialAd) {
                        mainHandler.post(() -> {
                            isLoading = false;
                            loadedInterstitial = interstitialAd;
                            if (optionalCall != null) {
                                JSObject ret = new JSObject();
                                ret.put("loaded", true);
                                optionalCall.resolve(ret);
                            }
                        });
                    }

                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                        mainHandler.post(() -> {
                            isLoading = false;
                            loadedInterstitial = null;
                            if (optionalCall != null) {
                                JSObject ret = new JSObject();
                                ret.put("loaded", false);
                                ret.put("reason", loadAdError.getMessage());
                                optionalCall.resolve(ret);
                            }
                        });
                    }
                }
            );
        } catch (Exception e) {
            isLoading = false;
            loadedInterstitial = null;
            if (optionalCall != null) {
                JSObject ret = new JSObject();
                ret.put("loaded", false);
                ret.put("reason", e.getMessage() != null ? e.getMessage() : "load_exception");
                optionalCall.resolve(ret);
            }
        }
    }

    private String resolveSafeAdUnitId(String requestedAdUnitId) {
        if (BuildConfig.ADMOB_IS_TEST_MODE) {
            return BuildConfig.ADMOB_INTERSTITIAL_AD_UNIT_ID;
        }
        if (requestedAdUnitId != null) {
            String trimmed = requestedAdUnitId.trim();
            if (trimmed.startsWith("ca-app-pub-") && !trimmed.startsWith(TEST_INTERSTITIAL_PREFIX)) {
                return trimmed;
            }
        }
        return BuildConfig.ADMOB_INTERSTITIAL_AD_UNIT_ID;
    }

    private JSObject buildStatusPayload() {
        JSObject ret = new JSObject();
        ret.put("environment", BuildConfig.ADMOB_ENV);
        ret.put("isTestMode", BuildConfig.ADMOB_IS_TEST_MODE);
        ret.put("interstitialAdUnitId", activeAdUnitId);
        ret.put("isInitialized", isInitialized);
        ret.put("isAdReady", loadedInterstitial != null);
        ret.put("isLoading", isLoading);
        ret.put("isShowing", isShowing);
        return ret;
    }
}
