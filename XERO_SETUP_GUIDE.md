# Xero Integration Setup Guide

## ✅ Implementation Complete!

Your Xero financial analytics integration is now fully set up with OAuth 2.0 authentication.

## 📋 **What Was Implemented:**

### 1. **Database Migration**
- Created `xero_connection` table to store OAuth tokens
- Automatic token refresh functionality
- Admin-only access control

### 2. **OAuth Routes**
- `/api/xero/auth` - Initiates OAuth flow
- `/api/xero/callback` - Handles OAuth callback and stores tokens

### 3. **Xero API Client**
- Auto-refreshing access tokens
- Profit & Loss data fetching
- Monthly financial metrics calculation
- Rate limiting compliance

### 4. **Settings UI**
- Xero connection card in Settings page (admin-only)
- Connection status display
- One-click connect/disconnect

### 5. **Financial Analytics**
- Real-time data from your Xero account
- 4 financial metrics with month-by-month charts
- Automatic data refresh

---

## 🚀 **Setup Instructions:**

### Step 1: Run Database Migration

```bash
# Apply the Xero connection table migration
psql YOUR_DATABASE_URL < supabase/migrations/20241015_create_xero_connection.sql
```

Or if using Supabase dashboard:
1. Go to SQL Editor
2. Run the contents of `supabase/migrations/20241015_create_xero_connection.sql`

### Step 2: Configure Environment Variables

Your `.env.local` should have (already configured):

```bash
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

### Step 3: Configure Xero App Settings

In your [Xero Developer Portal](https://developer.xero.com/):

1. **Redirect URI:** Add `http://localhost:3000/api/xero/callback`
   - For production, add: `https://your-domain.com/api/xero/callback`

2. **Scopes:** Ensure these are enabled:
   - `accounting.reports.read`
   - `accounting.transactions.read`
   - `offline_access` (for refresh tokens)

### Step 4: Connect to Xero

1. Restart your dev server: `npm run dev`
2. Navigate to `/dashboard/settings`
3. Find the "Xero Integration" card
4. Click "Connect to Xero"
5. Authorize your Xero organization
6. You'll be redirected back with a success message

### Step 5: View Financial Analytics

1. Go to `/dashboard/analytics`
2. Scroll to "Financial Analytics" section
3. View your real Xero data in beautiful charts!

---

## 📊 **How It Works:**

### Token Management
- **Initial auth:** Redirects to Xero for user authorization
- **Token storage:** Access & refresh tokens stored in database
- **Auto-refresh:** Tokens refreshed automatically when expired (30 min expiry)
- **Single connection:** Only one Xero organization connected at a time

### Data Fetching
1. API route checks for valid token
2. Refreshes token if needed (automatically)
3. Fetches Profit & Loss reports from Xero
4. Calculates financial metrics:
   - **Average Turnover:** Revenue per month
   - **Gross Margin:** (Revenue - COGS) / Revenue %
   - **Material Cost:** Material expenses
   - **Subcontractor Use:** Subcontractor/labor costs

### Security
- ✅ Admin-only access to connection
- ✅ Row-level security on database table
- ✅ Tokens encrypted in transit
- ✅ Automatic token refresh

---

## 🔧 **Troubleshooting:**

### "No Xero connection found"
**Solution:** Connect to Xero in Settings first

### "Token refresh failed"
**Solution:** Disconnect and reconnect in Settings

### "No data showing"
**Possible causes:**
1. Check Xero account has historical P&L data
2. Verify account has correct scopes enabled
3. Check browser console for API errors
4. Ensure dates in Xero match expected format

### "Connection failed"
**Check:**
1. Redirect URI matches in Xero app settings
2. Client ID and Secret are correct
3. Scopes include required permissions
4. Database migration has been applied

---

## 🎯 **Next Steps:**

Your financial analytics are now live! The system will:
- ✅ Auto-refresh data when you view analytics
- ✅ Auto-refresh tokens before expiry
- ✅ Display real-time financial metrics
- ✅ Show month-by-month trends

**No ongoing maintenance required!** 🎉

---

## 📞 **Support:**

If you encounter any issues:
1. Check browser console for errors
2. Check server logs for API errors
3. Verify Xero connection status in Settings
4. Try disconnecting and reconnecting

All logs are prefixed with:
- `🔍` - Info/debug
- `✅` - Success
- `❌` - Error
- `🔄` - Refresh/update

