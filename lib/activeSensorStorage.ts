/**
 * Persistent active sensor / node storage manager.
 * Stores the currently selected sensor ID in localStorage (with cross-page sync and fallback resilience),
 * preventing the dashboard from unconditionally resetting back to 'id-01' or the first option.
 */

export const ACTIVE_SENSOR_STORAGE_KEY = "meteo_active_sensor_id";
export const ACTIVE_SENSOR_METADATA_KEY = "meteo_active_sensor_meta";
export const ACTIVE_SENSOR_EVENT = "meteo:active-sensor-change";

export interface StoredSensorMeta {
  sensorId: string;
  label?: string;
  lastUpdatedAt: string;
}

/**
 * Safely retrieve the currently stored active sensor ID from localStorage.
 */
export function getStoredActiveSensorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(ACTIVE_SENSOR_STORAGE_KEY);
    return stored && stored.trim() ? stored.trim() : null;
  } catch (err) {
    console.warn("[activeSensorStorage] Failed to read localStorage:", err);
    return null;
  }
}

/**
 * Persist the selected active sensor ID to localStorage and broadcast an update event.
 */
export function setStoredActiveSensorId(
  sensorId: string,
  metadata?: { label?: string }
): void {
  if (typeof window === "undefined" || !sensorId) return;
  try {
    const cleanId = sensorId.trim();
    window.localStorage.setItem(ACTIVE_SENSOR_STORAGE_KEY, cleanId);

    const meta: StoredSensorMeta = {
      sensorId: cleanId,
      label: metadata?.label,
      lastUpdatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      ACTIVE_SENSOR_METADATA_KEY,
      JSON.stringify(meta)
    );

    // Broadcast event for live in-session synchronization across components
    window.dispatchEvent(
      new CustomEvent(ACTIVE_SENSOR_EVENT, { detail: { sensorId: cleanId } })
    );
  } catch (err) {
    console.warn("[activeSensorStorage] Failed to write localStorage:", err);
  }
}

/**
 * Resolves the appropriate sensor ID given a list of available options:
 * Priority:
 * 1. preferredId (e.g. from URL query param or props), if present in options
 * 2. storedId in localStorage, if present in options
 * 3. fallbackDefault, if present in options
 * 4. First item in options
 * 5. fallbackDefault as absolute last resort
 */
export function resolveActiveSensorId(
  options: Array<{ value: string; label?: string }>,
  preferredId?: string | null,
  fallbackDefault: string = "id-01"
): string {
  if (!options || options.length === 0) {
    return preferredId || getStoredActiveSensorId() || fallbackDefault;
  }

  const optionValues = new Set(options.map((opt) => opt.value));

  // 1. Preferred ID (e.g. URL query params)
  if (preferredId && optionValues.has(preferredId)) {
    setStoredActiveSensorId(preferredId);
    return preferredId;
  }

  // 2. Stored ID in localStorage
  const storedId = getStoredActiveSensorId();
  if (storedId && optionValues.has(storedId)) {
    return storedId;
  }

  // 3. Explicit fallback default if available in options
  if (fallbackDefault && optionValues.has(fallbackDefault)) {
    return fallbackDefault;
  }

  // 4. First valid option from loaded devices
  return options[0].value;
}

/**
 * Resolves full Device/Option object from an array of devices based on stored/preferred ID.
 * Works seamlessly whether items use `value` or `id`.
 */
export function resolveActiveSensor<T extends { id?: string; value?: string; label?: string }>(
  devices: T[],
  preferredId?: string | null
): T | null {
  if (!devices || devices.length === 0) return null;
  const matchId = (item: T, target: string) =>
    (item.value && item.value === target) || (item.id && item.id === target);

  // 1. Preferred ID
  if (preferredId) {
    const match = devices.find((d) => matchId(d, preferredId));
    if (match) {
      const activeVal = match.value || match.id || preferredId;
      setStoredActiveSensorId(activeVal, { label: match.label });
      return match;
    }
  }

  // 2. Stored ID
  const storedId = getStoredActiveSensorId();
  if (storedId) {
    const match = devices.find((d) => matchId(d, storedId));
    if (match) return match;
  }

  // 3. Fallback to first device
  return devices[0] || null;
}

