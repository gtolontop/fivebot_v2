import { TicketConfig, TicketCategory, TicketPanel } from '@prisma/client';

export interface TicketConfigWithArrays extends Omit<TicketConfig, 'staffRoles' | 'allowedFileTypes'> {
  staffRoles: string[];
  allowedFileTypes: string[];
  categories?: TicketCategory[];
  panels?: TicketPanel[];
}

export function parseTicketConfig(config: TicketConfig & { categories?: TicketCategory[], panels?: TicketPanel[] }): TicketConfigWithArrays {
  return {
    ...config,
    staffRoles: (config.staffRoles as string[]) || [],
    allowedFileTypes: (config.allowedFileTypes as string[]) || [],
    categories: config.categories,
    panels: config.panels
  };
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