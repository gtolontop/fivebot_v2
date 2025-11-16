export interface EmbedV2Component {
  id: number;
  type: number;
  content?: string;
  style?: number;
  label?: string;
  emoji?: string;
  url?: string;
  custom_id?: string;
  divider?: boolean;
  spacing?: number;
  components?: EmbedV2Component[];
  items?: Array<{
    media?: {
      url: string;
    };
    description?: string;
    spoiler?: boolean;
  }>;
}

export interface EmbedV2Container {
  id: number;
  type: 17;
  components: EmbedV2Component[];
}

export interface CustomCommand {
  name: string;
  description: string;
  enabled: boolean;
  useEmbedV2?: boolean;
  embedV2Data?: EmbedV2Container[];
  // Legacy embed support
  response?: string;
  embed?: {
    title?: string;
    description?: string;
    color?: string;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    footer?: {
      text: string;
      icon_url?: string;
    };
    image?: {
      url: string;
    };
    thumbnail?: {
      url: string;
    };
  };
}