import { cn } from '@/lib/utils';

type BrandIconProps = {
  className?: string;
  title?: string;
};

export const BrandIcon = ({ className, title = 'Invera' }: BrandIconProps) => {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : 'presentation'}
      className={cn('shrink-0', className)}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="invera-bg" x1="8" y1="6" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#172033" />
          <stop offset="1" stopColor="#070b14" />
        </linearGradient>
        <linearGradient id="invera-v" x1="35" y1="14" x2="56" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#32b3ff" />
          <stop offset="0.55" stopColor="#3278ff" />
          <stop offset="1" stopColor="#7d35ff" />
        </linearGradient>
        <linearGradient id="invera-wave" x1="16" y1="28" x2="54" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#10a4ff" />
          <stop offset="0.55" stopColor="#ffffff" />
          <stop offset="1" stopColor="#8a3cff" />
        </linearGradient>
        <filter id="invera-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.22" />
        </filter>
      </defs>

      <g filter="url(#invera-shadow)">
        <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#invera-bg)" />
      </g>

      <path d="M19 16H28V48H19V16Z" fill="#F8FAFC" />
      <path d="M36 16H48L39 48H29L36 16Z" fill="url(#invera-v)" />

      <g fill="none" stroke="url(#invera-wave)" strokeWidth="1.9" strokeLinecap="round" opacity="0.98">
        <path d="M15.5 31.5C20 27.5 24.5 26 29 27.5C33.5 29 38 34.5 42.5 35.5C47 36.5 51.5 34 56 30.5" />
        <path d="M15.5 34C20 30 24.5 28.5 29 30C33.5 31.5 38 37 42.5 38C47 39 51.5 36.5 56 33" />
        <path d="M15.5 36.5C20 32.5 24.5 31 29 32.5C33.5 34 38 39.5 42.5 40.5C47 41.5 51.5 39 56 35.5" />
        <path d="M15.5 39C20 35 24.5 33.5 29 35C33.5 36.5 38 42 42.5 43C47 44 51.5 41.5 56 38" />
        <path d="M15.5 41.5C20 37.5 24.5 36 29 37.5C33.5 39 38 44.5 42.5 45.5C47 46.5 51.5 44 56 40.5" />
      </g>
    </svg>
  );
};
