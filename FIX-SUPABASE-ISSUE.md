# Fix Supabase Integration Issue

## Problem
Changes are not being saved to Supabase and revert back when the page is refreshed.

## Solution Steps

### Step 1: Set Up Database Tables
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to "SQL Editor" in the left sidebar
4. Copy and paste the entire contents of `quick-setup.sql`
5. Click "Run" to execute the script

### Step 2: Verify Database Setup
1. Open http://localhost:8003 in your browser
2. Press F12 to open developer tools
3. Go to the Console tab
4. Look for the diagnostic output that should show:
   ```
   🔍 DIAGNOSING SUPABASE ISSUES...
   =====================================
   1️⃣ Testing basic connection...
   ✅ Basic connection successful
   
   2️⃣ Testing table access...
   ✅ admin_users table accessible
   ✅ website_content table accessible
   ✅ version_history table accessible
   ✅ media_content table accessible
   
   3️⃣ Testing admin users...
   ✅ Found 1 active admin users
      - admin@wolfpm.com (active: true)
   
   4️⃣ Testing website content...
   ✅ Found 5 content items for index.html
   
   5️⃣ Testing save operation...
   ✅ Save operation successful, version: 1
   
   =====================================
   🎯 DIAGNOSIS COMPLETE
   ✅ ALL TESTS PASSED: Database is working correctly
   ```

### Step 3: Test Admin Login
1. Click the "Admin" button on the website
2. Login with:
   - Email: `admin@wolfpm.com`
   - Password: `admin123`
3. You should see the admin controls appear

### Step 4: Test Content Editing
1. Click on any text on the page to edit it
2. Make a change
3. Press Enter to save the change
4. Click "Save Changes" button
5. Check the console for save confirmation

### Step 5: Test Persistence
1. Refresh the page (F5 or Ctrl+R)
2. Your changes should still be there
3. Open the page in a new tab to verify changes are visible to all users

## If Issues Persist

### Check Console Errors
Look for any error messages in the browser console:
- Database connection errors
- Table access errors
- Save operation errors

### Common Issues and Solutions

1. **"Cannot access table" errors**
   - Solution: Run the `quick-setup.sql` script again

2. **"RLS policy" errors**
   - Solution: The script disables RLS, but if you see these errors, run the script again

3. **"Invalid API key" errors**
   - Solution: Check your Supabase configuration in `supabase-config.js`

4. **"No admin users found"**
   - Solution: Run the `quick-setup.sql` script to create the admin user

### Manual Database Check
1. Go to Supabase dashboard
2. Go to "Table Editor"
3. Check if these tables exist:
   - `admin_users`
   - `website_content`
   - `version_history`
   - `media_content`
4. Check if there's data in these tables

### Reset Everything
If nothing works, you can reset everything:
1. Go to Supabase dashboard
2. Go to "SQL Editor"
3. Run this command to drop all tables:
   ```sql
   DROP TABLE IF EXISTS version_history CASCADE;
   DROP TABLE IF EXISTS website_content CASCADE;
   DROP TABLE IF EXISTS media_content CASCADE;
   DROP TABLE IF EXISTS admin_users CASCADE;
   ```
4. Then run the `quick-setup.sql` script again

## Expected Behavior After Fix

✅ Changes are saved to Supabase immediately when "Save Changes" is clicked
✅ Changes persist after page refresh
✅ Changes are visible to all users
✅ Version history is stored in Supabase
✅ "Clear History" removes versions from database
✅ Restoring a version updates the database content

## Need Help?

If you're still having issues:
1. Check the browser console for specific error messages
2. Run `diagnoseSupabaseIssues()` in the browser console
3. Share the console output for further assistance 