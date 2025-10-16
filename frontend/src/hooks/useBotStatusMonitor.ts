import { useEffect, useRef } from 'react';
import { botsAPI } from '@/utils/api';

export function useBotStatusMonitor() {
  const lastStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const checkBotStatus = async () => {
      try {
        const response = await botsAPI.getAll();
        const bots = response.data || [];

        bots.forEach((bot: any) => {
          if (lastStatusRef.current[bot.id] !== bot.status) {
            lastStatusRef.current[bot.id] = bot.status;

            // Dispatch custom event
            window.dispatchEvent(
              new CustomEvent('bot-status-update', {
                detail: { botId: bot.id, status: bot.status },
              })
            );
          }
        });
      } catch (error) {
        console.error('Failed to check bot status:', error);
      }
    };

    checkBotStatus();
    const interval = setInterval(checkBotStatus, 3000);
    return () => clearInterval(interval);
  }, []);
}
