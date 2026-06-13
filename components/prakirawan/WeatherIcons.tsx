import React from "react"
import { Sun, CloudSun, Cloud, CloudRain, CloudDrizzle, CloudLightning, CloudFog, Wind } from "lucide-react"

export const getConditionColor = (condition: string) => {
  switch (condition) {
    case "Cerah": return "#F59E0B"       // amber
    case "Cerah Berawan": return "#FBBF24" // warm yellow
    case "Berawan": return "#64748B"     // gray
    case "Hujan Ringan": return "#3B82F6" // blue
    case "Hujan Sedang": return "#2563EB" // darker blue
    case "Hujan Lebat": return "#1E40AF"  // deep blue
    case "Badai Petir": return "#7C3AED"  // purple
    case "Kabut": return "#0EA5A4"        // teal
    case "Angin Kencang": return "#0F172A"// indigo/near black
    default: return "#64748B"
  }
}

export const getLucideIconForCondition = (condition: string, size: number = 16) => {
  const color = getConditionColor(condition)
  switch (condition) {
    case "Cerah":
      return <Sun size={size} color={color} />
    case "Cerah Berawan":
      return <CloudSun size={size} color={color} />
    case "Berawan":
      return <Cloud size={size} color={color} />
    case "Hujan Ringan":
      return <CloudDrizzle size={size} color={color} />
    case "Hujan Sedang":
      return <CloudRain size={size} color={color} />
    case "Hujan Lebat":
      return <CloudRain size={size} color={color} />
    case "Badai Petir":
      return <CloudLightning size={size} color={color} />
    case "Kabut":
      return <CloudFog size={size} color={color} />
    case "Angin Kencang":
      return <Wind size={size} color={color} />
    default:
      return <Cloud size={size} color={color} />
  }
}
