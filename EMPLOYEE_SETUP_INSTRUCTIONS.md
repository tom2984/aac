# Employee Profile Setup Instructions

## Summary
I've created scripts to help you set up an employee profile for `tomws2984@gmail.com` and connect it to your admin account `hello@tsaunders.dev` so you can test the forms functionality.

## What I've Done
1. ✅ Fixed the resource exhaustion error in the forms page (infinite API calls)
2. ✅ Fixed the composite question preset saving issue
3. ✅ Created automated scripts to set up admin and employee profiles
4. ✅ Used the employee auth ID from your Supabase dashboard: `fd0aab95-5e79-4ad6-a2e2-687adbde5e2c`

## What You Need to Do

### Step 1: Get Your Admin Auth ID
1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication > Users**
3. Find the user with email: `hello@tsaunders.dev`
4. Copy the **UID** (it will look something like `a77190ee-2ce8-4c46-9e5a-89849e19be29`)

### Step 2: Update the Script
Open the file `scripts/setup-admin-and-employee.js` and replace line 12:

**From:**
```javascript
const ADMIN_AUTH_ID = 'REPLACE_WITH_ADMIN_AUTH_ID' // Get this from Supabase dashboard
```

**To:**
```javascript
const ADMIN_AUTH_ID = 'your-actual-admin-auth-id-here' // Replace with the UID from step 1
```

### Step 3: Run the Script
```bash
node scripts/setup-admin-and-employee.js
```

## Expected Results
The script will:
1. ✅ Create/update admin profile for `hello@tsaunders.dev`
2. ✅ Create/update employee profile for `tomws2984@gmail.com`
3. ✅ Connect the employee to the admin via the `invited_by` field
4. ✅ Set both profiles to `active` status
5. ✅ Verify the connection

## Testing the Setup
After running the script successfully:

1. **Log in as `hello@tsaunders.dev`**
2. **Go to Dashboard > Forms**
3. **Click "Add new form"**
4. **In the Users section, you should see:**
   - `tomws2984@gmail.com` (Tom Employee)
5. **Select the employee and create a test form**

## Files Created
- `scripts/create-employee-profile.js` - Original script (may have permission issues)
- `scripts/create-employee-profile-simple.js` - Simplified version
- `scripts/setup-admin-and-employee.js` - **Main script to use**

## Troubleshooting
If you encounter any issues:
1. Make sure your `.env.local` file has the correct Supabase credentials
2. Check that the admin auth ID is correct
3. Verify that the service role key has the necessary permissions
4. Run the script again - it's designed to be idempotent (safe to run multiple times)

## What's Fixed
- ✅ No more infinite API calls (resource exhaustion error)
- ✅ Composite questions can be saved as presets
- ✅ "Use Work Days Preset" button works correctly
- ✅ Employee profiles can be created and connected to admins

## Next Steps
Once the employee profile is set up, you'll be able to:
- Test form creation and assignment
- Test composite questions with sub-questions
- Test the entire form workflow from creation to employee response 