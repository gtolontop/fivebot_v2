import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'stat' | 'panel' | 'interactive';
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  onClick,
  hover = false,
}) => {
  const baseClasses = 'bg-white rounded-xl border border-gray-200 shadow-sm';

  const variantClasses = {
    default: 'p-6',
    stat: 'p-6',
    panel: 'overflow-hidden',
    interactive: 'p-6 cursor-pointer hover:border-primary-500 hover:shadow-md transition-all',
  };

  const hoverClass = hover && variant !== 'interactive' ? 'hover:shadow-md transition-shadow' : '';
  const clickableClass = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${hoverClass}
        ${clickableClass}
        ${className}
      `.trim()}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  sublabel?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  change,
  trend,
  sublabel,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  const trendClasses = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <Card variant="stat">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-gray-500 mt-1">
              {sublabel}
            </p>
          )}
          {change && trend && (
            <p className={`text-xs font-medium mt-1 ${trendClasses[trend]}`}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export interface PanelCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const PanelCard: React.FC<PanelCardProps> = ({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
}) => {
  return (
    <Card variant="panel" className={className}>
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <div>
            <h3 className="text-base font-medium text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </Card>
  );
};

export default Card;
