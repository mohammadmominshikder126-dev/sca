import React, { useState } from 'react';
import { Truck } from 'lucide-react';

/**
 * Custom Scania-inspired Griffin Emblem SVG
 */
export const ScaniaLogoEmblem: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-label="Scania Emblem">
    <circle cx="32" cy="32" r="29" fill="#081E52" stroke="#E2E8F0" strokeWidth="2.5" />
    <circle cx="32" cy="32" r="24" fill="#0D2E7A" stroke="#60A5FA" strokeWidth="1" strokeOpacity="0.45" />
    {/* Crown */}
    <path d="M22 18L26 12L32 16L38 12L42 18H22Z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" />
    {/* Stylized Crimson Griffin Head */}
    <path
      d="M21 26C21 21 26 19 32 19C38 19 44 22 44 28C44 33 40 36 36 37L40 44H25L27 36C23 35 21 31 21 26Z"
      fill="#DC2626"
      stroke="#FFFFFF"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path d="M35 24L41 25L37 28Z" fill="#FBBF24" />
    <circle cx="31" cy="25" r="1.5" fill="#FFFFFF" />
  </svg>
);

/**
 * Bespoke Heavy-Duty Blue Scania Truck Vector Illustration
 * Used as default hero & card artwork when no custom banner has been uploaded via Supabase Storage.
 */
export const ScaniaTruckIllustration: React.FC<{
  variant?: 'hero' | 'compact' | 'promo';
  className?: string;
}> = ({ variant = 'hero', className = '' }) => {
  return (
    <svg
      viewBox="0 0 420 200"
      fill="none"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="420" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#071E54" />
          <stop offset="55%" stopColor="#1250C4" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="cabGrad" x1="210" y1="30" x2="360" y2="165" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0F2A7A" />
        </linearGradient>
        <linearGradient id="trailerGrad" x1="30" y1="45" x2="200" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="100%" stopColor="#0B2058" />
        </linearGradient>
        <linearGradient id="roadGrad" x1="0" y1="158" x2="420" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#051233" />
          <stop offset="100%" stopColor="#0A2159" />
        </linearGradient>
      </defs>

      {/* Atmospheric Highway Sky */}
      <rect width="420" height="200" fill="url(#skyGrad)" />
      <circle cx="330" cy="48" r="56" fill="#60A5FA" fillOpacity="0.16" />
      <circle cx="330" cy="48" r="34" fill="#93C5FD" fillOpacity="0.18" />

      {/* Distant Horizon Hills */}
      <path d="M0 140 Q90 112 180 138 T360 132 L420 142 L420 165 L0 165 Z" fill="#0B2970" fillOpacity="0.65" />

      {/* Highway Road */}
      <rect x="0" y="158" width="420" height="42" fill="url(#roadGrad)" />
      <line x1="0" y1="160" x2="420" y2="160" stroke="#60A5FA" strokeOpacity="0.35" strokeWidth="1.5" />
      <line x1="15" y1="178" x2="65" y2="178" stroke="#93C5FD" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="100" y1="178" x2="160" y2="178" stroke="#93C5FD" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="340" y1="178" x2="405" y2="178" stroke="#93C5FD" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" />

      {variant !== 'compact' && (
        <g opacity="0.95">
          {/* Trailer Body */}
          <rect x="34" y="48" width="174" height="92" rx="6" fill="url(#trailerGrad)" stroke="#60A5FA" strokeOpacity="0.35" strokeWidth="1.5" />
          <line x1="48" y1="72" x2="195" y2="72" stroke="#3B82F6" strokeOpacity="0.45" strokeWidth="2" />
          <line x1="48" y1="98" x2="195" y2="98" stroke="#3B82F6" strokeOpacity="0.3" strokeWidth="1.5" />
          <rect x="34" y="134" width="174" height="12" rx="2" fill="#091742" />
          {/* Trailer Wheels */}
          <circle cx="72" cy="153" r="13" fill="#0F172A" stroke="#475569" strokeWidth="2.5" />
          <circle cx="72" cy="153" r="5" fill="#CBD5E1" />
          <circle cx="104" cy="153" r="13" fill="#0F172A" stroke="#475569" strokeWidth="2.5" />
          <circle cx="104" cy="153" r="5" fill="#CBD5E1" />
        </g>
      )}

      {/* Heavy-Duty Scania Tractor Cab */}
      <g transform={variant === 'compact' ? 'translate(-68, 4) scale(1.06)' : 'translate(0, 0)'}>
        {/* Chassis base */}
        <rect x="208" y="132" width="150" height="18" rx="4" fill="#091742" />
        {/* Main Cab */}
        <path
          d="M214 52 C214 42 222 36 232 36 L326 36 C338 36 348 44 352 56 L362 96 L362 138 L214 138 Z"
          fill="url(#cabGrad)"
          stroke="#93C5FD"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        {/* Roof Wind Deflector */}
        <path d="M224 36 C234 24 275 22 315 26 L328 36 Z" fill="#1E40AF" stroke="#60A5FA" strokeOpacity="0.4" />
        {/* Windshield */}
        <path
          d="M276 48 L334 48 C340 48 344 52 346 58 L351 78 L276 78 Z"
          fill="#061436"
          stroke="#93C5FD"
          strokeOpacity="0.6"
          strokeWidth="1.2"
        />
        <path d="M284 52 L302 52 L292 74 L280 74 Z" fill="#3B82F6" fillOpacity="0.28" />
        {/* Side Window */}
        <path d="M226 50 L264 50 L264 78 L226 78 Z" fill="#081A4B" stroke="#60A5FA" strokeOpacity="0.4" />
        {/* Signature Scania Front Grille */}
        <rect x="284" y="88" width="68" height="42" rx="5" fill="#071538" stroke="#60A5FA" strokeOpacity="0.45" />
        <line x1="292" y1="97" x2="344" y2="97" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="292" y1="106" x2="344" y2="106" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="292" y1="115" x2="344" y2="115" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="296" y1="124" x2="340" y2="124" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
        {/* Grille Wordmark Plate */}
        <rect x="301" y="82" width="34" height="7" rx="2" fill="#E2E8F0" />
        {/* Headlights */}
        <rect x="278" y="118" width="12" height="7" rx="2" fill="#FDE047" />
        <rect x="348" y="118" width="11" height="7" rx="2" fill="#FDE047" />
        {/* Cab Wheels */}
        <circle cx="238" cy="153" r="15" fill="#0F172A" stroke="#64748B" strokeWidth="3" />
        <circle cx="238" cy="153" r="6" fill="#E2E8F0" />
        <circle cx="332" cy="153" r="15" fill="#0F172A" stroke="#64748B" strokeWidth="3" />
        <circle cx="332" cy="153" r="6" fill="#E2E8F0" />
      </g>
    </svg>
  );
};

/**
 * Bright Sky Blue Highway Scania Truck Hero matching the Mobile Reference Banner
 */
export const ScaniaTruckSkyHero: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 420 180" fill="none" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="brightSky" x1="0" y1="0" x2="420" y2="180" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#EFF6FF" />
        <stop offset="45%" stopColor="#93C5FD" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient id="brightCab" x1="220" y1="20" x2="380" y2="150" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2563EB" />
        <stop offset="60%" stopColor="#1D4ED8" />
        <stop offset="100%" stopColor="#0A2264" />
      </linearGradient>
    </defs>
    <rect width="420" height="180" fill="url(#brightSky)" />
    {/* Soft clouds */}
    <ellipse cx="75" cy="40" rx="70" ry="26" fill="#FFFFFF" fillOpacity="0.7" />
    <ellipse cx="150" cy="30" rx="55" ry="22" fill="#FFFFFF" fillOpacity="0.55" />
    {/* Green highway roadside */}
    <path d="M0 132 Q120 116 240 130 T420 125 L420 148 L0 148 Z" fill="#15803D" fillOpacity="0.35" />
    {/* Blue glowing highway wave at bottom */}
    <path d="M0 144 Q180 126 420 146 L420 180 L0 180 Z" fill="#0B2E7A" />
    <path d="M0 154 Q210 138 420 158" stroke="#60A5FA" strokeWidth="2" strokeOpacity="0.6" />
    {/* Trailer */}
    <rect x="135" y="42" width="118" height="82" rx="5" fill="#1E40AF" stroke="#93C5FD" strokeOpacity="0.5" strokeWidth="1.2" />
    <line x1="145" y1="64" x2="245" y2="64" stroke="#60A5FA" strokeOpacity="0.4" strokeWidth="2" />
    <line x1="145" y1="86" x2="245" y2="86" stroke="#60A5FA" strokeOpacity="0.3" strokeWidth="1.5" />
    {/* Truck Cab */}
    <path d="M242 40 C242 30 250 24 260 24 L350 24 C362 24 372 32 376 46 L385 88 L385 130 L242 130 Z" fill="url(#brightCab)" stroke="#BFDBFE" strokeWidth="1.4" />
    <path d="M254 24 C264 13 305 12 342 16 L352 24 Z" fill="#1E40AF" />
    <path d="M300 36 L358 36 C364 36 368 40 370 46 L375 68 L300 68 Z" fill="#07163B" stroke="#93C5FD" strokeWidth="1.1" />
    <rect x="308" y="78" width="66" height="40" rx="5" fill="#071538" stroke="#60A5FA" strokeOpacity="0.55" />
    <line x1="316" y1="87" x2="366" y2="87" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="316" y1="96" x2="366" y2="96" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="316" y1="105" x2="366" y2="105" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="323" y="72" width="36" height="6" rx="2" fill="#FFFFFF" />
    <rect x="302" y="108" width="12" height="7" rx="2" fill="#FDE047" />
    <rect x="372" y="108" width="10" height="7" rx="2" fill="#FDE047" />
    <circle cx="272" cy="134" r="14" fill="#0F172A" stroke="#64748B" strokeWidth="3" />
    <circle cx="272" cy="134" r="5.5" fill="#E2E8F0" />
    <circle cx="358" cy="134" r="14" fill="#0F172A" stroke="#64748B" strokeWidth="3" />
    <circle cx="358" cy="134" r="5.5" fill="#E2E8F0" />
  </svg>
);

/**
 * Team Silhouette Banner SVG matching the Team page reference aesthetic
 */
export const TeamHeroIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 360 120" fill="none" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="teamSky" x1="0" y1="0" x2="360" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#071B4C" />
        <stop offset="50%" stopColor="#1247B5" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
    <rect width="360" height="120" fill="url(#teamSky)" />
    <path d="M0 95 Q110 75 210 92 T360 88 L360 120 L0 120 Z" fill="#082463" fillOpacity="0.6" />
    {/* Crown above leader */}
    <path d="M74 24L79 14L86 20L93 14L98 24H74Z" fill="#FBBF24" />
    {/* Team Silhouettes */}
    <g fill="#071845" fillOpacity="0.88">
      <circle cx="48" cy="52" r="11" />
      <path d="M30 105 C30 78 66 78 66 105 Z" />
      <circle cx="86" cy="42" r="13" />
      <path d="M62 105 C62 70 110 70 110 105 Z" />
      <circle cx="126" cy="49" r="11.5" />
      <path d="M106 105 C106 76 146 76 146 105 Z" />
      <circle cx="162" cy="56" r="10" />
      <path d="M145 105 C145 81 179 81 179 105 Z" />
    </g>
  </svg>
);

/**
 * Resilient Image Wrapper enforcing Zero-Broken-Image Policy
 */
export const ScaniaImage: React.FC<{
  src?: string | null;
  alt: string;
  className?: string;
  fallbackVariant?: 'hero' | 'compact' | 'promo';
}> = ({ src, alt, className = 'w-full h-full object-cover', fallbackVariant = 'compact' }) => {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={className}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#0A2463] ${className}`}>
      <ScaniaTruckIllustration variant={fallbackVariant} className="w-full h-full" />
      <span className="sr-only">{alt}</span>
    </div>
  );
};

export const PlanFallbackThumbnail: React.FC<{ imageUrl?: string; title: string }> = ({ imageUrl, title }) => {
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={title}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#0A2463] to-[#1D4ED8] flex items-center justify-center relative overflow-hidden">
      <ScaniaTruckIllustration variant="compact" className="w-full h-full" />
      <Truck className="sr-only" />
    </div>
  );
};
