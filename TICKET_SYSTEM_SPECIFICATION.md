# 🎫 FiveBot Template — Universal Modular Ticketing System Specification

> **Note**: This is the specification for the ticketing system in the FiveBot template. All configuration is done through the FiveBot web dashboard, not through config files.

## 🚀 Executive Summary

### What is this?
A **fully modular ticket system** where every aspect can be customized through a web dashboard. Think of it as "Lego blocks" for support tickets.

### Key Features
- 🎨 **Visual State System**: Tickets change color based on activity (gray → orange → green)
- 🤖 **Smart Automation**: Auto-close, warnings, escalation rules
- 👥 **Flexible Staff Models**: From free-for-all to strict assignment
- 🔧 **Zero Code Config**: Everything configured via dashboard

### Visual Flow
```
User Creates Ticket → 🕔 Gray (New)
        ↓
User Sends Message → 🟡 Orange (Waiting for Staff)
        ↓
Staff Replies → 🟢 Green (Waiting for User)
        ↓
[Cycles based on who replies last]
        ↓
No Activity → 🔴 Red (Idle) → ⚠️ Warning → 🔒 Auto-Close
```

### Quick Start
1. Choose a **preset** (Minimal, Gaming, Enterprise)
2. Customize via **dashboard wizards**
3. Enable/disable **modules** as needed
4. Deploy and monitor

---

## 📚 Table of Contents

### Core Concepts
- [Core Philosophy](#-core-philosophy)
- [System Architecture](#-system-architecture-overview)
- [Core Components](#-core-components-deep-dive)

### Configuration
- [Lifecycle Engine](#3-dynamic-lifecycle-engine)
- [Assignment Models](#4-assignment-models)
- [Automation](#8-automation-engine)
- [Presets](#-configuration-presets-dashboard)

### Advanced Topics
- [Advanced Considerations](#-advanced-considerations)
- [Developer Checklist](#-developer-implementation-checklist)
- [Future Roadmap](#-future-roadmap)

---

## 🎯 Core Philosophy

This ticketing system is designed with **infinite modularity** at its core:

- **Everything is configurable via web dashboard**: Every feature, message, behavior, and workflow can be customized through the FiveBot dashboard
- **No hardcoded assumptions**: Names, categories, states, and actions are all dynamic
- **Multiple paradigms coexist**: Different operational modes can be mixed and matched
- **Lego-like assembly**: Guilds build their perfect ticketing system by enabling/disabling modules in the dashboard

---

## 📐 System Architecture Overview

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    TICKET SYSTEM CORE                        │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌──────────┐  ┌─────────┐  ┌────────────┐ │
│  │   Entry   │  │Container │  │Lifecycle│  │  Controls  │ │
│  │  Points   │  │  Models  │  │ Engine  │  │& Actions   │ │
│  └───────────┘  └──────────┘  └─────────┘  └────────────┘ │
│  ┌───────────┐  ┌──────────┐  ┌─────────┐  ┌────────────┐ │
│  │Assignment │  │   Staff  │  │   Auto  │  │Notification│ │
│  │  Models   │  │Categories│  │ Manager │  │   Engine   │ │
│  └───────────┘  └──────────┘  └─────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Core Components Deep Dive

### 1. Entry Points System

#### Panel Types
- **Button-based**: Direct action buttons with customizable labels and emojis
- **Dropdown-based**: Select menus with categories/reasons
- **Hybrid**: Mix of buttons and dropdowns
- **Command-based**: Direct slash commands (can coexist with panels)

#### Panel Customization (via Dashboard)

**Dashboard Configuration Options:**
- **Panel Type**: Choose between buttons, dropdown, or hybrid
- **Embed Settings**: 
  - Title (with variables like {guild.name})
  - Description 
  - Color picker
  - Footer text
  - Thumbnail options
- **Components Builder**:
  - Drag-and-drop interface for buttons/dropdowns
  - Label and emoji customization
  - Style selection (primary, danger, success, etc.)
  - Routing configuration
  - Modal form builder

#### Routing Logic
- Direct ticket creation
- Modal forms for structured input
- Category-based routing
- Tag application
- Priority assignment
- Staff group routing

#### Per-Ticket-Type Customization

Each ticket type can have completely different configurations:

**Dashboard Ticket Type Builder:**

- **Report Tickets**:
  - Panel: Button-based interface
  - Custom buttons with labels/emojis
  - Lifecycle: Can use escalation rules
  - Assignment: Claim-only mode

- **Support Tickets**:
  - Panel: Dropdown menu
  - Options configured in dashboard
  - Lifecycle: Activity-driven (auto color changes)
  - Assignment: All staff can respond

- **Partnership Tickets**:
  - Panel: Modal with custom fields
  - Form builder for required info
  - Lifecycle: Traditional assignment
  - Assignment: Round-robin distribution

---

### 2. Container Models

#### Storage Modes

| Mode | Description | Best For |
|------|-------------|----------|
| **Threads** | Creates threads in hub channel | Clean UI, temporary issues |
| **Channels** | Creates channels in categories | Persistent issues, complex workflows |
| **Hybrid** | Threads for simple, channels for complex | Flexible organizations |

#### Naming Patterns

**Available Variables:**
- `{counter}` - Sequential number
- `{uuid}` - Unique identifier
- `{username}` - Ticket creator's name
- `{userid}` - Ticket creator's ID
- `{category}` - Ticket category
- `{date}` - Creation date
- `{time}` - Creation time
- `{staff}` - Assigned staff (if any)
- `{priority}` - Priority level
- `{tag}` - Primary tag

**Examples:**
- `ticket-{counter}` → `ticket-0042`
- `{emoji}・{username}` → `🎫・john_doe`
- `{category}-{date}-{uuid}` → `support-2024-01-15-abc123`

---

### 3. Dynamic Lifecycle Engine

#### State-Based System

**Core Concept**: Lifecycle is a flexible state machine driven by configurable rules. States are **activity-driven** by default, not requiring manual claims or assignments.

**Important**: **Delete is NOT a lifecycle state** - it's a destructive action that removes the ticket entirely from the system.

#### Activity-Driven States (Default)

**Pure Activity Mode** (No claim required - color changes automatically):
- 🕔 **Gray**: New ticket, no replies yet
- 🟡 **Orange**: Last message from user (waiting for staff)
- 🟢 **Green**: Last message from staff (waiting for user)  
- 💤 **Red**: Idle (no activity for X hours)
- 🔒 **Closed**: Ticket closed

**Dashboard Settings for Activity Mode:**
- Enable/disable automatic color changes
- Set idle timeout (1h, 6h, 24h, 72h, custom)
- Choose whether any staff can reply (collaborative) or require claim first
- Configure warning messages before auto-close

#### Classic Assignment Mode (Optional)

**Traditional Claim System**:
- 🕔 **Unclaimed**: New ticket awaiting staff
- 👤 **Assigned**: Staff member claimed the ticket
- ↔️ **Transferred**: Ticket moved to different staff
- 🔒 **Closed**: Ticket resolved

**Dashboard Settings for Assignment Mode:**
- Require claim before replying
- Show owner in ticket name/channel
- Allow transfer between staff
- Configure claim notifications

#### Trigger Configuration (Dashboard)

**Message-Based Triggers:**
- ✅ Auto-change to green when staff replies
- ✅ Auto-change to orange when user replies
- ✅ Define which roles count as "staff"
- ✅ Optional: Ignore bot messages

**Time-Based Triggers:**
- ✨ Set inactivity thresholds
- ✨ Configure warning messages
- ✨ Auto-close after X hours/days
- ✨ Different timeouts per ticket type

**Action-Based Triggers (if enabled):**
- 🔄 State changes on claim/transfer
- 🔄 Permissions update automatically
- 🔄 Notification preferences

---

### 4. Assignment Models 

#### Multi-Staff Interaction Models

| Model | Description | How it Works | Dashboard Config |
|-------|-------------|--------------|------------------|
| **Open Collaboration** | All staff reply freely | No ownership, pure activity-driven colors | Default for support servers |
| **Soft Claim** | Optional ownership | Staff can claim but others still reply | Hybrid approach |
| **Strict Claim** | Exclusive ownership | Only claimed staff can reply | Traditional moderation |
| **Auto-Assign** | System assigns | Based on availability/workload | Enterprise feature |
| **No Assignment** | Pure activity tracking | Just tracks who replied last | Minimal setup |

#### Dashboard Configuration Panel

**Assignment Settings:**
- 🎆 **Mode Selection**: Choose from dropdown
- 👥 **Collaboration Level**: 
  - Anyone can reply
  - Only claimed staff + admins
  - Claimed staff only
- 🎯 **Auto-Assignment Rules**:
  - Round-robin distribution
  - Least busy staff
  - Category-based routing
- 🔔 **Notifications**:
  - Ping on new tickets
  - DM on assignment
  - Alert on transfer

---

### 5. Staff Organization

#### Category Models

**Per-Staff Categories:**
```
📁 Staff Tickets
  └── 📁 John's Tickets
      ├── 🎫 ticket-001
      └── 🎫 ticket-015
  └── 📁 Sarah's Tickets
      ├── 🎫 ticket-008
      └── 🎫 ticket-023
```

**Shared Pool:**
```
📁 Active Tickets
  ├── 🟢 waiting-user-042
  ├── 🟡 needs-staff-071
  └── 🔴 escalated-003
```

**Role-Based:**
```
📁 Support Tickets
  └── 📁 Technical Issues
  └── 📁 Account Issues
  └── 📁 Billing Queries
```

---

### 6. Notification System

#### DM Templates

**Configurable Variables:**
- `{ticket.id}` - Ticket identifier
- `{ticket.link}` - Jump URL
- `{staff.name}` - Staff member name
- `{staff.mention}` - Staff mention
- `{user.name}` - User name
- `{action}` - Action performed
- `{old_state}` - Previous state
- `{new_state}` - New state
- `{reason}` - Reason (if provided)
- `{timestamp}` - Action timestamp

**Template Examples:**
```yaml
notifications:
  on_create:
    enabled: true
    template: |
      🎫 **Ticket Created**
      Your support ticket `{ticket.id}` has been created.
      
      A staff member will assist you shortly.
      {ticket.link}
  
  on_staff_reply:
    enabled: true
    template: |
      💬 **New Response**
      {staff.name} has responded to your ticket.
      {ticket.link}
```

---

### 7. Control Interface

#### Available Actions (Dashboard Toggles)

| Action | Description | Dashboard Setting |
|--------|-------------|------------------|
| **Create** | Open new ticket | Entry panel builder |
| **Claim** | Take ownership | Enable/disable per mode |
| **Release** | Give up ownership | Auto-return to pool |
| **Transfer** | Change owner | Staff selector type |
| **Invite** | Add participants | Time limits, role limits |
| **Close** | End active support | Custom close message |
| **Reopen** | Reactivate closed | Time window setting |
| **Archive** | Move to storage | Auto-archive delay |
| **Delete** | Remove permanently | Permission level |

**Important**: Delete is a **destructive action**, not a state. It permanently removes the ticket.

#### Dashboard Interface Builder

**Control Display Options:**
- 🎯 **Layout Style**: Buttons, dropdown, or slash commands
- 📍 **Button Positioning**: Below messages or in separate embed
- ✅ **Confirmations**: 
  - Simple click
  - "Are you sure?" modal
  - Double confirmation for delete
- 🎨 **Custom Actions**:
  - Add custom buttons
  - Set emojis and colors
  - Link to specific workflows

---

### 8. Automation Engine

#### Auto-Management (Dashboard Settings)

**Auto-Close Settings:**
- 🕒 **Idle Timer**: Set hours/days before auto-close
- ⚠️ **Warning System**:
  - Send warning before closing
  - Customizable warning message
  - Warning lead time
- 🚫 **Exclusions**: States that prevent auto-close
- 💬 **Close Message**: Custom message template

**Smart Escalation Rules:**
- ⏰ **Time-Based**:
  - "If unclaimed for 30 minutes → ping senior staff"
  - "If idle in 'waiting for staff' for 2 hours → escalate"
- 🔍 **Keyword Detection**:
  - Define trigger words (urgent, emergency, legal)
  - Auto-route to specialized teams
  - Add priority tags
- 📈 **Load Balancing**:
  - Redistribute if staff has too many tickets
  - Auto-assign based on availability

---

## 🎨 Customization Framework

### Visual Customization (Dashboard)

**Theme Builder:**
- 🎨 **Color Picker**: Choose colors for each state
- 😀 **Emoji Selector**: 
  - Default emojis
  - Custom server emojis
  - Unicode emoji picker
- 🖌️ **Embed Designer**:
  - Live preview
  - Variable insertion
  - Template library

### Language Customization (Dashboard)

**Terminology Settings:**
- 📝 **Nouns**: ticket/case/issue/request
- 🎯 **Verbs**: open/create/submit/start
- 👥 **Roles**: staff/agent/moderator/support
- 🌐 **Translations**: Multi-language support

---

## 🔧 Configuration Presets (Dashboard)

### Preset: Minimal Support
- **Container**: Threads in single channel
- **Lifecycle**: Pure activity-driven (green/orange)
- **Controls**: Just close button
- **Assignment**: Everyone can reply
- **Auto-close**: After 48h idle

### Preset: Enterprise Helpdesk  
- **Container**: Channels with departments
- **Lifecycle**: SLA-driven with timers
- **Controls**: Full suite with escalation
- **Assignment**: Round-robin with skills
- **Integration**: Webhooks & analytics

### Preset: Gaming Community
- **Container**: Hybrid (threads + channels)
- **Entry**: Quick report buttons
- **Lifecycle**: Activity + priority tags
- **Assignment**: Skill-based routing
- **Features**: Achievements, streaks

---

## 📊 Lifecycle Configuration Matrix

### State Transition Rules

| Event | Current State | Next State | Condition |
|-------|--------------|------------|-----------|
| **Ticket Created** | - | 🕔 Gray (New) | Always |
| **User Message** | Any active | 🟡 Orange | Not closed |
| **Staff Message** | Any active | 🟢 Green | Not closed |
| **Multiple User Messages** | Orange | 🟡 Stays Orange | Consecutive |
| **Multiple Staff Messages** | Green | 🟢 Stays Green | Consecutive |
| **No Activity** | Green/Orange | 🔴 Red (Idle) | After timeout |
| **Close Action** | Any | 🔒 Closed | Permission check |
| **Delete Action** | Any | ❌ Removed | Higher permission |

### Activity-Driven Flow Example

```
User creates ticket → 🕔 Gray
User adds details → 🟡 Orange (waiting for staff)
User adds more info → 🟡 Still Orange
Staff member replies → 🟢 Green (waiting for user)
Different staff adds note → 🟢 Still Green
User responds → 🟡 Orange again
[24h no activity] → 🔴 Red (idle warning sent)
[48h total] → 🔒 Auto-closed
```

**Key Point**: Assignment (claim) and activity colors are **independent systems**!

---

## 🚀 Advanced Features

### Web Dashboard Integration
- Real-time ticket status
- Historical analytics
- SLA tracking
- Staff performance metrics
- Export capabilities

### API Endpoints
- REST API for external integrations
- Webhook events for all state changes
- Bulk operations support
- Custom automation scripts

### Multi-Server Sync
- Shared ban appeals across servers
- Cross-server ticket routing
- Unified staff dashboard
- Synchronized user history

---

## 📋 Implementation Priorities

1. **Core State Machine** - Activity-driven lifecycle engine
2. **Dashboard Integration** - All config via web interface
3. **Modular Components** - Enable/disable any feature
4. **Database Backend** - Scalable ticket storage
5. **Real-time Updates** - WebSocket state changes
6. **API Layer** - Dashboard ↔ Bot communication
7. **Analytics Engine** - Usage metrics & reporting
8. **Permission System** - Flexible access control

---

## 🎯 Success Metrics

- **Flexibility**: Can adapt to any server's workflow
- **Simplicity**: Easy to understand and configure
- **Performance**: Handles high-volume servers
- **Reliability**: Consistent across restarts/updates
- **Extensibility**: New features don't break existing setups

---

## 🔍 Critical Implementation Details

### Consecutive Message Handling

**Activity-Driven State Updates:**
- **Multiple user messages** → Stays orange (waiting for staff)
- **Multiple staff messages** → Stays green (waiting for user)
- **User → Staff → User** → Properly cycles orange → green → orange
- **Any staff member reply** → Changes to green (not just assigned staff)

**Edge Cases Handled:**
- Bot messages are ignored for state changes
- System messages (joins/leaves) don't affect state
- Attachments without text still count as messages
- Reactions don't trigger state changes (configurable)

### Assignment vs Activity Independence

**Key Principle**: Assignment and activity states are **completely independent**.

```
Examples:
- Unclaimed ticket + user message = Gray → Orange (no claim needed)
- Claimed ticket + any staff reply = Still changes to green
- Activity colors work even in strict claim mode
- Claim only affects WHO can close/transfer, not color logic
```

### Preset Management

**Dashboard Preset Features:**
- **Clone & Customize**: Start from preset, modify anything
- **Save as Template**: Turn your config into shareable preset
- **Import/Export**: JSON format for backup/sharing
- **A/B Testing**: Run different configs in different categories
- **Rollback**: Undo recent changes with version history

### Multi-Ticket & Multi-Staff Scenarios

**Auto-Close Behavior:**
- **Per-Ticket Timers**: Each ticket has independent idle timer
- **Staff-Specific**: Warnings can DM assigned staff or all participants
- **Bulk Operations**: Close all idle tickets with one command
- **Smart Exclusions**: Skip tickets with specific tags/states

**Warning System Logic:**
```
1. Ticket idle for (threshold - warning_time)
2. Send warning to: ticket channel + user DM + assigned staff
3. If activity → reset timer completely
4. If still idle → auto-close at threshold
5. Log action for audit trail
```

**Multi-Staff Coordination:**
- **Claim Mode**: Warnings go to claimed staff only
- **Collaborative**: Warnings go to all staff who participated
- **Activity Mode**: Warnings based on last responder
- **Escalation**: Can auto-ping different role if no response to warning

---

## 🔧 Advanced Considerations

### ⚠️ Implementation Safeguards & Edge Cases

### 1. Activity vs Assignment Coherence

**Resolution Strategy:**
```
IF activity_mode_enabled:
    Color changes based on last message author
    IF claim_mode_also_enabled:
        Notifications respect claim (warnings → claimed staff)
        BUT colors still change based on activity
    ELSE:
        Notifications go to all participating staff
```

**Example**: Claimed ticket where different staff replies → Color changes to green, but close permission stays with claimed staff.

### 2. Message Type Handling

**What Counts as Activity:**
- ✅ Text messages
- ✅ Messages with attachments (even without text)
- ✅ Embed messages from staff
- ❌ Reactions (unless configured)
- ❌ System messages (joins/leaves)
- ❌ Bot messages (unless whitelisted)

**Keyword Triggers:**
- Only scan actual message content
- Ignore attachment names for security
- Case-insensitive matching
- Regex support with sanitization

### 3. Multi-Staff Notification Logic

```python
def determine_notification_targets(ticket):
    if ticket.mode == "claimed":
        return [ticket.claimed_staff]
    elif ticket.mode == "collaborative":
        return ticket.all_participating_staff
    elif ticket.mode == "activity":
        return [ticket.last_responder]
    else:  # fallback
        return ticket.all_staff_with_access
```

### 4. Load Balancing Metrics

**"Busy" Calculation:**
- ✅ Count: Active tickets (new, waiting, in-progress)
- ❌ Exclude: Closed, archived, deleted tickets
- ⚖️ Weight: Priority tickets count as 2x
- 📊 Time-based: Recent activity weighted higher

### 5. Timer Conflict Resolution

**Multiple Timer Handling:**
```
Each ticket maintains:
- creation_time
- last_activity_time
- warning_sent_time
- state_change_times[]

Timer checks run every minute:
- IF (now - last_activity) > idle_threshold AND !warning_sent:
    Send warning, set warning_sent_time
- IF (now - last_activity) > close_threshold:
    Auto-close (even if warning failed)
```

**Activity During Warning:**
- Any new message → Reset ALL timers
- State change → Reset activity timer only
- Close/reopen → Clear all timers

### 6. Channel Naming Security

**Discord Limits:**
- Maximum channel name length: **100 characters**
- Allowed characters: `a-z`, `0-9`, `-`, `_`
- No spaces, special chars, or unicode

**Variable Sanitization:**
```javascript
function sanitize_for_channel_name(text, maxLength = 50) {
    // Reserve space for prefix/suffix (e.g., "ticket-" = 7 chars)
    const safeLength = Math.min(maxLength, 93);
    
    return text
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')  // Only safe chars
        .replace(/--+/g, '-')           // No double dashes
        .substring(0, safeLength)       // Respect Discord limit
        .replace(/^-|-$/g, '');         // No leading/trailing dash
}

// UUID format options
const UUID_FORMATS = {
    short: () => Math.random().toString(36).substr(2, 6),     // "a1b2c3"
    medium: () => Date.now().toString(36),                     // "kx3j4n5"
    full: () => crypto.randomUUID().split('-')[0]             // "f47ac10b"
};
```

**Fallback Strategy**: 
- Empty result → `ticket-{short-uuid}` (e.g., `ticket-a1b2c3`)
- Collision → append counter (e.g., `ticket-a1b2c3-2`)

### 7. Audit & Permissions

**Delete Action Security:**
- **Permission Check**: Requires admin or specific "delete ticket" permission
- **Confirmation**: Double modal confirmation
- **Audit Log**: 
  ```json
  {
    "action": "ticket_delete",
    "ticket_id": "...",
    "deleted_by": "user_id",
    "timestamp": "...",
    "reason": "optional reason",
    "ticket_snapshot": {...}  // Backup data
  }
  ```
- **Recovery**: Soft delete for 7 days before permanent removal

### 8. Race Condition Prevention

**Concurrent Update Handling:**
- Database transactions for state changes
- Optimistic locking for claim/transfer
- Message queue for notification delivery
- Debounce rapid state changes (2-second window)

---

## 🔨 Developer Implementation Checklist

### Pre-Development Verification Points

#### 1. Timer Architecture
```typescript
interface TicketTimer {
    ticketId: string;
    type: 'idle' | 'warning' | 'autoclose';
    threshold: number;  // ms
    startTime: Date;
    lastReset: Date;
    ticketType: string;  // for type-specific timers
}

// Ensure each ticket type can have different timers
const timerConfig = {
    'support': { idle: 24*60*60*1000, warning: 2*60*60*1000 },
    'report': { idle: 72*60*60*1000, warning: 12*60*60*1000 },
    'priority': { idle: 6*60*60*1000, warning: 30*60*1000 }
};
```

#### 2. Channel Name Generation Tests
```javascript
// Test cases for sanitization
const testNames = [
    { input: "John Doe", expected: "john-doe" },
    { input: "🎫・User#1234", expected: "user-1234" },
    { input: "!!!@@@###", expected: "ticket-{uuid}" },  // fallback
    { input: "Very Long Username That Exceeds The Maximum", expected: "very-long-username-that-exceeds-the-maximum" },
    { input: "--test--", expected: "test" },
    { input: "Ñoño José", expected: "nono-jose" }
];
```

#### 3. Message Activity Detection
```typescript
function isActivityMessage(message: Message): boolean {
    // Whitelist specific bots
    const whitelistedBots = dashboard.getWhitelistedBots();
    
    if (message.author.bot && !whitelistedBots.includes(message.author.id)) {
        return false;
    }
    
    // Count attachments even without text
    if (message.attachments.size > 0) return true;
    
    // Count embeds from staff
    if (message.embeds.length > 0 && isStaff(message.author)) return true;
    
    // Regular text messages
    if (message.content.trim().length > 0) return true;
    
    return false;
}
```

#### 4. Load Balancing Algorithm
```sql
-- Query for least busy staff
SELECT 
    staff_id,
    COUNT(CASE WHEN status IN ('new', 'waiting', 'active') THEN 1 END) as active_tickets,
    SUM(CASE WHEN priority = 'high' THEN 2 ELSE 1 END) as weighted_load
FROM tickets
WHERE deleted_at IS NULL
GROUP BY staff_id
ORDER BY weighted_load ASC
LIMIT 1;
```

#### 5. Soft Delete Implementation
```typescript
interface SoftDeletableTicket {
    id: string;
    deleted_at: Date | null;
    deleted_by: string | null;
    deletion_reason: string | null;
    permanent_delete_at: Date | null;  // deleted_at + 7 days
    backup_data: object;  // Full ticket snapshot
}

// Cron job for permanent deletion
async function cleanupSoftDeleted() {
    const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000);
    await db.tickets.deleteMany({
        deleted_at: { $lt: sevenDaysAgo },
        permanent_delete_at: { $lt: new Date() }
    });
}
```

#### 6. Concurrency Testing Scenarios
```typescript
// Test concurrent operations
async function testConcurrentClaims() {
    const ticketId = 'test-ticket';
    
    // Simulate 3 staff trying to claim simultaneously
    const results = await Promise.allSettled([
        claimTicket(ticketId, 'staff1'),
        claimTicket(ticketId, 'staff2'),
        claimTicket(ticketId, 'staff3')
    ]);
    
    // Only one should succeed
    const successes = results.filter(r => r.status === 'fulfilled');
    assert(successes.length === 1, 'Only one claim should succeed');
}
```

### Critical Database Indexes
```sql
-- Essential indexes for performance
CREATE INDEX idx_tickets_status_type ON tickets(status, ticket_type);
CREATE INDEX idx_tickets_staff_active ON tickets(assigned_staff_id) WHERE status != 'closed';
CREATE INDEX idx_tickets_timers ON tickets(last_activity, warning_sent_at);
CREATE INDEX idx_tickets_deleted ON tickets(deleted_at, permanent_delete_at) WHERE deleted_at IS NOT NULL;
```

### Testing Matrix

| Feature | Test Case | Expected Result |
|---------|-----------|-----------------|
| **Timers** | Different types with different thresholds | Each runs independently |
| **Names** | Unicode, emojis, special chars | Safe channel names |
| **Activity** | Attachments, embeds, bot messages | Correct state changes |
| **Load Balance** | 10 staff, 100 tickets | Even distribution |
| **Soft Delete** | Delete → Wait 7 days | Auto-removed after 7d |
| **Concurrency** | 5 simultaneous claims | Only 1 succeeds |

---

This specification represents a **fully modular, endlessly customizable ticket system** where every aspect can be tailored to a guild's specific needs. The system grows with the community, from simple support tickets to complex multi-department helpdesks.