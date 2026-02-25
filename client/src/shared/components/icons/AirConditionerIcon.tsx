import React from 'react';

export const AirConditionerIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Main Unit Body - Maximized Width (1px padding) */}
      <rect x="1" y="6" width="22" height="12" rx="2" />

      {/* Horizontal Vent Line */}
      <line x1="3" y1="14" x2="21" y2="14" />

      {/* Indicator Light/Display */}
      <circle cx="19" cy="10" r="0.5" fill="currentColor" stroke="none" />

      {/* Snowflake Badge - Slightly Larger */}
      <path d="M5 9v2" />
      <path d="M4 10h2" />

      {/* Wifi Signal (Smart) - Pushed closer to edge */}
      <path d="M17 3a3 3 0 0 1 3 3" />
      <path d="M20 6a1 1 0 0 1 0 0" />

      {/* Air Flow Waves - Widen spread */}
      <path d="M5 21l1.5-2" />
      <path d="M10 21l1.5-2" />
      <path d="M14 21l1.5-2" />
      <path d="M19 21l1.5-2" />
    </svg>
  );
};
