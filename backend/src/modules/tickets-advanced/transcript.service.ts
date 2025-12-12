import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class TranscriptService {
  constructor(private readonly prisma: PrismaService) {}

  async generateTranscript(ticketId: string): Promise<string> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        participants: {
          where: { removedAt: null },
        },
        logs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const html = this.buildHtmlTranscript(ticket);
    return html;
  }

  async saveTranscriptToFile(ticketId: string, outputDir: string = './transcripts'): Promise<string> {
    const html = await this.generateTranscript(ticketId);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `ticket-${ticketId}-${Date.now()}.html`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, html, 'utf-8');

    return filepath;
  }

  private buildHtmlTranscript(ticket: any): string {
    const createdDate = new Date(ticket.createdAt).toLocaleString();
    const closedDate = ticket.closedAt ? new Date(ticket.closedAt).toLocaleString() : 'Still Open';

    const messagesHtml = ticket.messages
      .map((msg: any) => this.buildMessageHtml(msg))
      .join('\n');

    const logsHtml = ticket.logs
      .map((log: any) => this.buildLogHtml(log))
      .join('\n');

    const participantsHtml = ticket.participants
      .map((p: any) => `<li>${p.userId} (${p.role})</li>`)
      .join('\n');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket #${ticket.ticketNumber} - Transcript</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .header h1 {
      font-size: 2em;
      margin-bottom: 10px;
    }

    .header .subtitle {
      opacity: 0.9;
      font-size: 1.1em;
    }

    .ticket-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .info-item {
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .info-label {
      font-size: 0.85em;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .info-value {
      font-size: 1.1em;
      font-weight: 600;
      color: #333;
    }

    .priority {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: 600;
      text-transform: uppercase;
    }

    .priority-low { background: #d1ecf1; color: #0c5460; }
    .priority-medium { background: #fff3cd; color: #856404; }
    .priority-high { background: #f8d7da; color: #721c24; }
    .priority-urgent { background: #dc3545; color: white; }

    .state {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: 600;
      text-transform: uppercase;
    }

    .state-open { background: #d4edda; color: #155724; }
    .state-closed { background: #d6d8db; color: #383d41; }

    .section {
      padding: 30px;
    }

    .section-title {
      font-size: 1.5em;
      margin-bottom: 20px;
      color: #667eea;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    .messages {
      background: #f8f9fa;
    }

    .message {
      background: white;
      margin-bottom: 15px;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s;
    }

    .message:hover {
      transform: translateX(5px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .message-header {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      gap: 10px;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 1.2em;
    }

    .message-author {
      font-weight: 600;
      color: #333;
      flex: 1;
    }

    .message-time {
      font-size: 0.85em;
      color: #6c757d;
    }

    .staff-badge {
      background: #667eea;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      text-transform: uppercase;
      font-weight: 600;
    }

    .message-content {
      margin-left: 50px;
      color: #555;
      line-height: 1.6;
      word-wrap: break-word;
    }

    .attachments {
      margin-top: 10px;
      margin-left: 50px;
    }

    .attachment {
      display: inline-block;
      background: #e9ecef;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 5px 5px 5px 0;
      font-size: 0.9em;
      color: #495057;
      text-decoration: none;
    }

    .attachment:hover {
      background: #dee2e6;
    }

    .logs {
      background: #fff;
    }

    .log-entry {
      padding: 12px;
      border-left: 3px solid #667eea;
      background: #f8f9fa;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 0.95em;
    }

    .log-time {
      color: #6c757d;
      font-size: 0.85em;
      margin-right: 10px;
    }

    .log-action {
      font-weight: 600;
      color: #667eea;
    }

    .participants-list {
      list-style: none;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 10px;
    }

    .participants-list li {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }

    .rating {
      background: #fff3cd;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
      border-left: 4px solid #ffc107;
    }

    .rating-stars {
      font-size: 1.5em;
      color: #ffc107;
      margin: 10px 0;
    }

    .footer {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      color: #6c757d;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Ticket #${ticket.ticketNumber}</h1>
      <div class="subtitle">${ticket.category || 'General Support'}</div>
    </div>

    <div class="ticket-info">
      <div class="info-item">
        <div class="info-label">Ticket ID</div>
        <div class="info-value">${ticket.id}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Creator</div>
        <div class="info-value">${ticket.creatorId}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Priority</div>
        <div class="info-value">
          <span class="priority priority-${ticket.priority}">${ticket.priority}</span>
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">State</div>
        <div class="info-value">
          <span class="state state-${ticket.state}">${ticket.state}</span>
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Created</div>
        <div class="info-value">${createdDate}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Closed</div>
        <div class="info-value">${closedDate}</div>
      </div>
      ${ticket.assignedStaffId ? `
      <div class="info-item">
        <div class="info-label">Assigned Staff</div>
        <div class="info-value">${ticket.assignedStaffId}</div>
      </div>
      ` : ''}
    </div>

    <div class="section messages">
      <h2 class="section-title">Messages (${ticket.messages.length})</h2>
      ${messagesHtml || '<p style="color: #6c757d;">No messages in this ticket.</p>'}
    </div>

    ${ticket.participants.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Participants</h2>
      <ul class="participants-list">
        ${participantsHtml}
      </ul>
    </div>
    ` : ''}

    ${ticket.logs.length > 0 ? `
    <div class="section logs">
      <h2 class="section-title">Activity Log</h2>
      ${logsHtml}
    </div>
    ` : ''}

    ${ticket.feedbackRating ? `
    <div class="section">
      <div class="rating">
        <h3 style="margin-bottom: 10px;">Feedback Rating</h3>
        <div class="rating-stars">${'★'.repeat(ticket.feedbackRating)}${'☆'.repeat(5 - ticket.feedbackRating)}</div>
        <div>${ticket.feedbackRating}/5 stars</div>
      </div>
    </div>
    ` : ''}

    <div class="footer">
      Generated on ${new Date().toLocaleString()} | FiveBot Ticket System
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private buildMessageHtml(message: any): string {
    const timestamp = new Date(message.createdAt).toLocaleString();
    const authorInitial = message.authorId.charAt(0).toUpperCase();

    let attachmentsHtml = '';
    if (message.attachments) {
      try {
        const attachments = typeof message.attachments === 'string'
          ? JSON.parse(message.attachments)
          : message.attachments;

        if (Array.isArray(attachments) && attachments.length > 0) {
          attachmentsHtml = `
            <div class="attachments">
              ${attachments.map((att: any) => `
                <a href="${att.url}" class="attachment" target="_blank">
                  📎 ${att.filename || att.name || 'Attachment'}
                </a>
              `).join('')}
            </div>
          `;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return `
    <div class="message">
      <div class="message-header">
        <div class="avatar">${authorInitial}</div>
        <div class="message-author">
          ${message.authorId}
          ${message.isStaff ? '<span class="staff-badge">Staff</span>' : ''}
        </div>
        <div class="message-time">${timestamp}</div>
      </div>
      <div class="message-content">${this.escapeHtml(message.content)}</div>
      ${attachmentsHtml}
    </div>
    `;
  }

  private buildLogHtml(log: any): string {
    const timestamp = new Date(log.createdAt).toLocaleString();

    return `
    <div class="log-entry">
      <span class="log-time">${timestamp}</span>
      <span class="log-action">${log.action}</span>
      ${log.details ? `- ${this.escapeHtml(log.details)}` : ''}
      <span style="color: #6c757d;"> by ${log.performedBy}</span>
    </div>
    `;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
