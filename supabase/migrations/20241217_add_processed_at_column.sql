-- Add processed_at column to notifications table to track email processing
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN public.notifications.processed_at IS 'Timestamp when notification email was processed/sent';

-- Add index for faster lookups of unprocessed notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unprocessed 
ON public.notifications(type, processed_at) 
WHERE processed_at IS NULL;
