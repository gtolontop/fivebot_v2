# 🎫 FiveBot Ticket System

A fully modular, activity-driven ticket system for Discord bots built with the FiveBot template.

## ✨ Features

### Core Features
- **Activity-Driven States**: Automatic color changes based on who sent the last message
  - 🕔 Gray: New ticket, no activity
  - 🟡 Orange: Waiting for staff response
  - 🟢 Green: Waiting for user response
  - 🔴 Red: Idle warning
- **Flexible Containers**: Support for both threads and channels
- **Auto-Management**: Automatic warnings and closure for inactive tickets
- **Staff Assignment**: Multiple assignment models (collaborative, claim-based, auto-assign)
- **Rich Notifications**: DM notifications for ticket events

### Advanced Features
- **Transcript Generation**: Export ticket conversations
- **Permission Management**: Fine-grained access control
- **Rate Limiting**: Prevent spam with cooldowns
- **Soft Delete**: 7-day recovery period for deleted tickets
- **Audit Logging**: Track all ticket actions

## 🚀 Quick Start

### 1. Run the Example Setup
```
/ticket-example
```
This command will show you a quick setup guide and can create an example configuration.

### 2. Manual Setup

#### Step 1: Configure the System
```
/ticket setup staff-role:@Support Team category:#Tickets
```
- `staff-role`: Role that can manage tickets (required)
- `category`: Category for ticket channels (optional, uses threads if not set)

#### Step 2: Create a Ticket Panel
```
/ticket panel channel:#support type:Button
```
- `channel`: Where to send the panel
- `type`: Button, Dropdown, or Hybrid

## 📖 Commands

### Admin Commands

| Command | Description | Options |
|---------|-------------|---------|
| `/ticket setup` | Configure ticket system | `staff-role`, `category` |
| `/ticket panel` | Create a ticket panel | `channel`, `type` |
| `/ticket-example` | Show setup guide | - |

### User Commands

| Command | Description | Options |
|---------|-------------|---------|
| `/ticket close` | Close current ticket | `reason` |
| `/ticket add` | Add user to ticket | `user` |
| `/ticket remove` | Remove user from ticket | `user` |

## 🎨 Panel Types

### Button Panel
- Individual buttons for each category
- Best for 1-5 categories
- Clear visual separation

### Dropdown Panel
- Select menu with all categories
- Best for many categories
- Compact design

### Hybrid Panel
- Main "Create Ticket" button
- Category selection after click
- Best for simple setups

## 🔧 Configuration Options

### Container Types

**Threads** (Default)
- Creates private threads in a hub channel
- Automatically archives when closed
- Best for: High volume, temporary issues

**Channels**
- Creates individual text channels
- Full permission control
- Best for: Complex workflows, long-term issues

### Assignment Models

**Collaborative** (Default)
- All staff can respond freely
- No ownership required
- Activity-based color changes

**Soft Claim**
- Optional ownership
- Prefer assigned staff
- Others can still help

**Strict Claim**
- Exclusive ownership
- Only assigned staff replies
- Full control

**Auto-Assign**
- System assigns based on workload
- Round-robin or least-busy
- Automatic distribution

## 🎯 Activity States Explained

The ticket system uses colors to show ticket status at a glance:

```
User creates ticket → 🕔 Gray (New)
User sends message → 🟡 Orange (Waiting for Staff)
Staff replies → 🟢 Green (Waiting for User)
No activity → 🔴 Red (Warning) → 🔒 Closed
```

## ⚙️ Advanced Configuration

### Database Models

The system uses these main tables:
- `tickets`: Core ticket information
- `ticket_messages`: Message history
- `ticket_participants`: User access
- `ticket_logs`: Audit trail
- `ticket_configs`: Guild settings

### Customization Points

1. **Naming Patterns**: Use variables like `{counter}`, `{username}`, `{date}`
2. **Timers**: Configure warning and auto-close times
3. **Permissions**: Set role-based access
4. **Notifications**: Customize DM templates

## 🔍 Troubleshooting

### Common Issues

**"Ticket system not configured"**
- Run `/ticket setup` first

**"Cannot create ticket channel"**
- Check bot permissions
- Ensure category exists
- Verify channel limits

**"User has too many tickets"**
- Default limit is 3 per user
- Close existing tickets first

### Permission Requirements

The bot needs these permissions:
- Manage Channels
- Manage Threads
- Send Messages
- Embed Links
- Read Message History
- Add Reactions

## 📊 Monitoring

### Metrics Tracked
- Total tickets created
- Average response time
- Staff workload distribution
- Auto-close rate

### Log Channel
Set up a log channel to receive:
- New ticket notifications
- Ticket closures
- Assignment changes
- System warnings

## 🛠️ Development

### Extending the System

1. **Custom States**: Add new activity states in the enum
2. **New Actions**: Extend `TicketControlsHandler`
3. **Integrations**: Use webhook events
4. **Analytics**: Query the database

### File Structure
```
src/
├── handlers/
│   ├── ticketInteraction.handler.ts
│   ├── ticketCreation.handler.ts
│   └── ticketControls.handler.ts
├── services/
│   ├── ticket.service.ts
│   ├── ticketStateManager.service.ts
│   ├── ticketPanel.service.ts
│   ├── ticketContainer.service.ts
│   ├── ticketAssignment.service.ts
│   └── ticketNotification.service.ts
├── commands/
│   ├── ticket.ts
│   └── ticketExample.ts
└── events/
    └── messageCreate.ts
```

## 📝 Examples

### Creating a Support System
```bash
# 1. Set up with support team
/ticket setup staff-role:@Support category:#Support-Tickets

# 2. Create main panel
/ticket panel channel:#create-ticket type:Button

# 3. Set up categories via dashboard
```

### Gaming Community Setup
```bash
# 1. Quick setup
/ticket-example
# Click "Create Example Setup"

# 2. Customize as needed
```

## 🤝 Contributing

The ticket system is designed to be extended. Key areas for contribution:
- New assignment algorithms
- Additional notification channels
- Custom ticket types
- Integration with external systems

## 📄 License

This ticket system is part of the FiveBot template and follows the same license terms.