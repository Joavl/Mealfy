import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Maps the Android hardware/gesture back button to browser history navigation,
 * so react-router and the BottomSheet popstate handler take over naturally.
 * Exits the app only when there is no more history to go back to.
 */
export const useNativeBackButton = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, []);
};
