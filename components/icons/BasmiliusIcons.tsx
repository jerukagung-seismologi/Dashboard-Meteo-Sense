// components/icons/BasmiliusIcons.tsx
import React from "react";

// --- BASE PROPS ---
type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// --- LINE ICONS (BASMILIUS STYLE) ---

export const BasmiliusLineSun = ({ size = 64, color = "#F59E0B", strokeWidth = 2 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M32 9V5M32 59V55M9 32H5M59 32H55M15.74 15.74L12.91 12.91M51.09 51.09L48.26 48.26M15.74 48.26L12.91 51.09M51.09 12.91L48.26 15.74" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const BasmiliusLineMoon = ({ size = 64, color = "#7C3AED", strokeWidth = 2 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M43.5 24.5C43.5 37.4787 32.9787 48 20 48C17.25 48 14.62 47.53 12.18 46.67C15.63 53.07 22.37 57.5 30.13 57.5C41.72 57.5 51.13 48.09 51.13 36.5C51.13 28.74 46.7 22 40.3 18.55C42.36 20.21 43.5 22.25 43.5 24.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const BasmiliusLineCloud = ({ size = 64, color = "#64748B", strokeWidth = 2 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M46.5 22.5C46.5 13.66 39.34 6.5 30.5 6.5C23.5 6.5 17.61 10.99 15.42 17.27C14.61 17.18 13.81 17.15 13 17.15C6.92 17.15 2 22.08 2 28.15C2 34.22 6.92 39.15 13 39.15H46.5C53.68 39.15 59.5 33.33 59.5 26.15C59.5 18.97 53.68 13.15 46.5 13.15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" transform="translate(0, 10)"/>
  </svg>
);

export const BasmiliusLineCloudSun = ({ size = 64, color = "#F59E0B", strokeWidth = 2 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Sun Behind */}
    <circle cx="26" cy="22" r="8" stroke="#F59E0B" strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M26 6V3M26 41V38M7 22H4M48 22H45M13.27 9.27L11.15 7.15M40.85 36.85L38.73 34.73M13.27 34.73L11.15 36.85M40.85 7.15L38.73 9.27" stroke="#F59E0B" strokeWidth={strokeWidth} strokeLinecap="round"/>
    
    {/* Cloud Front */}
    <path d="M46.5 31.5C46.5 25.15 41.35 20 35 20C34.1 20 33.2 20.1 32.35 20.3C30.25 15.5 25.45 12 19.85 12C12.35 12 6.35 18 6.35 25.5C6.35 26.1 6.35 26.7 6.45 27.3C2.8 29.1 0 32.8 0 37.2C0 43.1 4.9 48 11 48H46.5C53.7 48 59.5 42.2 59.5 35C59.5 27.8 53.7 22 46.5 22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="white" />
  </svg>
);

export const BasmiliusLineCloudMoon = ({ size = 64, color = "#7C3AED", strokeWidth = 2 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Moon Behind */}
    <path d="M36 10C36 17 30 22 23 22C21.5 22 20 21.8 18.6 21.5C20.6 25.3 24.6 28 29.2 28C35.8 28 41.2 22.6 41.2 16C41.2 13.5 40.5 11.2 39.3 9.2C38.3 9.6 37.2 9.9 36 10Z" stroke="#7C3AED" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    
    {/* Cloud Front */}
    <path d="M46.5 31.5C46.5 25.15 41.35 20 35 20C34.1 20 33.2 20.1 32.35 20.3C30.25 15.5 25.45 12 19.85 12C12.35 12 6.35 18 6.35 25.5C6.35 26.1 6.35 26.7 6.45 27.3C2.8 29.1 0 32.8 0 37.2C0 43.1 4.9 48 11 48H46.5C53.7 48 59.5 42.2 59.5 35C59.5 27.8 53.7 22 46.5 22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="white" />
  </svg>
);

export const BasmiliusLineRain = ({ size = 64, color = "#3B82F6", strokeWidth = 2, heavy = false }: any) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M46.5 21.5C46.5 12.66 39.34 5.5 30.5 5.5C23.5 5.5 17.61 9.99 15.42 16.27C14.61 16.18 13.81 16.15 13 16.15C6.92 16.15 2 21.08 2 27.15C2 33.22 6.92 38.15 13 38.15H46.5C53.68 38.15 59.5 32.33 59.5 25.15C59.5 17.97 53.68 12.15 46.5 12.15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 46L19 54" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    <path d="M32 46L29 54" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    <path d="M42 46L39 54" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    {heavy && (
      <>
        <path d="M27 52L24 60" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
        <path d="M37 52L34 60" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      </>
    )}
  </svg>
);

export const BasmiliusLineStorm = ({ size = 64, color = "#1E3A8A", strokeWidth = 2 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M46.5 21.5C46.5 12.66 39.34 5.5 30.5 5.5C23.5 5.5 17.61 9.99 15.42 16.27C14.61 16.18 13.81 16.15 13 16.15C6.92 16.15 2 21.08 2 27.15C2 33.22 6.92 38.15 13 38.15H46.5C53.68 38.15 59.5 32.33 59.5 25.15C59.5 17.97 53.68 12.15 46.5 12.15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M34 42L26 52H32L28 62" stroke="#F59E0B" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const BasmiliusLineFog = ({ size = 64, color = "#94A3B8", strokeWidth = 2 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 24H54" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    <path d="M14 32H50" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    <path d="M6 40H58" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    <path d="M18 48H46" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
  </svg>
);

export const BasmiliusLineWind = ({ size = 64, color = "#64748B", strokeWidth = 2 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M47 18C47 18 52 16 52 12C52 8 48 8 48 10C48 14 54 12 54 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 26H48C48 26 56 26 56 32C56 38 48 36 48 34" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 38H40C40 38 46 38 46 44C46 50 40 48 40 46" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// --- MAIN SELECTOR ---

export const getBasmiliusLineIcon = (condition: string, time: string, size: number = 72) => {
  const hour = parseInt(time.split(":")[0]) || 0;
  const isNight = hour >= 18 || hour < 6;
  const commonProps = { size, strokeWidth: 3.5 }; // Garis sedikit tebal agar tegas di gambar

  switch (condition) {
    case "Cerah":
      return isNight ? <BasmiliusLineMoon {...commonProps} /> : <BasmiliusLineSun {...commonProps} />;
    
    case "Cerah Berawan":
      return isNight ? <BasmiliusLineCloudMoon {...commonProps} /> : <BasmiliusLineCloudSun {...commonProps} />;
    
    case "Berawan":
      return <BasmiliusLineCloud {...commonProps} />;
    
    case "Hujan Ringan":
      return <BasmiliusLineRain {...commonProps} heavy={false} />;
    
    case "Hujan Sedang":
      return <BasmiliusLineRain {...commonProps} heavy={false} />; // Bisa di-tweak
    
    case "Hujan Lebat":
      return <BasmiliusLineRain {...commonProps} heavy={true} />;
    
    case "Badai Petir":
      return <BasmiliusLineStorm {...commonProps} />;
    
    case "Kabut":
      return <BasmiliusLineFog {...commonProps} />;
    
    case "Angin Kencang":
      return <BasmiliusLineWind {...commonProps} />;
      
    default:
      return <BasmiliusLineCloud {...commonProps} />;
  }
};