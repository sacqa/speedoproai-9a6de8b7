/**
 * Native (Capacitor) bootstrap.
 *
 * Every call is guarded so the exact same code keeps working in a normal
 * browser and in the installed web app — nothing here runs on the web.
 */
import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();
export const nativePlatform = () => Capacitor.getPlatform(); // "ios" | "android" | "web"

export async function initNative() {
  if (!isNative()) return;

  document.documentElement.classList.add("is-native", `is-${Capacitor.getPlatform()}`);

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#fafaf7" });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch { /* status bar unavailable */ }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch { /* no splash */ }

  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    await Keyboard.setScroll({ isDisabled: false });
  } catch { /* keyboard plugin unavailable */ }

  // Hardware back button on Android: go back in history, otherwise minimise.
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) window.history.back();
      else App.exitApp();
    });
  } catch { /* app plugin unavailable */ }
}

/**
 * Location: uses the native geolocation plugin when running in the app
 * (proper OS permission prompt), falls back to the browser API on the web.
 */
export async function getPosition(): Promise<GeolocationPosition> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted") await Geolocation.requestPermissions();
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
    return pos as unknown as GeolocationPosition;
  }
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    }),
  );
}
