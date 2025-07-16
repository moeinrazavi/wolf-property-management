# Wolf Property Management - Admin System

This website includes a comprehensive admin system that allows authorized users to edit text content directly on the website with full version control and deployment capabilities.

## Admin Login

- **Username:** `admin`
- **Password:** `admin123`

## Features

### Admin Authentication
- Secure login modal with username/password authentication
- Session persistence using localStorage
- Automatic logout on page refresh (for security)

### Inline Text Editing
- Click on any editable text to start editing
- Visual indicators show which text is editable (hover effects)
- Edit icon appears on hover for editable elements
- Save icon appears while editing

### Version Control System
- **10 Latest Versions:** Automatically maintains the 10 most recent versions
- **Version History:** Complete history with timestamps and descriptions
- **Restore Previous Versions:** One-click restore to any previous version
- **Export/Import:** Export changes as JSON files for backup or sharing
- **Permanent Storage:** Changes are saved permanently in localStorage

### User Interface
- Admin controls bar at the top of the page when logged in
- Version information display (current version, total versions)
- Version control buttons (History, Export, Import)
- Responsive design that works on mobile and desktop
- Clear visual feedback for editing state

### Save Functionality
- Changes are tracked and can be saved or reverted
- Unsaved changes warning when trying to logout
- Confirmation modal for saving changes
- Changes stored permanently in localStorage
- Automatic version creation on save

## How to Use

### Basic Editing
1. **Login:** Click the "Admin" button in the navigation
2. **Edit Text:** Click on any text content to edit it
3. **Save Changes:** Press Enter or click outside the input field
4. **Cancel Changes:** Press Escape while editing
5. **Logout:** Click the "Logout" button in the admin controls

### Version Management
1. **View History:** Click "Version History" in admin controls
2. **Restore Version:** Click "Restore" next to any version
3. **Export Changes:** Click "Export Changes" to download current state
4. **Import Changes:** Click "Import Changes" to load from a JSON file

### Permanent Deployment
1. **Save Changes:** Use the admin interface to save your changes
2. **Export Changes:** Click "Export Changes" in admin controls
3. **Save File:** Save the exported JSON as `saved-changes.json`
4. **Run Deployment:** Execute `node deploy-changes.js`
5. **Commit to GitHub:** Push the updated files to deploy to GitHub Pages

## Editable Content

The following content is editable when logged in as admin:

### Home Page (index.html)
- Hero section text (headlines, descriptions)
- "Find Your Edge" section content
- Neighborhood spotlight titles and descriptions
- Service descriptions and titles
- Category features and descriptions
- Footer information

### About Page (about.html)
- Hero section content
- Company story and mission
- Team member information
- Statistics and values
- Call-to-action content

## Version Control Details

### Version Structure
Each version contains:
- **ID:** Unique version number
- **Timestamp:** When the version was created
- **Changes:** Object containing all text changes
- **Description:** Human-readable description
- **Page:** Which page the changes were made on

### Storage
- **LocalStorage Keys:**
  - `wolf_pm_versions`: Version history array
  - `wolf_pm_changes`: Current saved changes
  - `wolf_pm_current_version`: Current version number
- **Maximum Versions:** 10 (oldest automatically removed)
- **Persistence:** Survives browser restarts

### Export/Import Format
```json
{
  "changes": {
    "element-id": "new text content"
  },
  "version": 5,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "page": "/index.html"
}
```

## Deployment Process

### For GitHub Pages
1. **Make Changes:** Use the admin interface to edit content
2. **Save Changes:** Click save to create a new version
3. **Export Changes:** Download the changes as JSON
4. **Run Deployment Script:**
   ```bash
   node deploy-changes.js
   ```
5. **Review Changes:** Check the updated HTML files
6. **Commit to Git:**
   ```bash
   git add .
   git commit -m "Apply admin changes - version X"
   git push origin main
   ```
7. **Deploy:** Changes will be live on GitHub Pages in a few minutes

### Deployment Script Features
- **Automatic Backups:** Creates timestamped backups before applying changes
- **Change Tracking:** Shows exactly what changes were applied
- **Error Handling:** Graceful error handling with rollback options
- **Validation:** Checks file existence and validates changes

## Technical Details

### Security Notes
- This is a frontend-only implementation for demonstration
- In production, authentication should be server-side
- Admin credentials should be stored securely
- Changes should be saved to a database
- Version control should be server-side for production

### Browser Compatibility
- Modern browsers with ES6 support
- localStorage for session management and version storage
- CSS Grid and Flexbox for layout
- File API for import/export functionality

### File Structure
- `index.html` - Main page with admin functionality
- `about.html` - About page with admin functionality
- `style.css` - Styles including admin interface and version controls
- `script.js` - JavaScript with admin system and version control logic
- `deploy-changes.js` - Node.js script for permanent deployment
- `README.md` - This documentation file

### Storage Limits
- **localStorage:** ~5-10MB (varies by browser)
- **Version History:** 10 versions maximum
- **Change Size:** Limited by localStorage capacity

## Troubleshooting

### Common Issues
1. **Changes not saving:** Check localStorage quota
2. **Version history missing:** Clear browser data may have removed it
3. **Import not working:** Ensure JSON file format is correct
4. **Deployment script errors:** Check file permissions and Node.js installation

### Recovery Options
1. **Restore from Version:** Use version history to restore
2. **Import Backup:** Use exported JSON file to restore
3. **Manual Restore:** Edit HTML files directly
4. **Git Restore:** Use `git checkout` to restore from repository

## Future Enhancements

- Server-side authentication and data persistence
- Real-time collaboration features
- Image upload and editing capabilities
- Rich text editor for complex content
- User management system with roles
- Advanced version control with branching
- Automated deployment to multiple environments
- Change approval workflow
- Backup and restore functionality
- Analytics and change tracking 