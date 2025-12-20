import React from 'react';

// Stack item type
export interface StackItem {
  name: string;
  icon: string; // URL or emoji
  color?: string;
}

// Predefined tech stacks with their brand colors
export const TECH_STACKS: Record<string, StackItem> = {
  // IDEs & Editors
  vscode: { name: 'VS Code', icon: '💻', color: '#007ACC' },
  eclipse: { name: 'Eclipse', icon: '🌙', color: '#2C2255' },
  intellij: { name: 'IntelliJ', icon: '🧠', color: '#000000' },
  
  // Design
  figma: { name: 'Figma', icon: '🎨', color: '#F24E1E' },
  behance: { name: 'Behance', icon: '🅱️', color: '#1769FF' },
  photoshop: { name: 'Photoshop', icon: '📷', color: '#31A8FF' },
  illustrator: { name: 'Illustrator', icon: '✏️', color: '#FF9A00' },
  
  // Languages
  javascript: { name: 'JavaScript', icon: '⚡', color: '#F7DF1E' },
  typescript: { name: 'TypeScript', icon: '📘', color: '#3178C6' },
  python: { name: 'Python', icon: '🐍', color: '#3776AB' },
  java: { name: 'Java', icon: '☕', color: '#ED8B00' },
  csharp: { name: 'C#', icon: '🔷', color: '#512BD4' },
  cpp: { name: 'C++', icon: '⚙️', color: '#00599C' },
  rust: { name: 'Rust', icon: '🦀', color: '#CE412B' },
  go: { name: 'Go', icon: '🐹', color: '#00ADD8' },
  php: { name: 'PHP', icon: '🐘', color: '#777BB4' },
  
  // Frontend
  html: { name: 'HTML', icon: '🌐', color: '#E34F26' },
  css: { name: 'CSS', icon: '🎨', color: '#1572B6' },
  react: { name: 'React', icon: '⚛️', color: '#61DAFB' },
  vue: { name: 'Vue.js', icon: '💚', color: '#4FC08D' },
  angular: { name: 'Angular', icon: '🅰️', color: '#DD0031' },
  nextjs: { name: 'Next.js', icon: '▲', color: '#000000' },
  tailwind: { name: 'Tailwind', icon: '🌊', color: '#06B6D4' },
  sass: { name: 'Sass', icon: '💅', color: '#CC6699' },
  
  // Backend & Runtime
  nodejs: { name: 'Node.js', icon: '🟢', color: '#339933' },
  express: { name: 'Express', icon: '🚂', color: '#000000' },
  django: { name: 'Django', icon: '🎸', color: '#092E20' },
  flask: { name: 'Flask', icon: '🧪', color: '#000000' },
  spring: { name: 'Spring', icon: '🌱', color: '#6DB33F' },
  
  // Databases
  mongodb: { name: 'MongoDB', icon: '🍃', color: '#47A248' },
  postgresql: { name: 'PostgreSQL', icon: '🐘', color: '#4169E1' },
  mysql: { name: 'MySQL', icon: '🐬', color: '#4479A1' },
  redis: { name: 'Redis', icon: '🔴', color: '#DC382D' },
  firebase: { name: 'Firebase', icon: '🔥', color: '#FFCA28' },
  
  // DevOps & Tools
  docker: { name: 'Docker', icon: '🐳', color: '#2496ED' },
  kubernetes: { name: 'Kubernetes', icon: '☸️', color: '#326CE5' },
  git: { name: 'Git', icon: '📦', color: '#F05032' },
  github: { name: 'GitHub', icon: '🐙', color: '#181717' },
  aws: { name: 'AWS', icon: '☁️', color: '#FF9900' },
  linux: { name: 'Linux', icon: '🐧', color: '#FCC624' },
};

export interface StackProps {
  items: (keyof typeof TECH_STACKS | StackItem)[];
  title?: string;
  variant?: 'grid' | 'inline' | 'compact';
  showLabels?: boolean;
  className?: string;
}

export const Stack: React.FC<StackProps> = ({
  items,
  title,
  variant = 'grid',
  showLabels = true,
  className = '',
}) => {
  const resolveItem = (item: keyof typeof TECH_STACKS | StackItem): StackItem => {
    if (typeof item === 'string') {
      return TECH_STACKS[item] || { name: item, icon: '📦', color: '#6B7280' };
    }
    return item;
  };

  const containerClasses = {
    grid: 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3',
    inline: 'flex flex-wrap gap-2',
    compact: 'flex flex-wrap gap-1.5',
  };

  const itemClasses = {
    grid: 'flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100 transition-all duration-200',
    inline: 'flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100',
    compact: 'flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-xs',
  };

  const iconSizes = {
    grid: 'text-2xl',
    inline: 'text-lg',
    compact: 'text-sm',
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🛠️</span>
          <h3 className="text-base font-medium text-gray-900">{title}</h3>
        </div>
      )}
      
      <div className={containerClasses[variant]}>
        {items.map((item, index) => {
          const resolved = resolveItem(item);
          return (
            <div
              key={index}
              className={itemClasses[variant]}
              style={{ 
                '--stack-color': resolved.color || '#6B7280' 
              } as React.CSSProperties}
            >
              <span 
                className={iconSizes[variant]}
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
              >
                {resolved.icon}
              </span>
              {showLabels && (
                <span className={`font-medium text-gray-700 ${variant === 'grid' ? 'text-xs mt-1.5 text-center' : ''}`}>
                  {resolved.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Stack;
