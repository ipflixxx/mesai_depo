import { useEffect, useState } from 'react';
import { isNativeAndroidPlatform, MesaiUpdater } from '../native/mesaiUpdater';
import { ThemeMode } from '../types/mesai';

export function resolveIsDark(themeMode: ThemeMode): boolean {
  if (themeMode === 'dark') return true;
  if (themeMode === 'light') return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true;
}

export function useResolvedDark(themeMode: ThemeMode): boolean {
  const [isDark, setIsDark] = useState<boolean>(() => resolveIsDark(themeMode));

  useEffect(() => {
    setIsDark(resolveIsDark(themeMode));
    if (themeMode !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setIsDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [themeMode]);

  return isDark;
}

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

      const metaThemes = document.querySelectorAll('meta[name="theme-color"]');
      metaThemes.forEach((meta) => {
        meta.setAttribute('content', resolvedDark ? '#101211' : '#F5F3EE');
      });

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
