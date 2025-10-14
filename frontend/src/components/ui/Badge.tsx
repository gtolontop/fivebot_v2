import React from 'react';
import { getStatusBadgeClasses } from '@/styles/design-tokens';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  status?: 'ONLINE' | 'OFFLINE' | 'STARTING' | 'STOPPING' | 'ERROR';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  status,
  size = 'md',
  dot = false,
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full border';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-0.5 text-xs gap-1.5',
  };

  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    secondary: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const statusClass = status ? getStatusBadgeClasses(status) : variantClasses[variant];

  return (
    <span
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${statusClass}
        ${className}
      `.trim()}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      )}
      {children}
    </span>
  );
};

export default Badge;
