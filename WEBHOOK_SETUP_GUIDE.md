# Webhook Setup Guide

## 🗃️ Database Migration

### Step 1: Apply Supabase Migration

1. **Go to Supabase Dashboard** → Your Project → SQL Editor
2. **Copy the entire contents** from `SUPABASE_MIGRATION.sql` 
3. **Paste into SQL Editor** and click "Run"
4. **Verify success** - You should see "Success. No rows returned"

### Step 2: Verify Table Creation

```sql
-- Run this to verify the table was created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'signup_confirmation_tokens'
ORDER BY ordinal_position;
```

Expected result: 8 columns (id, email, token, expires_at, used, used_at, created_at, updated_at)

---

## 📮 Postman Setup

### Step 1: Import Collection

1. **Open Postman**
2. **Click Import** → Choose Files → Select `postman-collection.json`
3. **Collection imported** as "AAC Email Webhooks"

### Step 2: Configure Environment Variables

Before testing, set up your webhook URLs:

1. **Click the collection** → Variables tab
2. **Update these values** with your actual Make.com webhook URLs:

```
MAKE_SIGNUP_CONFIRMATION_WEBHOOK_URL = https://hook.make.com/your-actual-url
MAKE_EMPLOYEE_WEBHOOK_URL = https://hook.make.com/your-actual-url  
MAKE_ADMIN_WEBHOOK_URL = https://hook.make.com/your-actual-url
MAKE_NOTIFICATION_WEBHOOK_URL = https://hook.make.com/your-actual-url
```

### Step 3: Test Each Webhook

The collection includes 4 test requests:

#### 1. **Signup Confirmation Email**
```json
{
  "email": "test@example.com",
  "confirmationUrl": "https://yoursite.com/auth/confirm?token=abc123xyz789",
  "timestamp": "2024-12-17T10:30:00.000Z"
}
```

#### 2. **Employee Invitation Email**
```json
{
  "email": "employee@example.com",
  "adminName": "John Smith", 
  "inviteLink": "https://yoursite.com/accept-invite?token=inv123xyz789",
  "role": "employee"
}
```

#### 3. **Admin Invitation Email**
```json
{
  "email": "admin@example.com",
  "adminName": "John Smith",
  "inviteLink": "https://yoursite.com/accept-invite?token=inv123xyz789", 
  "role": "admin"
}
```

#### 4. **Form Response Notification Email**
```json
{
  "recipientEmail": "manager@example.com",
  "questionText": "How many hours were lost due to weather?",
  "formattedAnswer": "8 hours",
  "formTitle": "Daily Progress Report",
  "submitterName": "Jane Doe",
  "responseId": "resp_123456",
  "questionId": "q_789012" 
}
```

---

## ✅ Testing Checklist

### Database Migration:
- [ ] Migration SQL executed successfully  
- [ ] Table `signup_confirmation_tokens` exists
- [ ] Indexes created
- [ ] RLS policies applied
- [ ] Trigger function working

### Webhook Testing:
- [ ] Postman collection imported
- [ ] Environment variables configured
- [ ] Signup confirmation webhook tested
- [ ] Employee invitation webhook tested  
- [ ] Admin invitation webhook tested
- [ ] Notification webhook tested

### Expected Response:
Each webhook should return a **200 OK** status with a success message from Make.com.

---

## 🚨 Troubleshooting

**Migration Issues:**
- Ensure you have sufficient permissions in Supabase
- Check for any existing tables with the same name
- Verify the SQL syntax is correct

**Webhook Issues:**
- Double-check the webhook URLs are correct
- Ensure Make.com webhooks are active
- Check Make.com execution logs for errors
- Verify JSON payload structure matches exactly

**Environment Variables:**
- Add `MAKE_SIGNUP_CONFIRMATION_WEBHOOK_URL` to your `.env.local`
- Restart your development server after adding env variables
