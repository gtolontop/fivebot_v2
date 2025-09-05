# Ticket System Validation Guide

## Overview
This guide explains the comprehensive validation system implemented for the ticket configuration in the FiveBot v2 ticket system.

## Validation Features

### 1. Configuration Validation
The system validates the entire ticket configuration before allowing ticket creation:

- **System Enabled Check**: Ensures tickets are enabled before use
- **Container Configuration**: Validates thread vs channel mode setup
- **Staff Roles**: Checks if staff roles are configured
- **Categories**: Validates active categories and their settings
- **Naming Pattern**: Ensures proper channel/thread naming configuration
- **Limits**: Validates user limits and timeouts

### 2. Real-time Creation Validation
When a user tries to create a ticket:

- **User Limits**: Checks if user has reached max active tickets
- **Category Validation**: Ensures selected category exists and is active
- **Channel Permissions**: Verifies bot has proper permissions
- **Configuration Health**: Re-validates config at creation time

### 3. Error Messages
All error messages are available in both English and French:

```typescript
// Example usage
const message = getErrorMessage('NO_CONFIG', 'fr');
// Returns: "Le système de tickets n'est pas configuré..."
```

## Common Validation Errors

### Critical Errors (Prevents Ticket Creation)

1. **No Configuration**
   - Error: "Ticket system is not configured"
   - Solution: Configure ticket system in dashboard

2. **System Disabled**
   - Error: "Ticket system is currently disabled"
   - Solution: Enable tickets in dashboard settings

3. **No Thread Channel (Thread Mode)**
   - Error: "Thread mode enabled but no container channel set"
   - Solution: Set a text channel for thread creation

4. **Invalid Container Channel**
   - Error: "Configured channel is invalid or deleted"
   - Solution: Update channel configuration

### Warnings (Non-blocking)

1. **No Staff Roles**
   - Warning: "No staff roles configured"
   - Effect: Only admins can manage tickets

2. **No Support Category (Channel Mode)**
   - Warning: "No category set for ticket channels"
   - Effect: Channels created without category

3. **No Active Categories**
   - Warning: "No active ticket categories"
   - Effect: Only general tickets available

## Using the Validation Service

### 1. Validate Configuration
```typescript
const validationService = new TicketValidationService(client, ticketService);
const result = await validationService.validateConfiguration(config, guildId);

if (!result.isValid) {
  const message = validationService.formatValidationMessage(result);
  // Display error to user
}
```

### 2. Validate Ticket Creation
```typescript
const validation = await validationService.validateTicketCreation(
  config,
  guildId,
  userId,
  categoryId
);

if (!validation.isValid) {
  // Show errors to user
}
```

### 3. Format Validation Messages
```typescript
// Get formatted message with all errors/warnings
const message = validationService.formatValidationMessage(result, 'en');

// Or format individual messages
const error = formatError(getErrorMessage('MAX_TICKETS_REACHED', 'en', { limit: '3' }));
```

## Commands

### /ticket validate
Administrators can use this command to check their configuration:

```
/ticket validate [locale:en|fr]
```

This will display:
- Configuration status (valid/invalid)
- All errors that need fixing
- Warnings for optional improvements
- Summary of current settings

### /ticketvalidate
Alternative standalone command for validation:

```
/ticketvalidate [locale:en|fr]
```

## Best Practices

1. **Always Validate Before Creation**
   - Run validation before showing ticket modal
   - Re-validate on modal submission

2. **Handle Errors Gracefully**
   - Show clear error messages to users
   - Guide them on how to fix issues

3. **Monitor Warnings**
   - Log warnings for administrator review
   - Consider fixing warnings for better UX

4. **Use Proper Locale**
   - Detect user/guild language preference
   - Default to English if unsure

## Configuration Requirements

### Minimum Required Configuration
- Tickets must be enabled
- At least one staff role (recommended)
- Valid container configuration:
  - Thread mode: Valid text channel
  - Channel mode: Valid category (optional)

### Recommended Configuration
- Multiple staff roles
- Ticket categories with descriptions
- Proper naming pattern with variables
- Reasonable user limits (3-5 tickets)
- Inactivity timeout (24-72 hours)

## Error Code Reference

| Error Code | Description | Severity |
|------------|-------------|----------|
| NO_CONFIG | System not configured | Critical |
| SYSTEM_DISABLED | Tickets disabled | Error |
| NO_THREAD_CHANNEL | Missing thread container | Critical |
| INVALID_THREAD_CHANNEL | Invalid channel | Critical |
| MAX_TICKETS_REACHED | User limit reached | Error |
| CATEGORY_NOT_FOUND | Category doesn't exist | Error |
| CATEGORY_INACTIVE | Category disabled | Error |
| NO_PERMISSION | Missing permissions | Error |

## Troubleshooting

### Validation Always Fails
1. Check if ticket system is enabled in dashboard
2. Verify bot has proper permissions
3. Ensure configuration is saved properly

### Thread Creation Fails
1. Verify thread container channel exists
2. Check bot can create threads in channel
3. Ensure channel isn't archived/locked

### Channel Creation Fails
1. Verify bot has "Manage Channels" permission
2. Check category exists (if configured)
3. Ensure server hasn't hit channel limit