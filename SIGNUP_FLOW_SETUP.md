# Custom Signup Flow Setup

This document explains how to set up the custom signup flow with branded confirmation emails.

## ✅ What's Been Implemented

### 1. **Improved Signup Form**
- ✅ Added success page with form reset after signup
- ✅ Clear visual feedback with checkmark icon and instructions
- ✅ Options to create another account or return to login

### 2. **Custom Email System**
- ✅ Created custom signup confirmation email template (`email-templates/signup-confirmation.html`)
- ✅ Integrated with existing Make.com webhook infrastructure
- ✅ Replaces generic Supabase emails with branded AAC emails

### 3. **Database & API**
- ✅ Database migration for confirmation tokens (`supabase/migrations/20241217_create_signup_confirmation_tokens.sql`)
- ✅ Custom confirmation API endpoints
- ✅ Secure token generation and verification

### 4. **Confirmation Flow**
- ✅ Custom confirmation page (`/auth/confirm`) 
- ✅ Proper error handling for expired/invalid tokens
- ✅ Auto-redirect to login after successful confirmation

## 🚀 Required Setup

### 1. **Database Migration**
Run the migration to create the confirmation tokens table:
```sql
-- This has been created in: supabase/migrations/20241217_create_signup_confirmation_tokens.sql
-- Run: supabase db push (or apply via Supabase dashboard)
```

### 2. **Environment Variables**
Add this to your `.env.local` file:
```env
# Make.com webhook for signup confirmation emails
MAKE_SIGNUP_CONFIRMATION_WEBHOOK_URL=https://hook.make.com/your-webhook-url-here
```

### 3. **Make.com Webhook Setup**
Create a new webhook in Make.com that:

**Receives data:**
```json
{
  "email": "user@example.com",
  "confirmationUrl": "https://yoursite.com/auth/confirm?token=abc123",
  "timestamp": "2024-12-17T10:30:00Z"
}
```

**Sends email using the template:**
- Use the HTML template from `email-templates/signup-confirmation.html`
- Replace `{{.ConfirmationURL}}` with the `confirmationUrl` from webhook data
- Send to the `email` address from webhook data

## 🎯 User Flow

### Before (Issues):
1. User fills signup form
2. Gets generic Supabase email ❌
3. Form doesn't reset ❌
4. No clear next steps ❌

### After (Fixed):
1. User fills signup form
2. Form shows success page with clear instructions ✅
3. Receives branded AAC confirmation email ✅
4. Clicks link → custom confirmation page ✅
5. Gets confirmed and redirected to login ✅

## 🔧 Technical Details

### API Endpoints:
- `POST /api/auth/signup-confirmation` - Sends custom confirmation email
- `POST /api/auth/verify-confirmation` - Verifies token and confirms user
- `GET /auth/confirm?token=...` - Confirmation page

### Database Table:
```sql
signup_confirmation_tokens (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Security Features:
- ✅ Secure random token generation (32 characters)
- ✅ 24-hour token expiration
- ✅ One-time use tokens (marked as used after confirmation)
- ✅ RLS policies (service role only access)

## 🚧 Next Steps

1. **Set up Make.com webhook** with the environment variable
2. **Run the database migration** 
3. **Test the complete flow**:
   - Sign up with new email
   - Check for branded confirmation email
   - Click confirmation link
   - Verify successful login

## 🛠️ Troubleshooting

**Issue: Not receiving confirmation emails**
- ✅ Check `MAKE_SIGNUP_CONFIRMATION_WEBHOOK_URL` is set
- ✅ Verify Make.com webhook is active
- ✅ Check server logs for webhook errors

**Issue: "Token expired" errors**
- ✅ Tokens expire after 24 hours by default
- ✅ Users can request new confirmation emails (TODO: implement resend)

**Issue: Database errors**
- ✅ Ensure the migration has been applied
- ✅ Check Supabase service role permissions
