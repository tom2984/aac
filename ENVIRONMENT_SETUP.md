# Required Environment Variables

Add these to your `.env.local` file:

```env
# Your site URL (REQUIRED for confirmation emails)
NEXT_PUBLIC_SITE_URL=https://your-actual-domain.com

# Make.com webhooks for email sending
MAKE_SIGNUP_CONFIRMATION_WEBHOOK_URL=https://hook.make.com/your-webhook-url
MAKE_EMPLOYEE_WEBHOOK_URL=https://hook.make.com/your-webhook-url
MAKE_ADMIN_WEBHOOK_URL=https://hook.make.com/your-webhook-url
MAKE_NOTIFICATION_WEBHOOK_URL=https://hook.make.com/your-webhook-url

# Supabase (should already be set)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# HubSpot (should already be set)
HUBSPOT_API_KEY=your-hubspot-key
HUBSPOT_ADVANCED_NEGOTIATIONS_STAGE_ID=your-stage-id
HUBSPOT_CLOSED_WON_STAGE_ID=your-stage-id
```

## 🚨 Critical Fix Needed

**Replace `https://your-actual-domain.com` with your real domain!**

Examples:
- Production: `NEXT_PUBLIC_SITE_URL=https://aac.yourdomain.com`
- Vercel: `NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app`
- Local dev: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

## 🔧 After Setting Environment Variables

1. **Restart your development server**
2. **Test signup again** - the confirmation link should now work
3. **Check the confirmation email** - should show proper domain instead of "undefined"
