// components/icons/BasmiliusIcons.tsx
import React from "react";

// --- BASE PROPS ---
type IconProps = {
  size?: number;
  className?: string;
  // Opsional: Jika ingin override warna default di dalam SVG
  color?: string; 
};

// ============================================================================
// 1. CLEAR DAY (CERAH SIANG)
// ============================================================================
export const BasmiliusClearDay = ({ size = 64, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <symbol id="clear-day-symbol" viewBox="0 0 375 375">
        <circle cx="187.5" cy="187.5" r="84" fill="none" stroke="#fbbf24" strokeMiterlimit="10" strokeWidth="15"/>
        <path fill="none" stroke="#fbbf24" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="15" d="M187.5 57.2V7.5m0 360v-49.7m92.2-222.5 35-35M60.3 314.7l35.1-35.1m0-184.4-35-35m254.5 254.5-35.1-35.1M57.2 187.5H7.5m360 0h-49.7"/>
      </symbol>
    </defs>
    <use href="#clear-day-symbol" width="375" height="375" transform="translate(68.5 68.5)"/>
  </svg>
);

// ============================================================================
// 2. CLEAR NIGHT (CERAH MALAM)
// ============================================================================
export const BasmiliusClearNight = ({ size = 64, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <symbol id="clear-night-symbol" viewBox="0 0 279 279">
        <path fill="none" stroke="#72b9d5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="15" d="M256.8 173.1A133.3 133.3 0 01122.4 40.7 130.5 130.5 0 01127 7.5 133 133 0 007.5 139.1c0 73.1 60 132.4 134.2 132.4 62.5 0 114.8-42.2 129.8-99.2a135.6 135.6 0 01-14.8.8Z"/>
      </symbol>
    </defs>
    <use href="#clear-night-symbol" width="279" height="279" transform="translate(116.5 116.5)"/>
  </svg>
);

// ============================================================================
// 3. OVERCAST (BERAWAN TEBAL / MENDUNG)
// ============================================================================
export const BasmiliusOvercast = ({ size = 64, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <symbol id="ovc-c" viewBox="0 0 214.3 140.1">
        <path fill="none" stroke="#94a3b8" strokeLinejoin="round" strokeWidth="15" d="M7.5 100.2a32.4 32.4 0 0032.4 32.4h129.8v-.1l2.3.1a34.8 34.8 0 006.5-68.9 32.4 32.4 0 00-48.5-33 48.6 48.6 0 00-88.6 37.1h-1.5a32.4 32.4 0 00-32.4 32.4Z"/>
      </symbol>
      <symbol id="ovc-d" viewBox="0 0 359 231">
        <path fill="none" stroke="#e2e8f0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="15" d="M295.5 223.5a56 56 0 000-112l-2.5.1a83.9 83.9 0 00-153-64.2 56 56 0 00-84.6 48.1 56.6 56.6 0 00.8 9 60 60 0 0011.2 119"/>
      </symbol>
      <symbol id="ovc-b" viewBox="0 0 447.7 371.5">
        <g clipPath="url(#ovc-a)">
          <use href="#ovc-c" width="214.3" height="140.1" transform="translate(195.51 165.01)"/>
        </g>
        <use href="#ovc-d" width="359" height="231" transform="translate(0 140.5)"/>
      </symbol>
      <clipPath id="ovc-a">
        <path fill="none" d="M351.5 308a56 56 0 00-56-56l-2.5.1A83.7 83.7 0 00211.5 148V0h236.2v308Z"/>
      </clipPath>
    </defs>
    <use href="#ovc-b" width="447.7" height="371.5" transform="translate(64.34)"/>
  </svg>
);

// ============================================================================
// 4. OVERCAST DAY (CERAH BERAWAN SIANG)
// ============================================================================
export const BasmiliusOvercastDay = ({ size = 64, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <symbol id="ovcd-d" viewBox="0 0 193 193">
        <circle cx="96.5" cy="96.5" r="40" fill="none" stroke="#fbbf24" strokeMiterlimit="10" strokeWidth="9"/>
        <path fill="none" stroke="#fbbf24" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="9" d="M96.5 29.9V4.5m0 184v-25.4m47.1-113.7 18-18M31.4 161.6l18-18m0-94.2-18-18m130.2 130.2-18-18M4.5 96.5h25.4m158.6 0h-25.4"/>
      </symbol>
      <symbol id="ovcd-f" viewBox="0 0 214.3 140.1">
        <path fill="none" stroke="#94a3b8" strokeLinejoin="round" strokeWidth="15" d="M7.5 100.2a32.4 32.4 0 0032.4 32.4h129.8v-.1l2.3.1a34.8 34.8 0 006.5-68.9 32.4 32.4 0 00-48.5-33 48.6 48.6 0 00-88.6 37.1h-1.5a32.4 32.4 0 00-32.4 32.4Z"/>
      </symbol>
      <symbol id="ovcd-g" viewBox="0 0 359 231">
        <path fill="none" stroke="#e2e8f0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="15" d="M295.5 223.5a56 56 0 000-112l-2.5.1a83.9 83.9 0 00-153-64.2 56 56 0 00-84.6 48.1 56.6 56.6 0 00.8 9 60 60 0 0011.2 119"/>
      </symbol>
      <symbol id="ovcd-e" viewBox="0 0 447.7 371.5">
        <g clipPath="url(#ovcd-a)">
          <use href="#ovcd-f" width="214.3" height="140.1" transform="translate(195.51 165.01)"/>
        </g>
        <use href="#ovcd-g" width="359" height="231" transform="translate(0 140.5)"/>
      </symbol>
      <symbol id="ovcd-c" viewBox="0 0 512 371.5">
        <g clipPath="url(#ovcd-b)">
          <use href="#ovcd-d" width="193" height="193" transform="translate(57.5 110.5)"/>
        </g>
        <use href="#ovcd-e" width="447.7" height="371.5" transform="translate(64.34)"/>
      </symbol>
      <clipPath id="ovcd-a">
        <path fill="none" d="M351.5 308a56 56 0 00-56-56l-2.5.1A83.7 83.7 0 00211.5 148V0h236.2v308Z"/>
      </clipPath>
      <clipPath id="ovcd-b">
        <path fill="none" d="M276 148a83.8 83.8 0 00-71.4 40 56 56 0 00-84.6 48 56.6 56.6 0 00.8 9A60 60 0 0072 304H0V0h276Z"/>
      </clipPath>
    </defs>
    <use href="#ovcd-c" width="512" height="371.5"/>
  </svg>
);

// ============================================================================
// 5. OVERCAST NIGHT (CERAH BERAWAN MALAM)
// ============================================================================
export const BasmiliusOvercastNight = ({ size = 64, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <symbol id="ovcn-d" viewBox="0 0 178 178">
        <path fill="none" stroke="#72b9d5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="10" d="M163.6 110.4a84.8 84.8 0 01-85.4-84.3A83.3 83.3 0 0181 5 84.7 84.7 0 005 88.7 84.8 84.8 0 0090.4 173a85.2 85.2 0 0082.6-63.1 88 88 0 01-9.4.5Z"/>
      </symbol>
      <symbol id="ovcn-f" viewBox="0 0 214.3 140.1">
        <path fill="none" stroke="#94a3b8" strokeLinejoin="round" strokeWidth="15" d="M7.5 100.2a32.4 32.4 0 0032.4 32.4h129.8v-.1l2.3.1a34.8 34.8 0 006.5-68.9 32.4 32.4 0 00-48.5-33 48.6 48.6 0 00-88.6 37.1h-1.5a32.4 32.4 0 00-32.4 32.4Z"/>
      </symbol>
      <symbol id="ovcn-g" viewBox="0 0 359 231">
        <path fill="none" stroke="#e2e8f0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="15" d="M295.5 223.5a56 56 0 000-112l-2.5.1a83.9 83.9 0 00-153-64.2 56 56 0 00-84.6 48.1 56.6 56.6 0 00.8 9 60 60 0 0011.2 119"/>
      </symbol>
      <symbol id="ovcn-e" viewBox="0 0 447.7 371.5">
        <g clipPath="url(#ovcn-a)">
          <use href="#ovcn-f" width="214.3" height="140.1" transform="translate(195.51 165.01)"/>
        </g>
        <use href="#ovcn-g" width="359" height="231" transform="translate(0 140.5)"/>
      </symbol>
      <symbol id="ovcn-c" viewBox="0 0 512 371.5">
        <g clipPath="url(#ovcn-b)">
          <use href="#ovcn-d" width="178" height="178" transform="translate(65 118)"/>
        </g>
        <use href="#ovcn-e" width="447.7" height="371.5" transform="translate(64.34)"/>
      </symbol>
      <clipPath id="ovcn-a">
        <path fill="none" d="M351.5 308a56 56 0 00-56-56l-2.5.1A83.7 83.7 0 00211.5 148V0h236.2v308Z"/>
      </clipPath>
      <clipPath id="ovcn-b">
        <path fill="none" d="M276 148a83.8 83.8 0 00-71.4 40 56 56 0 00-84.6 48 56.6 56.6 0 00.8 9A60 60 0 0072 304H0V0h276Z"/>
      </clipPath>
    </defs>
    <use href="#ovcn-c" width="512" height="371.5"/>
  </svg>
);

// --- 6. HUJAN RINGAN / DRIZZLE (DARI KODE SEBELUMNYA) ---
// Kita sesuaikan sedikit agar viewBoxnya sama 512
export const BasmiliusDrizzle = ({ size = 64, className, color = "#0a5ad4" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <symbol id="drizzle-a" viewBox="0 0 359 231">
        <path fill="none" stroke="#e2e8f0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="15" d="M295.5 223.5a56 56 0 000-112l-2.5.1a83.9 83.9 0 00-153-64.2 56 56 0 00-84.6 48.1 56.6 56.6 0 00.8 9 60 60 0 0011.2 119"/>
      </symbol>
    </defs>
    <use href="#drizzle-a" width="359" height="231" transform="translate(76.5 140.5)"/>
    <path fill={color} d="M200 376a8 8 0 01-8-8v-12a8 8 0 0116 0v12a8 8 0 01-8 8Zm56 80a8 8 0 01-8-8v-12a8 8 0 0116 0v12a8 8 0 01-8 8Zm56-50a8 8 0 01-8-8v-12a8 8 0 0116 0v12a8 8 0 01-8 8Z"/>
  </svg>
);

// ============================================================================
// LOGIC PEMILIH IKON UTAMA
// ============================================================================

export const getBasmiliusLineIcon = (condition: string, time: string, size: number = 72) => {
  const hour = parseInt(time.split(":")[0]) || 0;
  const isNight = hour >= 18 || hour < 6;
  
  // Styling props
  const props = { size };

  switch (condition) {
    case "Cerah":
      return isNight ? <BasmiliusClearNight {...props} /> : <BasmiliusClearDay {...props} />;
    
    case "Cerah Berawan":
      return isNight ? <BasmiliusOvercastNight {...props} /> : <BasmiliusOvercastDay {...props} />;
    
    case "Berawan":
      return <BasmiliusOvercast {...props} />;
    
    case "Hujan Ringan":
      // Kita pakai icon Drizzle biru
      return <BasmiliusDrizzle {...props} color="#3B82F6" />;
    
    case "Hujan Sedang":
      // Untuk sementara pakai Drizzle tapi warna lebih gelap/tegas
      return <BasmiliusDrizzle {...props} color="#1D4ED8" />;
    
    case "Hujan Lebat":
      // Nanti bisa tambah SVG baru untuk hujan lebat/petir
      return <BasmiliusDrizzle {...props} color="#1E40AF" />;
      
    // Fallback pakai awan mendung
    default:
      return <BasmiliusOvercast {...props} />;
  }
};