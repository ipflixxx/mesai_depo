import { useEffect } from 'react';
import { isNativeAndroidPlatform, MesaiUpdater } from '../native/mesaiUpdater';
import { ThemeMode } from '../types/mesai';

export function useTheme(themeMode: ThemeMode) {
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolvedDark =
        themeMode === 'dark' || (themeMode === 'system' && mediaQuery.matches);

      if (resolvedDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', resolvedDark ? '#101211' : '#F6F8F6');
      }

      if (isNativeAndroidPlatform()) {
        void MesaiUpdater.setSystemBarAppearance({ isDark: resolvedDark }).catch(() => {
          // Ignore on non-supported environments
        });
      }
    };

    applyTheme();

    const handleSystemChange = () => {
      if (themeMode === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themeMode]);
}
