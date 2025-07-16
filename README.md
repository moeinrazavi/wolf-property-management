# Wolf Property Management Website

A modern, responsive property management website with an integrated admin system powered by Supabase.

## Features

### 🏠 Website Features
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Modern UI**: Clean, professional design with smooth animations
- **Property Showcase**: Highlight different neighborhoods and services
- **Team Profiles**: Meet the team with detailed bios
- **Contact Information**: Easy access to phone and email

### 🔧 Admin System
- **Secure Login**: Password-protected admin access
- **Inline Editing**: Click any text to edit directly on the page
- **Real-time Preview**: See changes immediately
- **Version Control**: Track and restore previous versions
- **Media Management**: Upload and manage images
- **Cross-page Support**: Edit content on any page

### 🗄️ Database Integration
- **Supabase Backend**: Real database with PostgreSQL
- **Row Level Security**: Secure access control
- **Content Versioning**: Track all changes with history
- **Media Storage**: Secure file uploads to Supabase Storage
- **Real-time Updates**: Changes persist across all users

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase Database

#### Option A: Using SQL Script (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database-setup.sql`
4. Run the script

#### Option B: Using Setup Script
```bash
node setup-database.js
```

### 3. Configure Supabase

1. Get your API keys from Supabase Dashboard > Settings > API
2. Update `supabase-config.js`:
   ```javascript
   const SUPABASE_CONFIG = {
       url: 'https://your-project.supabase.co',
       anonKey: 'your-anon-key',
       serviceRoleKey: 'your-service-role-key'
   };
   ```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access Admin Panel
- Go to `http://localhost:8001`
- Click "Admin" in the navigation
- Login with:
  - **Email:** `admin@wolfpm.com`
  - **Password:** `admin123`

## Database Schema

### Tables
- **`admin_users`**: Admin authentication and user management
- **`website_content`**: All editable website content with versioning
- **`version_history`**: Complete change history with JSON storage
- **`media_content`**: Image and media file management

### Security
- **Row Level Security (RLS)** enabled on all tables
- **Public read access** for website content
- **Admin-only write access** for all modifications
- **Secure authentication** with password protection

## Content Management

### Editable Elements
The system automatically makes these elements editable when logged in as admin:

#### Home Page (`index.html`)
- Hero section (title, subtitle, description)
- "Find Your Edge" section
- Neighborhood spotlights
- Service descriptions
- Footer information

#### About Page (`about.html`)
- Hero section
- Company story
- Team member information
- Statistics
- Call-to-action sections

### Adding New Editable Content
1. Add content mapping in `supabase-config.js`
2. The element becomes automatically editable
3. Changes are saved to the database

## Version Control

### Features
- **Automatic Versioning**: Each save creates a new version
- **Version History**: View all previous versions
- **One-Click Restore**: Restore any previous version
- **Change Tracking**: See exactly what changed in each version
- **Cross-Page Support**: Versions are page-specific

### Version Management
- **10 Version Limit**: Automatically manages storage
- **Descriptive Names**: Add custom descriptions to versions
- **Export Functionality**: Export versions as JSON
- **Restore Warnings**: Confirmation before restoring

## Media Management

### Supported Features
- **Image Upload**: Drag and drop or click to upload
- **File Types**: Images, videos, PDFs
- **Storage**: Secure Supabase Storage
- **Public URLs**: Automatic public URL generation
- **Alt Text**: SEO-friendly alt text support

### Storage Configuration
- **Bucket Name**: `website-media`
- **File Size Limit**: 50MB
- **Public Access**: Yes (for website display)
- **Security**: Admin-only uploads

## Deployment

### GitHub Pages
1. Update Supabase configuration with production keys
2. Commit and push changes
3. Enable GitHub Pages in repository settings
4. Your website will use the database for all content

### Other Hosting
- Upload all files to your hosting provider
- Ensure HTTPS is enabled (required for Supabase)
- Update Supabase configuration with production keys

## Security Considerations

### Production Checklist
- [ ] Change default admin password
- [ ] Use environment variables for API keys
- [ ] Enable HTTPS on your domain
- [ ] Set up proper CORS policies
- [ ] Regular database backups
- [ ] Monitor access logs

### Environment Variables (Optional)
Create a `.env` file for better security:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Troubleshooting

### Common Issues

**"Invalid API key" error**
- Check your anon key in `supabase-config.js`
- Ensure the key is copied correctly from Supabase dashboard

**"Table doesn't exist" error**
- Run the database setup script
- Check that all tables were created in Supabase

**"Permission denied" error**
- Check RLS policies in Supabase dashboard
- Ensure admin user is properly authenticated

**Content not loading**
- Check browser console for errors
- Verify content mapping is correct
- Ensure database has initial content

### Getting Help
- Check browser console for detailed error messages
- Review Supabase logs in the dashboard
- Verify all configuration values are correct
- Check the `SUPABASE_SETUP.md` file for detailed setup instructions

## File Structure

```
wolf-property-management/
├── index.html              # Home page
├── about.html              # About page
├── style.css               # Main stylesheet
├── script.js               # Main JavaScript (with Supabase integration)
├── supabase-config.js      # Supabase configuration
├── supabase-client.js      # Database service
├── setup-database.js       # Database setup script
├── database-setup.sql      # SQL setup script
├── package.json            # Dependencies
├── SUPABASE_SETUP.md       # Detailed setup guide
├── README.md               # This file
└── images/                 # Static images
    ├── wolf-logo.png
    └── people/
        ├── adam_starr.png
        └── patricia_holmes.jpg
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Email: info@wolfpm.com
- Phone: 512-868-2093

---

**Wolf Property Management** - Georgetown's Premier Property Management Company 