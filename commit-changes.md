# Changes Made

## Auto-Delete Old Invites for Testing

Updated the invitation API to automatically delete existing pending invites when `forceResend: true` is used.

### Key Changes:
- Added logic to delete existing pending invites before creating new ones
- Maintains safety for production (only deletes when explicitly requested)
- Perfect for testing - can resend to same email multiple times

### How it works:
- Normal mode: Skips if invite already exists
- Test mode (forceResend: true): Deletes old invites, creates fresh ones
