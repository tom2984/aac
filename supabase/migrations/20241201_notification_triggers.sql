-- Create function to generate notification for form submissions
CREATE OR REPLACE FUNCTION notify_form_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Get all admin users to notify
  INSERT INTO public.notifications (recipient_id, type, title, message, data)
  SELECT 
    p.id as recipient_id,
    'form_submitted' as type,
    CONCAT(
      COALESCE(submitter.first_name, 'Unknown'), 
      ' ', 
      COALESCE(submitter.last_name, 'User'), 
      ' submitted a form'
    ) as title,
    CONCAT('Form "', f.title, '" was submitted successfully') as message,
    json_build_object(
      'form_id', NEW.form_id,
      'response_id', NEW.id,
      'submitter_id', NEW.user_id,
      'submitter_name', CONCAT(
        COALESCE(submitter.first_name, 'Unknown'), 
        ' ', 
        COALESCE(submitter.last_name, 'User')
      )
    ) as data
  FROM public.profiles p
  LEFT JOIN public.forms f ON f.id = NEW.form_id
  LEFT JOIN public.profiles submitter ON submitter.id = NEW.user_id
  WHERE p.role = 'admin'
    AND p.id != NEW.user_id; -- Don't notify the submitter
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate notification for invite acceptances
CREATE OR REPLACE FUNCTION notify_invite_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'active' (invite accepted)
  IF OLD.status != 'active' AND NEW.status = 'active' THEN
    -- Get all admin users to notify
    INSERT INTO public.notifications (recipient_id, type, title, message, data)
    SELECT 
      p.id as recipient_id,
      'invite_accepted' as type,
      CONCAT(
        COALESCE(NEW.first_name, 'New'), 
        ' ', 
        COALESCE(NEW.last_name, 'User'), 
        ' accepted their invite'
      ) as title,
      CONCAT('Welcome ', 
        COALESCE(NEW.first_name, 'New'), 
        ' ', 
        COALESCE(NEW.last_name, 'User'), 
        ' to the team!'
      ) as message,
      json_build_object(
        'profile_id', NEW.id,
        'user_name', CONCAT(
          COALESCE(NEW.first_name, 'New'), 
          ' ', 
          COALESCE(NEW.last_name, 'User')
        ),
        'user_email', NEW.email
      ) as data
    FROM public.profiles p
    WHERE p.role = 'admin'
      AND p.id != NEW.id; -- Don't notify the new user themselves
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for form responses (form submissions)
DROP TRIGGER IF EXISTS trigger_notify_form_submission ON public.form_responses;
CREATE TRIGGER trigger_notify_form_submission
  AFTER INSERT ON public.form_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_form_submission();

-- Create trigger for profile updates (invite acceptances)
DROP TRIGGER IF EXISTS trigger_notify_invite_acceptance ON public.profiles;
CREATE TRIGGER trigger_notify_invite_acceptance
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_invite_acceptance();

-- Create function to clean up old notifications (optional - run manually or via cron)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete notifications older than 90 days
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete read notifications older than 30 days
  DELETE FROM public.notifications 
  WHERE read = true AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created 
ON public.notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read 
ON public.notifications (recipient_id, read);

CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON public.notifications (type);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_form_submission() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION notify_invite_acceptance() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO anon, authenticated; 