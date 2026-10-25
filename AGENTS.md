<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Tropical Dynamics vs. Global Climate Drivers & UI Layout Conventions

### 1. Domain Separation
- **Global Climate Drivers (`/dashboard/climate-drivers`)**:
  - Keep this module dedicated to macro-scale global ocean-atmosphere teleconnections: ENSO (El Niño / La Niña in Pacific), IOD (Indian Ocean Dipole in Indian Ocean), and Seasonal Monsoon circulation (Asia-Australia).
- **Tropical Dynamics & Waves (`/dashboard/tropical-dynamics`)**:
  - Maintain a dedicated sidebar navigation menu for synoptic & intraseasonal tropical atmospheric dynamics: Madden-Julian Oscillation (MJO), Convectively Coupled Kelvin Waves (KW), Equatorial Rossby Waves (ER), Mixed Rossby-Gravity Waves (MRG), Wheeler-Hendon RMM Phase Diagrams, and NCICS Equatorial Hovmöller Satellite Diagnostics.

### 2. Dashboard UI Layout Ergonomics (Anti-Long-Scroll)
- Never stack multiple heavy visualizers (e.g. 4-wave stacked maps, ECMWF 46-day ensemble, NCICS maps, and 5-year historical tables) vertically on a single page.
- Organize complex scientific and meteorological modules using high-contrast, theme-aware tabs (`Tabs` / `TabsContent`), modular cards, and lightbox modals so that each view remains compact, performant, and legible without excessive vertical scrolling.

### 3. Meteorological Standards: Relative Humidity (RH) Error Correction
- **Absolute Physical Boundaries (0% - 100%)**:
  - Neither relative humidity values nor their uncertainty intervals $(RH \pm \Delta RH)$ may ever exceed $100\%$ or fall below $0\%$.
  - Upper error bounds must be physically clamped: $\Delta RH \le \min(\Delta RH, 100 - RH, RH)$ with a practical floor of $2\%$.
- **Robust Multi-Model Ensemble Spread**:
  - Use sample standard deviation ($\sigma$) or IQR across ensemble members rather than the raw $(\max - \min)/2$ range to eliminate distortions from single outlier NWP models.
- **Diurnal Saturation Consistency**:
  - Near dew-point saturation ($RH \ge 90\%$, e.g., dawn/night conditions), humidity uncertainty must contract toward the physical saturation ceiling ($\Delta RH \le 5\%$).


