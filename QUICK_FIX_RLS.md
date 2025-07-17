# 🚨 Quick Fix for RLS Upload Error

## Problem
Getting "Invalid key" error when uploading images, like:
```
Failed files:
- Screenshot 2025-05-21 at 11.34.17 AM.png: Invalid key: images/2025-07-17T05-59-45-824Z-Screenshot 2025-05-21 at 11.34.17 AM.png
```

## Root Causes
1. **Filename contains spaces** - Supabase Storage doesn't handle spaces well in file paths
2. **Permission issues** - Need service role key for admin uploads
3. **Bucket policies** - RLS (Row Level Security) might be blocking uploads

## Quick Solutions

### 1. ✅ Updated Code (Already Fixed)
The code has been updated to:
- **Sanitize filenames** - Replace spaces with hyphens, remove special characters
- **Use service role key** - Admin uploads now use the service role key for proper permissions
- **Better error handling** - More detailed error messages

### 2. 🧪 Test the Fix
Open browser console and run:
```javascript
// Test service role key
emergencyFix.testKey()

// Test figures bucket access
emergencyFix.testBucket('figures')

// Run all tests
emergencyFix.test()
```

### 3. 🔧 Manual Upload Test
If the UI still has issues, try manual upload:
```javascript
// Select a file first, then run:
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
        const result = await emergencyFix.upload(file, 'figures', 'uploaded');
        console.log('Upload result:', result);
    }
};
fileInput.click();
```

### 4. 🪣 Check Bucket Policies (If Still Failing)

If uploads still fail, you may need to update bucket policies in Supabase:

1. Go to **Supabase Dashboard > Storage > figures bucket**
2. Click **Policies** tab
3. Make sure there's a policy like:
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Allow authenticated uploads" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'figures');
   ```

### 5. 📊 Expected Results
After the fix, you should see:
- ✅ Filenames sanitized: `"Screenshot 2025-05-21 at 11.34.17 AM.png"` → `"2025-07-17-05-59-45-screenshot-2025-05-21-at-113417-am.png"`
- ✅ Service role key authentication working
- ✅ Images upload successfully

## Testing Steps

1. **Login as admin** (admin@wolfpm.com / admin123)
2. **Try uploading to figures bucket** 
3. **Check browser console** for detailed logs
4. **If upload fails**, run: `emergencyFix.test()`

## Success Indicators

You'll know it's working when you see:
```
✅ Service role key works. Available buckets: ["figures", "wolf-property-images"]
✅ Bucket "figures" accessible. Files found: X
✅ Emergency upload successful
🎉 All emergency tests passed!
```

## Still Having Issues?

1. **Double-check service role key** in `supabase-config.js`
2. **Verify bucket exists** in Supabase dashboard
3. **Check bucket is public** (for URL access)
4. **Run emergency tests** with: `emergencyFix.test()`

## Manual Bucket Setup (If Needed)

If the figures bucket doesn't exist:

1. Go to **Supabase Dashboard > Storage**
2. Click **"Create bucket"**
3. Name: `figures`
4. Make it **public**
5. Add upload policy for authenticated users

---

**Note**: The service role key provided has been integrated into the system and should resolve permission issues. 