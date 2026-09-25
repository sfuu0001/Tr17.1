import { useState, useEffect, useCallback } from 'react';
import { UiverseSkinMode } from './uiverseRegistry';

const UIVERSE_STORAGE_KEY = 'uiverse_active_skin';
const UIVERSE_EVENT = 'uiverse_skin_changed';

export function getStoredUiverseSkin(): UiverseSkinMode {
  try {
    const val = localStorage.getItem(UIVERSE_STORAGE_KEY);
    if (val === 'cyber_neon' || val === 'tactile_3d' || val === 'glass_frost' || val === 'default') {
      return val;
    }
  } catch {
    // fallback
  }
  return 'cyber_neon'; // Default to cyber_neon as requested by user
}

export function setStoredUiverseSkin(skin: UiverseSkinMode) {
  try {
    localStorage.setItem(UIVERSE_STORAGE_KEY, skin);
    window.dispatchEvent(new CustomEvent(UIVERSE_EVENT, { detail: skin }));
  } catch {
    // ignore
  }
}

export function useUiverseSkin() {
  const [skin, setSkinState] = useState<UiverseSkinMode>(getStoredUiverseSkin);

  useEffect(() => {
    const handleSkinChange = (e: Event) => {
      const customEvent = e as CustomEvent<UiverseSkinMode>;
      if (customEvent.detail) {
        setSkinState(customEvent.detail);
      }
    };

    window.addEventListener(UIVERSE_EVENT, handleSkinChange);
    return () => {
      window.removeEventListener(UIVERSE_EVENT, handleSkinChange);
    };
  }, []);

  const updateSkin = useCallback((newSkin: UiverseSkinMode) => {
    setSkinState(newSkin);
    setStoredUiverseSkin(newSkin);
  }, []);

  return { skin, updateSkin };
}
