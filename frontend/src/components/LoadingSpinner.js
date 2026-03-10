import React from 'react';
import { cn } from '../utils/helpers';

export default function LoadingSpinner({ size = 'md' }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-4',
  };
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-gray-300 border-t-gray-900',
        sizes[size] || sizes.md
      )}
    />
  );
}
