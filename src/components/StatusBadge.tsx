import React from 'react';
import { ApplicationStatus } from '../lib/types';

interface StatusBadgeProps {
  status: ApplicationStatus | 'Uploaded' | 'Uploading' | 'Blurry scan' | 'Unreadable';
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  let dotColor = '#6B665E';
  let bgColor = '#F2EFE9';
  let textColor = '#6B665E';

  switch (status) {
    case 'Approved':
    case 'Uploaded':
      dotColor = '#2F7D4F';
      textColor = '#2F7D4F';
      bgColor = '#EDF6F0';
      break;
    case 'Needs correction':
      dotColor = '#9A6700';
      textColor = '#9A6700';
      bgColor = '#FDF6E7';
      break;
    case 'Processing':
      dotColor = '#2B6CB0';
      textColor = '#2B6CB0';
      bgColor = '#EDF4FA';
      break;
    case 'Needs review':
      dotColor = '#6B4FA3';
      textColor = '#6B4FA3';
      bgColor = '#F3EFF9';
      break;
    case 'Rejected':
      dotColor = '#B3362E';
      textColor = '#B3362E';
      bgColor = '#FBECEB';
      break;
    case 'Uploading':
      dotColor = '#B5532C';
      textColor = '#B5532C';
      bgColor = '#FBF0EB';
      break;
    case 'Blurry scan':
    case 'Unreadable':
      dotColor = '#9A6700';
      textColor = '#9A6700';
      bgColor = '#FDF6E7';
      break;
  }

  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${paddingClass} ${className}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <span>{status}</span>
    </span>
  );
};
