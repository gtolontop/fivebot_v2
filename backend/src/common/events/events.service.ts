import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface BotStatusEvent {
  botId: string;
  status: string;
  timestamp: Date;
}

@Injectable()
export class EventsService {
  private botStatusSubject = new Subject<BotStatusEvent>();

  get botStatus$() {
    return this.botStatusSubject.asObservable();
  }

  emitBotStatusChange(botId: string, status: string) {
    this.botStatusSubject.next({
      botId,
      status,
      timestamp: new Date(),
    });
  }
}
