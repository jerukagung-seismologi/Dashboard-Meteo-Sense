/**
 * Global Application Configuration & Metadata
 * Single Source of Truth for system versioning and branding across Meteo Sense.
 */
export const APP_CONFIG = {
  name: "Meteo Sense",
  version: "4.2.5",
  build: "2026.10",
  fullName: "Meteo Sense Dashboard",
  organization: "Stasiun Meteorologi Jerukagung",
} as const;

export type AppConfig = typeof APP_CONFIG;
