# Wolf Property Management - Admin System

This website includes a comprehensive admin system that allows authorized users to edit text content directly on the website.

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

### User Interface
- Admin controls bar at the top of the page when logged in
- Responsive design that works on mobile and desktop
- Clear visual feedback for editing state

### Save Functionality
- Changes are tracked and can be saved or reverted
- Unsaved changes warning when trying to logout
- Confirmation modal for saving changes
- Changes stored in localStorage (demo purposes)

## How to Use

1. **Login:** Click the "Admin" button in the navigation
2. **Edit Text:** Click on any text content to edit it
3. **Save Changes:** Press Enter or click outside the input field
4. **Cancel Changes:** Press Escape while editing
5. **Logout:** Click the "Logout" button in the admin controls

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

## Technical Details

### Security Notes
- This is a frontend-only implementation for demonstration
- In production, authentication should be server-side
- Admin credentials should be stored securely
- Changes should be saved to a database

### Browser Compatibility
- Modern browsers with ES6 support
- localStorage for session management
- CSS Grid and Flexbox for layout

### File Structure
- `index.html` - Main page with admin functionality
- `about.html` - About page with admin functionality
- `style.css` - Styles including admin interface
- `script.js` - JavaScript with admin system logic

## Future Enhancements

- Server-side authentication and data persistence
- Image upload and editing capabilities
- Rich text editor for complex content
- User management system
- Change history and version control
- Backup and restore functionality 