import { SensorVariableCalibration } from "./calibrationTypes";

/**
 * Apply mathematical correction methods.
 */
export function applyMathCorrection(raw: number, config: SensorVariableCalibration): number {
  if (!config.enabled) return raw;

  switch (config.method) {
    case "none":
      return raw;
    case "percentage":
      if (typeof config.percentage !== "number") return raw;
      return raw * (1 + config.percentage / 100);
    case "offset":
      if (typeof config.offset !== "number") return raw;
      return raw + config.offset;
    case "scale":
      if (typeof config.scale !== "number") return raw;
      return raw * config.scale;
    case "scale_offset":
      if (typeof config.scale !== "number" || typeof config.offset !== "number") return raw;
      return (raw * config.scale) + config.offset;
    case "multiplier":
      if (typeof config.multiplier !== "number") return raw;
      return raw * config.multiplier;
    default:
      return raw;
  }
}

/**
 * Enforce physical boundaries based on the variable type.
 */
export function enforceBoundaries(variableName: string, value: number): number {
  const lowerVar = variableName.toLowerCase();
  
  if (lowerVar.includes("humidity")) {
    return Math.max(0, Math.min(100, value));
  }
  
  if (lowerVar.includes("rain") || lowerVar.includes("solar") || lowerVar.includes("uv") || lowerVar.includes("lux")) {
    return Math.max(0, value);
  }
  
  if (lowerVar.includes("winddir")) {
    // Wrap to 0-360
    let wrapped = value % 360;
    if (wrapped < 0) wrapped += 360;
    return wrapped === 360 ? 0 : wrapped;
  }

  // Fallback, no boundary constraints
  return value;
}
