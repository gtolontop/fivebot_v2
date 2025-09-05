export interface ErrorMessage {
  en: string;
  fr: string;
}

export const TicketErrorMessages = {
  // Configuration errors
  NO_CONFIG: {
    en: 'The ticket system is not configured. Please ask an administrator to set it up in the dashboard.',
    fr: 'Le système de tickets n\'est pas configuré. Veuillez demander à un administrateur de le configurer dans le tableau de bord.'
  },
  
  SYSTEM_DISABLED: {
    en: 'The ticket system is currently disabled. Please contact an administrator.',
    fr: 'Le système de tickets est actuellement désactivé. Veuillez contacter un administrateur.'
  },
  
  NO_THREAD_CHANNEL: {
    en: 'Thread mode is enabled but no channel is configured for creating threads. Please configure a text channel in the dashboard.',
    fr: 'Le mode fil est activé mais aucun canal n\'est configuré pour créer des fils. Veuillez configurer un canal texte dans le tableau de bord.'
  },
  
  INVALID_THREAD_CHANNEL: {
    en: 'The configured thread container channel is invalid or no longer exists. Please update the configuration.',
    fr: 'Le canal conteneur de fils configuré est invalide ou n\'existe plus. Veuillez mettre à jour la configuration.'
  },
  
  NO_CATEGORY: {
    en: 'Channel mode is enabled but no category is set. Tickets will be created in the main server area.',
    fr: 'Le mode canal est activé mais aucune catégorie n\'est définie. Les tickets seront créés dans la zone principale du serveur.'
  },
  
  INVALID_CATEGORY: {
    en: 'The configured support category is invalid or no longer exists. Tickets will be created without a category.',
    fr: 'La catégorie de support configurée est invalide ou n\'existe plus. Les tickets seront créés sans catégorie.'
  },
  
  // User limit errors
  MAX_TICKETS_REACHED: {
    en: 'You have reached the maximum number of active tickets ({limit}). Please close an existing ticket before creating a new one.',
    fr: 'Vous avez atteint le nombre maximum de tickets actifs ({limit}). Veuillez fermer un ticket existant avant d\'en créer un nouveau.'
  },
  
  // Category errors
  CATEGORY_NOT_FOUND: {
    en: 'The selected category does not exist or has been removed.',
    fr: 'La catégorie sélectionnée n\'existe pas ou a été supprimée.'
  },
  
  CATEGORY_INACTIVE: {
    en: 'The selected category is currently inactive. Please choose another category or contact an administrator.',
    fr: 'La catégorie sélectionnée est actuellement inactive. Veuillez choisir une autre catégorie ou contacter un administrateur.'
  },
  
  NO_ACTIVE_CATEGORIES: {
    en: 'No ticket categories are currently available. You can create a general support ticket.',
    fr: 'Aucune catégorie de ticket n\'est actuellement disponible. Vous pouvez créer un ticket de support général.'
  },
  
  // Permission errors
  NO_PERMISSION: {
    en: 'You do not have permission to create tickets in this server.',
    fr: 'Vous n\'avez pas la permission de créer des tickets dans ce serveur.'
  },
  
  MISSING_STAFF_ROLES: {
    en: 'No staff roles are configured. Only server administrators can manage tickets.',
    fr: 'Aucun rôle de personnel n\'est configuré. Seuls les administrateurs du serveur peuvent gérer les tickets.'
  },
  
  // Channel/Thread errors
  CHANNEL_CREATE_FAILED: {
    en: 'Failed to create ticket channel. Please ensure the bot has the necessary permissions.',
    fr: 'Échec de la création du canal de ticket. Veuillez vous assurer que le bot a les permissions nécessaires.'
  },
  
  THREAD_CREATE_FAILED: {
    en: 'Failed to create ticket thread. Please ensure the bot has permission to create threads in this channel.',
    fr: 'Échec de la création du fil de ticket. Veuillez vous assurer que le bot a la permission de créer des fils dans ce canal.'
  },
  
  // General errors
  CREATION_FAILED: {
    en: 'Failed to create ticket. Please try again later or contact an administrator.',
    fr: 'Échec de la création du ticket. Veuillez réessayer plus tard ou contacter un administrateur.'
  },
  
  DATABASE_ERROR: {
    en: 'A database error occurred. Please try again later.',
    fr: 'Une erreur de base de données s\'est produite. Veuillez réessayer plus tard.'
  },
  
  UNKNOWN_ERROR: {
    en: 'An unknown error occurred. Please try again later.',
    fr: 'Une erreur inconnue s\'est produite. Veuillez réessayer plus tard.'
  }
};

/**
 * Get error message in the specified locale
 */
export function getErrorMessage(key: keyof typeof TicketErrorMessages, locale: 'en' | 'fr' = 'en', replacements?: Record<string, string>): string {
  const message = TicketErrorMessages[key][locale];
  
  if (!replacements) return message;
  
  let result = message;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(`{${key}}`, value);
  }
  
  return result;
}

/**
 * Format error with emoji prefix
 */
export function formatError(message: string): string {
  return `❌ ${message}`;
}

/**
 * Format warning with emoji prefix
 */
export function formatWarning(message: string): string {
  return `⚠️ ${message}`;
}

/**
 * Format success with emoji prefix
 */
export function formatSuccess(message: string): string {
  return `✅ ${message}`;
}

/**
 * Format info with emoji prefix
 */
export function formatInfo(message: string): string {
  return `ℹ️ ${message}`;
}