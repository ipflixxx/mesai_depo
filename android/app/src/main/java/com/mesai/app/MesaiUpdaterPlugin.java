package com.mesai.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "MesaiUpdater")
public class MesaiUpdaterPlugin extends Plugin {
    private static final int PLAY_UPDATE_REQUEST_CODE = 9042;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("appId", BuildConfig.APPLICATION_ID);
        ret.put("versionName", BuildConfig.VERSION_NAME);
        ret.put("versionCode", BuildConfig.VERSION_CODE);
        ret.put("channel", BuildConfig.DISTRIBUTION_CHANNEL);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkPlayStoreUpdate(PluginCall call) {
        if (!"play".equals(BuildConfig.DISTRIBUTION_CHANNEL)) {
            JSObject ret = new JSObject();
            ret.put("updateAvailable", false);
            ret.put("isImmediate", false);
            call.resolve(ret);
            return;
        }

        AppUpdateManager appUpdateManager = AppUpdateManagerFactory.create(getContext());
        appUpdateManager.getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                boolean available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE;
                boolean immediateAllowed = info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE);
                JSObject ret = new JSObject();
                ret.put("updateAvailable", available);
                ret.put("isImmediate", available && immediateAllowed && info.updatePriority() >= 4);
                ret.put("availableVersionCode", info.availableVersionCode());
                call.resolve(ret);
            })
            .addOnFailureListener(err -> call.reject("Play Store update check failed: " + err.getMessage()));
    }

    @PluginMethod
    public void startPlayStoreUpdate(PluginCall call) {
        if (!"play".equals(BuildConfig.DISTRIBUTION_CHANNEL)) {
            call.reject("Play Store updates are only available in the Play distribution channel.");
            return;
        }

        boolean immediate = Boolean.TRUE.equals(call.getBoolean("immediate", false));
        int updateType = immediate ? AppUpdateType.IMMEDIATE : AppUpdateType.FLEXIBLE;
        AppUpdateManager appUpdateManager = AppUpdateManagerFactory.create(getContext());

        appUpdateManager.getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                        && info.isUpdateTypeAllowed(updateType)
                        && getActivity() != null) {
                    try {
                        appUpdateManager.startUpdateFlowForResult(
                            info,
                            getActivity(),
                            AppUpdateOptions.newBuilder(updateType).build(),
                            PLAY_UPDATE_REQUEST_CODE
                        );
                        JSObject ret = new JSObject();
                        ret.put("started", true);
                        call.resolve(ret);
                    } catch (Exception e) {
                        call.reject("Failed to start Play update flow: " + e.getMessage());
                    }
                } else {
                    JSObject ret = new JSObject();
                    ret.put("started", false);
                    call.resolve(ret);
                }
            })
            .addOnFailureListener(err -> call.reject("Play Store update failed: " + err.getMessage()));
    }

    @PluginMethod
    public void openUnknownSourcesSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstallApk(PluginCall call) {
        if ("play".equals(BuildConfig.DISTRIBUTION_CHANNEL)) {
            call.reject("External APK installation is disabled in Google Play builds.");
            return;
        }

        String apkUrl = call.getString("url");
        String expectedSha256 = call.getString("sha256");
        String versionName = call.getString("versionName", "latest");

        if (apkUrl == null || !isTrustedHttpsUrl(apkUrl)) {
            call.reject("Untrusted APK URL.");
            return;
        }

        if (expectedSha256 == null || !expectedSha256.trim().matches("^[a-fA-F0-9]{64}$")) {
            call.reject("Invalid expected SHA-256 checksum.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            JSObject ret = new JSObject();
            ret.put("status", "permission_required");
            call.resolve(ret);
            return;
        }

        final String normalizedExpectedSha = expectedSha256.trim().toLowerCase(Locale.US);

        executor.execute(() -> {
            File updatesDir = new File(getContext().getCacheDir(), "updates");
            if (!updatesDir.exists() && !updatesDir.mkdirs()) {
                call.reject("Failed to create cache directory for APK update.");
                return;
            }

            String safeVersion = versionName.replaceAll("[^a-zA-Z0-9._-]", "_");
            File targetFile = new File(updatesDir, "mesai-" + safeVersion + ".apk");
            if (targetFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                targetFile.delete();
            }

            HttpURLConnection conn = null;
            try {
                URL currentUrl = new URL(apkUrl);
                int redirects = 0;
                while (redirects < 5) {
                    if (!isTrustedHttpsUrl(currentUrl.toString())) {
                        throw new SecurityException("Redirected to untrusted host: " + currentUrl.getHost());
                    }
                    conn = (HttpURLConnection) currentUrl.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);
                    int code = conn.getResponseCode();
                    if (code == HttpURLConnection.HTTP_MOVED_PERM
                            || code == HttpURLConnection.HTTP_MOVED_TEMP
                            || code == 307
                            || code == 308) {
                        String location = conn.getHeaderField("Location");
                        conn.disconnect();
                        if (location == null || location.isEmpty()) {
                            throw new IllegalStateException("Redirect location missing.");
                        }
                        currentUrl = new URL(currentUrl, location);
                        redirects++;
                    } else {
                        break;
                    }
                }

                if (conn == null || conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    int code = conn != null ? conn.getResponseCode() : -1;
                    throw new IllegalStateException("APK download failed with HTTP " + code);
                }

                long totalBytes = conn.getContentLengthLong();
                long downloadedBytes = 0;
                int lastReportedPct = -1;

                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(targetFile)) {
                    byte[] buffer = new byte[16384];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        downloadedBytes += read;
                        int pct = totalBytes > 0
                                ? (int) Math.min(99, (downloadedBytes * 100L) / totalBytes)
                                : 0;
                        if (pct != lastReportedPct) {
                            lastReportedPct = pct;
                            emitProgress("downloading", pct, downloadedBytes, totalBytes);
                        }
                    }
                    out.flush();
                }

                emitProgress("verifying", 100, downloadedBytes, totalBytes);
                String actualSha = computeSha256(targetFile);
                if (!normalizedExpectedSha.equals(actualSha)) {
                    //noinspection ResultOfMethodCallIgnored
                    targetFile.delete();
                    throw new SecurityException("APK SHA-256 verification failed. File discarded.");
                }

                emitProgress("installing", 100, downloadedBytes, totalBytes);
                Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    BuildConfig.APPLICATION_ID + ".fileprovider",
                    targetFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(installIntent);

                JSObject ret = new JSObject();
                ret.put("status", "installer_launched");
                call.resolve(ret);
            } catch (Exception e) {
                if (targetFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    targetFile.delete();
                }
                call.reject(e.getMessage() != null ? e.getMessage() : "APK update failed.");
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    private boolean isTrustedHttpsUrl(String url) {
        return url.startsWith("https://github.com/ipflixxx/mesai_releases/")
                || url.startsWith("https://objects.githubusercontent.com/")
                || url.startsWith("https://release-assets.githubusercontent.com/");
    }

    private String computeSha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream fis = new FileInputStream(file)) {
            byte[] buffer = new byte[16384];
            int n;
            while ((n = fis.read(buffer)) != -1) {
                digest.update(buffer, 0, n);
            }
        }
        byte[] hashBytes = digest.digest();
        StringBuilder sb = new StringBuilder(hashBytes.length * 2);
        for (byte b : hashBytes) {
            sb.append(String.format(Locale.US, "%02x", b));
        }
        return sb.toString();
    }

    private void emitProgress(String phase, int progress, long downloaded, long total) {
        JSObject payload = new JSObject();
        payload.put("phase", phase);
        payload.put("progress", progress);
        payload.put("downloadedBytes", downloaded);
        payload.put("totalBytes", total);
        notifyListeners("updateDownloadProgress", payload);
    }
}
