/**
 * 🎨 FiveBot Design System - Design Tokens
 *
 * Système de design unifié pour garantir la cohérence visuelle
 * à travers toute l'application.
 */

export const designTokens = {
  /**
   * 📐 Typography Scale
   */
  typography: {
    // Display (Hero sections)
    display: 'text-5xl font-bold tracking-tight leading-tight',
    displaySm: 'text-4xl font-bold tracking-tight leading-tight',

    // Headings
    h1: 'text-3xl font-semibold tracking-tight',
    h2: 'text-2xl font-semibold',
    h3: 'text-lg font-medium',
    h4: 'text-base font-medium',

    // Body
    body: 'text-sm text-gray-700',
    bodyLarge: 'text-base text-gray-700',
    bodySmall: 'text-xs text-gray-600',

    // Special
    small: 'text-xs text-gray-600',
    caption: 'text-xs text-gray-500 uppercase tracking-wider font-medium',
    code: 'font-mono text-sm',
    label: 'text-sm font-medium text-gray-700',
  },

  /**
   * 🎨 Color Palette
   */
  colors: {
    // Primary (Discord Blue)
    primary: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#5865F2', // Main brand color
      600: '#4752C4',
      700: '#3C45A5',
      800: '#313988',
      900: '#272E6B',
    },

    // Status Colors
    status: {
      online: '#10B981',    // Green
      offline: '#6B7280',   // Gray
      starting: '#F59E0B',  // Yellow
      error: '#EF4444',     // Red
      stopping: '#F97316',  // Orange
    },

    // Semantic Colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Background
    bg: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',
      tertiary: '#F3F4F6',
      hover: '#F3F4F6',
    },

    // Borders
    border: {
      light: '#F3F4F6',
      default: '#E5E7EB',
      medium: '#D1D5DB',
      dark: '#9CA3AF',
    },

    // Text
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      disabled: '#D1D5DB',
      inverse: '#FFFFFF',
    },
  },

  /**
   * 📏 Spacing Scale (8px base)
   */
  spacing: {
    0: '0',
    1: '4px',    // 0.5
    2: '8px',    // 2
    3: '12px',   // 3
    4: '16px',   // 4
    5: '20px',   // 5
    6: '24px',   // 6
    8: '32px',   // 8
    10: '40px',  // 10
    12: '48px',  // 12
    16: '64px',  // 16
    20: '80px',  // 20
    24: '96px',  // 24
  },

  /**
   * 🔲 Border Radius
   */
  radius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },

  /**
   * 🌫️ Shadows
   */
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  /**
   * 🎬 Transitions
   */
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  /**
   * 📱 Breakpoints
   */
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  /**
   * 📐 Layout Dimensions
   */
  layout: {
    sidebarWidth: '240px',
    sidebarCollapsedWidth: '64px',
    navbarHeight: '64px',
    maxContentWidth: '1400px',
  },

  /**
   * 🔤 Font Families
   */
  fonts: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  /**
   * ⚡ Z-Index Scale
   */
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },
} as const;

/**
 * 🎯 Helper function to get status color
 */
export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    ONLINE: designTokens.colors.status.online,
    OFFLINE: designTokens.colors.status.offline,
    STARTING: designTokens.colors.status.starting,
    STOPPING: designTokens.colors.status.stopping,
    ERROR: designTokens.colors.status.error,
  };

  return statusMap[status] || designTokens.colors.status.offline;
};

/**
 * 🎯 Helper function to get status badge classes
 */
export const getStatusBadgeClasses = (status: string): string => {
  const statusClasses: Record<string, string> = {
    ONLINE: 'bg-green-100 text-green-800 border-green-200',
    OFFLINE: 'bg-gray-100 text-gray-800 border-gray-200',
    STARTING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    STOPPING: 'bg-orange-100 text-orange-800 border-orange-200',
    ERROR: 'bg-red-100 text-red-800 border-red-200',
  };

  return statusClasses[status] || statusClasses.OFFLINE;
};

export default designTokens;
