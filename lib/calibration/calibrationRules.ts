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
    case "robust_linear":
      if (typeof config.scale !== "number" || typeof config.offset !== "number") return raw;
      return raw * config.scale + config.offset;
    case "multiplier":
      if (typeof config.multiplier !== "number") return raw;
      return raw * config.multiplier;
    case "polynomial": {
      const a = typeof config.polyA === "number" ? config.polyA : 0;
      const b = typeof config.polyB === "number" ? config.polyB : 1;
      const c = typeof config.polyC === "number" ? config.polyC : 0;
      return a * raw * raw + b * raw + c;
    }
    case "power_law": {
      const a = typeof config.powerA === "number" ? config.powerA : 1;
      const b = typeof config.powerB === "number" ? config.powerB : 1;
      if (raw <= 0) return 0;
      return a * Math.pow(raw, b);
    }
    case "two_point": {
      const x1 = config.point1Raw;
      const y1 = config.point1Ref;
      const x2 = config.point2Raw;
      const y2 = config.point2Ref;
      if (
        typeof x1 !== "number" ||
        typeof y1 !== "number" ||
        typeof x2 !== "number" ||
        typeof y2 !== "number" ||
        Math.abs(x2 - x1) < 1e-6
      ) {
        return raw;
      }
      const slope = (y2 - y1) / (x2 - x1);
      return y1 + slope * (raw - x1);
    }
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

  if (
    lowerVar.includes("rain") ||
    lowerVar.includes("solar") ||
    lowerVar.includes("uv") ||
    lowerVar.includes("lux")
  ) {
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
