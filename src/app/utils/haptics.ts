// Haptic Feedback & Tactile Vibration Utility for Mobile & Desktop Web

export type HapticStyle = "light" | "medium" | "heavy" | "selection" | "success" | "warning";

export function triggerHaptic(style: HapticStyle = "light") {
  if (typeof window === "undefined" || !("navigator" in window)) return;

  try {
    if (typeof navigator.vibrate === "function") {
      switch (style) {
        case "selection":
          navigator.vibrate(8);
          break;
        case "light":
          navigator.vibrate(14);
          break;
        case "medium":
          navigator.vibrate(28);
          break;
        case "heavy":
          navigator.vibrate(45);
          break;
        case "success":
          navigator.vibrate([12, 40, 20]);
          break;
        case "warning":
          navigator.vibrate([30, 40, 30, 40, 50]);
          break;
        default:
          navigator.vibrate(15);
      }
    }
  } catch {
    // Ignore environments where vibration is blocked or unsupported
  }
}
