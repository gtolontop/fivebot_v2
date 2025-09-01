# 🎫 FiveBot Template — Universal Modular Ticketing System Specification

> **Note**: This is the specification for the ticketing system in the FiveBot template. All configuration is done through the FiveBot web dashboard, not through config files.

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

### Visual Customization
```yaml
theme:
  colors:
    new: "#95a5a6"
    active: "#3498db"
    waiting: "#f39c12"
    resolved: "#2ecc71"
    closed: "#34495e"
  
  emojis:
    ticket: "🎫"
    new: "🕔"
    claimed: "👤"
    transferred: "↔️"
    closed: "🔒"
    use_custom: true  # allows custom server emojis
```

### Language Customization
```yaml
language:
  ticket_noun: "ticket"  # or "case", "issue", "request"
  create_verb: "open"    # or "create", "submit", "start"
  staff_noun: "staff"    # or "agent", "moderator", "support"
  close_verb: "close"    # or "resolve", "complete", "finish"
```

---

## 🔧 Configuration Examples

### Minimal Configuration
```yaml
name: "Simple Support"
mode: "threads"
lifecycle: "basic"  # new → active → closed
controls: ["create", "close"]
notifications: false
```

### Enterprise Configuration
```yaml
name: "Corporate Helpdesk"
mode: "channels"
categories:
  model: "department-based"
  departments: ["IT", "HR", "Finance", "Legal"]
lifecycle: "sla-driven"
sla:
  first_response: "30m"
  resolution: "24h"
  escalation: "auto"
integrations:
  webhook: true
  dashboard: true
  metrics: true
```

### Gaming Community Configuration
```yaml
name: "Gaming Support"
mode: "hybrid"
entry:
  quick_actions: ["report-player", "appeal-ban", "tech-issue"]
  forms: true
assignment: "skill-based"
skills:
  moderation: ["report-player", "appeal-ban"]
  technical: ["tech-issue", "bug-report"]
auto_close: "48h"
fun_mode: true  # adds achievements, streaks, etc.
```

---

## 📊 Lifecycle Configuration Matrix

| Event | Possible Transitions | Conditions | Configurable |
|-------|---------------------|------------|--------------|
| **Ticket Created** | → New, Assigned, Routed | Auto-assign rules | ✓ |
| **Staff Message** | → Staff Responded, Active | Role check | ✓ |
| **User Message** | → Awaiting Staff, Active | Is creator | ✓ |
| **No Activity** | → Idle, Warning, Auto-close | Time threshold | ✓ |
| **Claim Action** | → Assigned, Owned | Permissions | ✓ |
| **Transfer Action** | → New Owner, Routed | Target available | ✓ |
| **Close Action** | → Closed, Archived | Confirmation | ✓ |
| **Keyword Detected** | → Escalated, Prioritized | Keyword list | ✓ |

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

1. **Core State Machine** - Flexible lifecycle engine
2. **Modular UI System** - Configurable panels and controls
3. **Permission Framework** - Granular access control
4. **Storage Backend** - Scalable database design
5. **Configuration System** - YAML/JSON-based setup
6. **API Layer** - External integrations
7. **Analytics Engine** - Metrics and reporting
8. **Web Dashboard** - Visual management interface

---

## 🎯 Success Metrics

- **Flexibility**: Can adapt to any server's workflow
- **Simplicity**: Easy to understand and configure
- **Performance**: Handles high-volume servers
- **Reliability**: Consistent across restarts/updates
- **Extensibility**: New features don't break existing setups

---

This specification represents a **fully modular, endlessly customizable ticket system** where every aspect can be tailored to a guild's specific needs. The system grows with the community, from simple support tickets to complex multi-department helpdesks.