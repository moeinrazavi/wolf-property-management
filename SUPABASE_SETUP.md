# Supabase Setup Guide for Wolf Property Management

This guide will help you set up Supabase as the backend for your Wolf Property Management website.

## Prerequisites

- Node.js installed on your system
- Access to your Supabase project dashboard
- Your Supabase project URL and API keys

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Get Your Supabase API Keys

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to Settings > API
3. Copy the following:
   - **Project URL** (e.g., `https://srpspzgemnfxkqalgjmz.supabase.co`)
   - **Anon Key** (public key)
   - **Service Role Key** (private key - keep this secret!)

## Step 3: Update Configuration

Edit `supabase-config.js` and replace the placeholder values:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://srpspzgemnfxkqalgjmz.supabase.co', // Your project URL
    anonKey: 'YOUR_ACTUAL_ANON_KEY_HERE', // Your anon key
    serviceRoleKey: 'YOUR_SERVICE_ROLE_KEY_HERE' // Your service role key
};
```

## Step 4: Set Up Database Tables

Run the database setup script:

```bash
node setup-database.js
```

This will:
- Create all necessary tables
- Set up Row Level Security (RLS) policies
- Create a default admin user
- Initialize website content
- Create a storage bucket for media files

## Step 5: Create Storage Bucket (Manual)

If the automatic bucket creation fails, create it manually:

1. Go to Storage in your Supabase dashboard
2. Click "Create a new bucket"
3. Name it `website-media`
4. Make it public
5. Set file size limit to 50MB
6. Allow image/*, video/*, and application/pdf file types

## Step 6: Test the Setup

1. Start your local server:
   ```bash
   npm run dev
   ```

2. Open your website: `http://localhost:8001`

3. Test admin login:
   - **Email:** `admin@wolfpm.com`
   - **Password:** `admin123`

4. Try editing some content and saving it

## Database Schema

### Tables Created

#### `admin_users`
- Stores admin user accounts
- Email/password authentication
- Login tracking

#### `website_content`
- Stores all editable website content
- Versioned content management
- Page-specific content organization

#### `version_history`
- Tracks all content changes
- JSON storage of changes
- Version numbering and descriptions

#### `media_content`
- Stores image and media file references
- Links to Supabase Storage
- Alt text and metadata

### Row Level Security (RLS)

- **Public Read Access:** Anyone can read active website content
- **Admin Write Access:** Only authenticated admins can modify content
- **Version History:** Only admins can access version history
- **Media Management:** Public read, admin write for media files

## Content Management

### Content Mapping

The system uses a content mapping system to identify editable elements:

```javascript
const CONTENT_MAPPING = {
    'index.html': {
        'hero-title': { selector: '.hero h1', type: 'text' },
        'hero-subtitle': { selector: '.hero h2', type: 'text' },
        // ... more mappings
    }
};
```

### Adding New Editable Content

1. Add the content mapping in `supabase-config.js`
2. The element will automatically become editable when logged in as admin
3. Changes will be saved to the database

## Version Control

- **Automatic Versioning:** Each save creates a new version
- **Version History:** View and restore previous versions
- **10 Version Limit:** Automatically manages version count
- **Cross-Page Support:** Versions are page-specific

## Media Management

- **File Upload:** Drag and drop or click to upload
- **Storage:** Files stored in Supabase Storage
- **Public URLs:** Automatic public URL generation
- **File Types:** Images, videos, PDFs supported

## Security Features

- **Password Protection:** Admin authentication required
- **Row Level Security:** Database-level access control
- **Input Validation:** Server-side validation
- **File Type Restrictions:** Secure file uploads

## Production Deployment

### For GitHub Pages:

1. Update the Supabase configuration with production keys
2. Commit and push your changes
3. Your website will use the database for all content

### Environment Variables (Optional):

For better security, you can use environment variables:

```bash
# .env file
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Troubleshooting

### Common Issues

1. **"Invalid API key" error:**
   - Check your anon key in the configuration
   - Ensure the key is copied correctly

2. **"Table doesn't exist" error:**
   - Run the setup script: `node setup-database.js`
   - Check that all tables were created successfully

3. **"Permission denied" error:**
   - Check RLS policies in Supabase dashboard
   - Ensure admin user is properly authenticated

4. **Content not loading:**
   - Check browser console for errors
   - Verify content mapping is correct
   - Ensure database has content

### Getting Help

- Check the browser console for detailed error messages
- Review Supabase logs in the dashboard
- Verify all configuration values are correct

## Next Steps

1. **Customize Admin Credentials:** Change the default admin password
2. **Add More Content:** Extend the content mapping for new elements
3. **Customize Styling:** Modify the admin interface CSS
4. **Add Features:** Implement additional admin features as needed

Your website is now fully integrated with Supabase and ready for production use! 