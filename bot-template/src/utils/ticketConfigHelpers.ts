import { TicketConfig, TicketCategory, TicketPanel } from '@prisma/client';

export interface TicketConfigWithArrays extends Omit<TicketConfig, 'staffRoles' | 'allowedFileTypes'> {
  staffRoles: string[];
  allowedFileTypes: string[];
  categories?: TicketCategory[];
  panels?: TicketPanel[];
  ticketButtons?: {
    close?: boolean;
    claim?: boolean;
    unclaim?: boolean;
    addMember?: boolean;
    removeMember?: boolean;
    transcript?: boolean;
    lock?: boolean;
    transfer?: boolean;
  };
  closeOptions?: {
    showTranscript?: boolean;
    showReopen?: boolean;
    showDelete?: boolean;
  };
}

export function parseTicketConfig(config: TicketConfig & { categories?: TicketCategory[], panels?: TicketPanel[] }): TicketConfigWithArrays {
  const parsed: any = {
    ...config,
    staffRoles: (config.staffRoles as string[]) || [],
    allowedFileTypes: (config.allowedFileTypes as string[]) || [],
    categories: config.categories,
    panels: config.panels
  };
  
  // Parse JSON fields if they're strings
  if (typeof config.ticketButtons === 'string') {
    try {
      parsed.ticketButtons = JSON.parse(config.ticketButtons);
    } catch {
      parsed.ticketButtons = {};
    }
  } else {
    parsed.ticketButtons = config.ticketButtons || {};
  }
  
  if (typeof config.closeOptions === 'string') {
    try {
      parsed.closeOptions = JSON.parse(config.closeOptions);
    } catch {
      parsed.closeOptions = {};
    }
  } else {
    parsed.closeOptions = config.closeOptions || {};
  }
  
  return parsed;
}

export function serializeTicketConfig(config: Partial<TicketConfigWithArrays>): any {
  const result: any = { ...config };
  
  if (config.staffRoles !== undefined) {
    result.staffRoles = config.staffRoles;
  }
  
  if (config.allowedFileTypes !== undefined) {
    result.allowedFileTypes = config.allowedFileTypes;
  }
  
  return result;
}