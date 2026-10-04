import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  centered?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', centered = false }) => {
  const iconSize = size === 'sm' ? 22 : size === 'lg' ? 32 : 26;
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className={`inline-flex items-center gap-2.5 ${centered ? 'justify-center' : ''} ${className}`}>
      {/* Rounded document outline with check mark inside, accent #B5532C */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <rect
          x="2.5"
          y="2.5"
          width="23"
          height="23"
          rx="6"
          stroke="#B5532C"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M8.5 14.5L12.5 18.5L19.5 10.5"
          stroke="#B5532C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`font-semibold tracking-tight text-[#1F1D1A] ${textSize}`}>
        ApplyFlow
      </span>
    </div>
  );
};
