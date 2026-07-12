import { useState, useEffect } from "react";

const CALIBRATION_STORAGE_KEY = "meteo_sense_use_calibration";

/**
 * Hook to manage the global "Display Mode" (Raw Data vs Corrected Data) across the dashboard.
 */
export function useCalibrationMode() {
  const [isCorrectedMode, setIsCorrectedMode] = useState<boolean>(true); // Default to corrected

  useEffect(() => {
    // Load from local storage on mount
    const stored = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (stored !== null) {
      setIsCorrectedMode(stored === "true");
    }
  }, []);

  const toggleMode = (enabled: boolean) => {
    setIsCorrectedMode(enabled);
    localStorage.setItem(CALIBRATION_STORAGE_KEY, String(enabled));
    // Optional: We can dispatch a custom event if we need other components to sync instantly,
    // but typically SWR hooks or prop drilling will handle it if the toggle is high enough.
    window.dispatchEvent(new Event('calibrationModeChanged'));
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(CALIBRATION_STORAGE_KEY);
      if (stored !== null) {
        setIsCorrectedMode(stored === "true");
      }
    };
    window.addEventListener('calibrationModeChanged', handleStorageChange);
    return () => window.removeEventListener('calibrationModeChanged', handleStorageChange);
  }, []);

  return { isCorrectedMode, toggleMode };
}
