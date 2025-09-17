# Email Notification Fix Guide

## ❌ Problem
Notifications appear in the dashboard but emails aren't being sent because:
1. **Missing environment variable**: `MAKE_NOTIFICATION_WEBHOOK_URL` is not set
2. **Missing connection**: Database notifications don't automatically trigger email sending

## ✅ Solution

### Step 1: Set Environment Variable

Add this to your `.env.local` file:
```bash
MAKE_NOTIFICATION_WEBHOOK_URL=https://hook.make.com/your-notification-webhook-url
```

**Note**: Replace `your-notification-webhook-url` with your actual Make.com webhook URL for form notifications.

### Step 2: Run Database Migration

Run this SQL in your Supabase SQL editor:
```sql
-- Add processed_at column to notifications table to track email processing
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN public.notifications.processed_at IS 'Timestamp when notification email was processed/sent';

-- Add index for faster lookups of unprocessed notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unprocessed 
ON public.notifications(type, processed_at) 
WHERE processed_at IS NULL;
```

### Step 3: Test Email Processing

#### Manual Test (Immediate):
```bash
# Call the email processing endpoint manually
curl -X POST http://localhost:3000/api/notifications/process-emails
```

#### Verify in Browser:
1. Go to `http://localhost:3000/api/notifications/process-emails` (POST request)
2. Check browser console for logs
3. Check Make.com for webhook triggers
4. Check your email inbox

## 🔧 How It Works

### New Email Processing Flow:
1. ✅ **Form answered** → Database trigger creates notification
2. ✅ **Manual/automatic call** → `/api/notifications/process-emails` 
3. ✅ **Process notifications** → Calls `/api/notifications/email`
4. ✅ **Send email** → Make.com webhook → Email sent
5. ✅ **Mark processed** → `processed_at` timestamp added

### Automatic Processing (Future):
You can set up a cron job or scheduled function to call:
```
POST /api/notifications/process-emails
```

This will automatically process any unprocessed notifications every few minutes.

## 🧪 Testing Steps

1. **Set the environment variable** (`MAKE_NOTIFICATION_WEBHOOK_URL`)
2. **Run the database migration**
3. **Answer a form question** with "Notify me" checked
4. **Call the processing endpoint**: `POST /api/notifications/process-emails`
5. **Check for email** in your inbox and Make.com logs

## 📝 Console Logs to Expect

When processing works correctly:
```
🔍 Processing email notifications...
📧 Found 1 notifications to process
📧 Sending email for notification abc123 to admin@example.com
✅ Email sent for notification abc123: { success: true }
🎯 Email processing complete: 1 sent, 0 errors
```

## ⚠️ Troubleshooting

- **No webhook URL**: Set `MAKE_NOTIFICATION_WEBHOOK_URL` environment variable
- **No notifications**: Ensure form questions have "Notify me" checked
- **API errors**: Check console logs for detailed error messages
- **Make.com issues**: Verify webhook URL and check Make.com scenario logs
