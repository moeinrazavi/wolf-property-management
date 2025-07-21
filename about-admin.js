/**
 * About Page Admin Manager
 * Handles admin functionality for the about page including:
 * - Database-backed team member management
 * - Image assignment from bucket to team members
 * - Adding new team members
 * - Text editing in admin mode
 * - Saving changes permanently to Supabase
 */

import dbService from './supabase-client.js';
import adminVersionControlUI from './admin-version-control-ui.js';

class AboutAdminManager {
    constructor() {
        this.dbService = dbService;
        this.isInitialized = false;
        this.isLoading = false; // Add loading flag to prevent concurrent calls
        this.currentImageSelector = null;
        this.currentTeamMemberId = null;
        this.teamMembers = [];
        this.originalTeamMembers = [];
        this.pendingChanges = {
            modified: new Map(), // memberId -> changes
            added: [],           // new team members
            deleted: new Set()   // deleted member IDs
        };
        this.hasUnsavedChanges = false;
    }

    /**
     * Initialize the about admin manager
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ About Admin Manager already initialized, skipping...');
            return;
        }
        
        console.log('📋 Initializing About Admin Manager...');
        
        try {
            // Initialize database table if needed
            await this.initializeDatabase();
            
            // Only load team members if not already loaded
            if (this.teamMembers.length === 0) {
                await this.loadTeamMembersFromDatabase();
            } else {
                console.log('📋 Team members already loaded, re-rendering...');
                await this.renderTeamMembers();
            }
            
            // Set up admin interface
            this.addAdminControls();
            this.addEventListeners();
            
            this.isInitialized = true;
            console.log('✅ About Admin Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize About Admin Manager:', error);
            throw error;
        }
    }

    /**
     * Initialize database table
     */
    async initializeDatabase() {
        console.log('🔧 Initializing team members database...');
        const result = await this.dbService.initializeTeamMembersTable();
        
        if (!result.success && result.sql) {
            console.warn('⚠️ Database table needs to be created manually');
            console.log('Please run this SQL in your Supabase SQL Editor:');
            console.log(result.sql);
            
            // Show alert to user
            alert('Database setup required!\n\nThe team_members table needs to be created. Please:\n\n1. Go to your Supabase dashboard\n2. Open SQL Editor\n3. Run the SQL script shown in the browser console\n4. Refresh the page');
            return;
        }
        
        if (result.success) {
            console.log('✅ Database initialized successfully');
        }
    }

    /**
     * Load team members from database and render them
     */
    async loadTeamMembersFromDatabase() {
        // Prevent concurrent loading calls
        if (this.isLoading) {
            console.log('⚠️ Already loading team members, skipping...');
            return;
        }
        
        this.isLoading = true;
        console.log('📋 Loading team members from database...');
        
        try {
            const { teamMembers, error } = await this.dbService.getTeamMembers('about.html');
            
            if (error) {
                console.error('❌ Failed to load team members:', error);
                return;
            }
            
            // Store both current and original copies
            this.teamMembers = teamMembers;
            this.originalTeamMembers = JSON.parse(JSON.stringify(teamMembers)); // Deep copy
            console.log(`✅ Loaded ${teamMembers.length} team members from database`);
            
            // Clear any pending changes
            this.clearPendingChanges();
            
            // Render team members
            await this.renderTeamMembers();
        } catch (error) {
            console.error('❌ Error loading team members:', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Clear all pending changes
     */
    clearPendingChanges() {
        this.pendingChanges = {
            modified: new Map(),
            added: [],
            deleted: new Set()
        };
        this.hasUnsavedChanges = false;
        this.updateSaveButton();
    }

    /**
     * Get pending changes in format expected by version control system
     */
    getPendingChangesForVersionControl() {
        if (!this.hasUnsavedChanges) {
            return null;
        }
        
        console.log('📋 Providing pending team changes to version control:');
        console.log(`   - Modified: ${this.pendingChanges.modified.size} members`);
        console.log(`   - Added: ${this.pendingChanges.added.length} members`);
        console.log(`   - Deleted: ${this.pendingChanges.deleted.size} members`);
        
        return {
            added: [...this.pendingChanges.added],
            modified: this.pendingChanges.modified instanceof Map ? 
                Object.fromEntries(this.pendingChanges.modified) : 
                this.pendingChanges.modified,
            deleted: [...this.pendingChanges.deleted]
        };
    }

    /**
     * Render team members in the about page
     */
    async renderTeamMembers() {
        const teamSection = document.querySelector('.team-members .container');
        const sectionHeader = teamSection.querySelector('.section-header');
        
        if (!teamSection || !sectionHeader) {
            console.error('❌ Team section not found');
            return;
        }
        
        // Remove existing team members
        const existingMembers = teamSection.querySelectorAll('.team-member');
        existingMembers.forEach(member => member.remove());
        
        // Render each team member
        for (const member of this.teamMembers) {
            const memberElement = await this.createTeamMemberElement(member);
            sectionHeader.insertAdjacentElement('afterend', memberElement);
        }
        
        console.log(`✅ Rendered ${this.teamMembers.length} team members`);
    }

    /**
     * Create a team member HTML element
     */
    async createTeamMemberElement(member) {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'team-member';
        memberDiv.dataset.memberId = member.id;
        memberDiv.setAttribute('data-aos', 'fade-up');
        memberDiv.setAttribute('data-aos-delay', `${member.sort_order * 100}`);
        
        console.log(`CREATING ELEMENT for ${member.name}:`);
        console.log(`  - DB image_url: ${member.image_url}`);
        console.log(`  - DB image_filename: ${member.image_filename}`);

        // Check if member is marked for deletion
        const isMarkedForDeletion = this.pendingChanges.deleted.has(member.id);
        if (isMarkedForDeletion) {
            memberDiv.classList.add('pending-deletion');
        }
        
        // Get proper image URL. If it's from our private bucket, we need to generate a signed URL for it.
        let imageUrl = member.image_url || 'https://via.placeholder.com/300x300/e0e0e0/999999?text=No+Image';
        if (member.image_filename) {
            console.log(`  - Attempting to get signed URL for bucket path: '${member.image_filename}'`);
            try {
                // Always generate a fresh signed URL on page load for private images
                const signedUrl = await this.dbService.getFileUrl('wolf-property-images', member.image_filename, true);
                if (signedUrl) {
                    imageUrl = signedUrl;
                    console.log(`  - SUCCESS: Generated signed URL:`, imageUrl);
                } else {
                    console.warn(`  - FAILED: getFileUrl returned null or undefined for '${member.image_filename}'`);
                }
            } catch (error) {
                console.error(`  - ERROR: Could not get signed URL for image: ${member.image_filename}`, error);
            }
        }
        
        // Add pending indicator for new/unsaved/deleted members
        const isPending = member.isNew || this.pendingChanges.modified.has(member.id);
        let pendingBadge = '';
        
        if (isMarkedForDeletion) {
            pendingBadge = `
                <div class="pending-badge pending-deleted">
                    <span>🗑️ MARKED FOR DELETION</span>
                    <small>This member will be permanently deleted when you save changes</small>
                    <button class="restore-member-btn" data-member-id="${member.id}" title="Cancel deletion">↶ Restore</button>
                </div>
            `;
        } else if (member.isNew) {
            pendingBadge = `
                <div class="pending-badge pending-new">
                    <span>📝 NEW - Not Saved</span>
                    <small>This member will disappear if you refresh without saving</small>
                    <button class="remove-pending-btn" data-member-id="${member.id}" title="Remove this unsaved member">✕</button>
                </div>
            `;
        } else if (isPending) {
            pendingBadge = `
                <div class="pending-badge pending-modified">
                    <span>✏️ Modified - Not Saved</span>
                </div>
            `;
        }

        memberDiv.innerHTML = `
            ${pendingBadge}
            <div class="team-member-image ${member.isNew ? 'pending-new-border' : ''}">
                <img src="${imageUrl}" alt="${member.name}" data-member-id="${member.id}" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x300/e0e0e0/999999?text=Load+Error';">
                <div class="image-overlay"></div>
            </div>
            <div class="team-member-info">
                <h3 data-member-id="${member.id}" data-field="name">${member.name}</h3>
                <p class="position" data-member-id="${member.id}" data-field="position">${member.position}</p>
                <div class="team-member-bio">
                    <p data-member-id="${member.id}" data-field="bio">${member.bio || ''}</p>
                    ${member.bio_paragraph_2 ? `<p data-member-id="${member.id}" data-field="bio_paragraph_2">${member.bio_paragraph_2}</p>` : ''}
                </div>
                <div class="social-links">
                    <a href="${member.linkedin_url || '#'}" class="social-link">LinkedIn</a>
                    <a href="${member.email ? `mailto:${member.email}` : '#'}" class="social-link">Email</a>
                </div>
            </div>
        `;
        
        // Add admin functionality if in admin mode
        if (document.body.classList.contains('admin-mode')) {
            this.makeTeamMemberEditable(memberDiv);
            this.addDeleteButton(memberDiv, member);
        }
        
        return memberDiv;
    }

    /**
     * Make a team member element editable in admin mode
     */
    makeTeamMemberEditable(memberElement) {
        const memberId = memberElement.dataset.memberId;
        
        // Make image clickable
        const imageContainer = memberElement.querySelector('.team-member-image');
        if (imageContainer) {
            imageContainer.classList.add('admin-image-editable');
            imageContainer.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖼️ Image clicked for member:', memberId);
                const img = imageContainer.querySelector('img');
                this.showImageSelector(img, memberId);
            });
        }
        
        // Make text elements editable
        const editableElements = memberElement.querySelectorAll('[data-field]');
        editableElements.forEach(element => {
            this.makeElementEditable(element, memberId);
        });
    }

    /**
     * Add admin controls specific to about page
     */
    addAdminControls() {
        const adminControls = document.querySelector('.admin-controls-content');
        if (!adminControls) {
            console.warn('❌ Admin controls not found');
            return;
        }

        // Check if controls already exist
        if (document.getElementById('about-admin-controls')) {
            console.log('⚠️ About admin controls already exist, skipping...');
            return;
        }

        const aboutControls = document.createElement('div');
        aboutControls.id = 'about-admin-controls';
        aboutControls.className = 'about-admin-controls';
        aboutControls.innerHTML = `
            <div class="about-admin-section">
                <h4>👥 Team Management</h4>
                <p style="color: rgba(255, 255, 255, 0.8); font-size: 14px; margin: 0 0 15px 0;">
                    Click on team member images to assign from bucket. Click text to edit. Changes are held until you save.
                </p>
                <div class="about-admin-buttons">
                    <button id="add-team-member-btn" class="btn btn-primary" style="background-color: #27ae60; margin-right: 10px;">
                        ➕ Add Team Member
                    </button>
                    <!-- Save button removed - using universal version control save button -->
                </div>
                <div id="changes-status" style="margin-top: 10px; font-size: 12px; color: rgba(255, 255, 255, 0.6);">
                    Changes are saved with version history for easy reverting
                </div>
            </div>
        `;

        adminControls.appendChild(aboutControls);
    }

    /**
     * Make team member images clickable for assignment
     */
    makeImagesClickable() {
        const teamMemberImages = document.querySelectorAll('.team-member-image img');
        
        teamMemberImages.forEach(img => {
            // Add visual indicator for admin mode - use CSS classes instead of inline styles
            img.style.cursor = 'pointer';
            img.classList.add('admin-clickable-image');
            
            // Add click handler
            img.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showImageSelector(img);
            });
        });

        console.log(`✅ Made ${teamMemberImages.length} team member images clickable`);
    }

    /**
     * Make text content editable
     */
    makeTextEditable() {
        const editableSelectors = [
            '.team-member-info h3',
            '.team-member-info .position', 
            '.team-member-bio p',
            '.about-text p',
            '.value-card h3',
            '.value-card p'
        ];

        editableSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                this.makeElementEditable(element);
            });
        });

        console.log(`✅ Made text elements editable`);
    }

    /**
     * Make a single element editable
     */
    makeElementEditable(element, memberId) {
        element.style.cursor = 'text';
        element.style.border = '1px dashed rgba(52, 152, 219, 0.3)';
        element.style.padding = '5px';
        element.style.borderRadius = '3px';
        element.style.transition = 'all 0.3s ease';
        
        // Store original content
        element.dataset.originalContent = element.innerHTML;

        element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editElement(element, memberId);
        });

        element.addEventListener('mouseenter', () => {
            element.style.border = '1px dashed rgba(52, 152, 219, 0.6)';
            element.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
        });

        element.addEventListener('mouseleave', () => {
            if (!element.contentEditable || element.contentEditable === 'false') {
                element.style.border = '1px dashed rgba(52, 152, 219, 0.3)';
                element.style.backgroundColor = 'transparent';
            }
        });
    }

    /**
     * Edit a text element
     */
    editElement(element, memberId) {
        if (element.contentEditable === 'true') return;

        element.contentEditable = true;
        element.style.border = '2px solid #3498db';
        element.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
        element.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        const finishEditing = () => {
            element.contentEditable = false;
            element.style.border = '1px dashed rgba(52, 152, 219, 0.3)';
            element.style.backgroundColor = 'transparent';
            
            // Check if content changed
            const originalContent = element.dataset.originalContent;
            const newContent = element.innerHTML;
            
            if (originalContent !== newContent) {
                this.saveFieldChange(memberId, element.dataset.field, newContent);
                element.dataset.originalContent = newContent;
            }
        };

        // Add real-time validation while typing
        element.addEventListener('input', () => {
            this.showFieldLengthWarning(element, memberId);
        });

        element.addEventListener('blur', finishEditing, { once: true });
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                element.blur();
            } else if (e.key === 'Escape') {
                element.innerHTML = element.dataset.originalContent;
                element.blur();
            }
        }, { once: true });
    }

    /**
     * Track a field change as pending
     */
    saveFieldChange(memberId, fieldName, newValue) {
        console.log(`📝 Tracking field change: ${fieldName} for member ${memberId}`);
        
        // Find the team member
        const member = this.teamMembers.find(m => m.id === memberId);
        if (!member) {
            console.error('❌ Team member not found');
            return;
        }
        
        // Validate field length
        const validation = this.validateFieldLength(fieldName, newValue);
        if (!validation.valid) {
            alert(`❌ ${validation.error}\n\nPlease shorten the content before saving.`);
            return;
        }
        
        // Track the change as pending
        this.trackMemberChange(memberId, { [fieldName]: newValue });
        
        // Update the field locally
        member[fieldName] = newValue;
        
        console.log('✅ Field change tracked as pending');
    }

    /**
     * Validate field length based on database constraints
     */
    validateFieldLength(fieldName, value) {
        if (!value) return { valid: true };
        
        const textValue = typeof value === 'string' ? value : value.toString();
        let maxLength;
        
        // Set maximum lengths based on database schema
        switch (fieldName) {
            case 'name':
            case 'position':
            case 'image_filename':
                maxLength = 500;
                break;
            case 'bio':
            case 'bio_paragraph_2':
                maxLength = 10000; // TEXT fields can be very long
                break;
            case 'linkedin_url':
            case 'email':
                maxLength = 2000; // TEXT fields
                break;
            case 'page_name':
                maxLength = 200;
                break;
            default:
                // Default for any other potential fields
                maxLength = 1000;
        }
        
        if (textValue.length > maxLength) {
            return {
                valid: false,
                error: `${fieldName.replace('_', ' ')} is too long (${textValue.length} characters). Maximum allowed: ${maxLength} characters.`
            };
        }
        
        return { valid: true };
    }

    /**
     * Show real-time field length warning while editing
     */
    showFieldLengthWarning(element, memberId) {
        const fieldName = element.dataset.field;
        const textContent = element.textContent || element.innerText || '';
        
        // Remove existing warning
        const existingWarning = element.parentNode.querySelector('.length-warning');
        if (existingWarning) {
            existingWarning.remove();
        }
        
        const validation = this.validateFieldLength(fieldName, textContent);
        
        // Show warning if approaching limit (90% of max) or exceeding
        if (textContent.length > 0) {
            let maxLength;
            switch (fieldName) {
                case 'name':
                case 'position':
                case 'image_filename':
                    maxLength = 500;
                    break;
                case 'bio':
                case 'bio_paragraph_2':
                    maxLength = 10000;
                    break;
                case 'linkedin_url':
                case 'email':
                    maxLength = 2000;
                    break;
                case 'page_name':
                    maxLength = 200;
                    break;
                default:
                    maxLength = 500;
            }
            
            if (textContent.length > maxLength * 0.9 || !validation.valid) {
                const warning = document.createElement('div');
                warning.className = 'length-warning';
                warning.style.cssText = `
                    position: absolute;
                    top: 100%;
                    left: 0;
                    background: ${!validation.valid ? '#e74c3c' : '#f39c12'};
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 1000;
                    white-space: nowrap;
                    margin-top: 2px;
                `;
                
                if (!validation.valid) {
                    warning.textContent = `⚠️ Too long! ${textContent.length}/${maxLength} chars`;
                    element.style.border = '2px solid #e74c3c';
                } else {
                    warning.textContent = `⚠️ ${textContent.length}/${maxLength} chars`;
                    element.style.border = '2px solid #f39c12';
                }
                
                // Position relative to element
                element.parentNode.style.position = 'relative';
                element.parentNode.appendChild(warning);
                
                // Auto-hide after 3 seconds if not exceeding limit
                if (validation.valid) {
                    setTimeout(() => {
                        if (warning.parentNode) {
                            warning.remove();
                        }
                    }, 3000);
                }
            } else {
                element.style.border = '2px solid #3498db';
            }
        }
    }

    /**
     * Track a change to a team member
     */
    trackMemberChange(memberId, changes) {
        // Get existing changes for this member or create new
        const existingChanges = this.pendingChanges.modified.get(memberId) || {};
        
        // Merge the new changes
        const updatedChanges = { ...existingChanges, ...changes };
        
        // Store the changes
        this.pendingChanges.modified.set(memberId, updatedChanges);
        
        // Track in optimized version control system
        if (adminVersionControlUI.isReady()) {
            const member = this.teamMembers.find(m => m.id === memberId);
            adminVersionControlUI.getVersionManager().trackChange(
                `team_member_${memberId}`,
                JSON.stringify(existingChanges),
                JSON.stringify(updatedChanges),
                'update',
                {
                    memberName: member ? member.name : 'Unknown',
                    page: 'about.html',
                    contentType: 'team_member',
                    timestamp: new Date().toISOString()
                }
            );
        }
        
        // Mark as having unsaved changes
        this.hasUnsavedChanges = true;
        this.updateSaveButton();
        
        // Update visual indicators for this member
        this.updateMemberPendingIndicator(memberId);
        
        console.log(`📝 Tracked changes for member ${memberId}:`, updatedChanges);
    }

    /**
     * Update pending indicator for a specific member
     */
    updateMemberPendingIndicator(memberId) {
        const memberElement = document.querySelector(`[data-member-id="${memberId}"]`);
        if (!memberElement) return;

        const teamMemberDiv = memberElement.closest('.team-member');
        if (!teamMemberDiv) return;

        // Check if this member has pending changes
        const hasChanges = this.pendingChanges.modified.has(memberId);
        const isNew = this.teamMembers.find(m => m.id === memberId)?.isNew;
        const isMarkedForDeletion = this.pendingChanges.deleted.has(memberId);

        // Update deletion state class
        if (isMarkedForDeletion) {
            teamMemberDiv.classList.add('pending-deletion');
        } else {
            teamMemberDiv.classList.remove('pending-deletion');
        }

        // Remove existing badge
        const existingBadge = teamMemberDiv.querySelector('.pending-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Manage delete button visibility
        const existingDeleteBtn = teamMemberDiv.querySelector('.delete-member-btn');
        if (isMarkedForDeletion && existingDeleteBtn) {
            existingDeleteBtn.remove();
        } else if (!isMarkedForDeletion && !existingDeleteBtn && document.body.classList.contains('admin-mode')) {
            const member = this.teamMembers.find(m => m.id === memberId);
            if (member) {
                this.addDeleteButton(teamMemberDiv, member);
            }
        }

        // Add appropriate badge if needed
        if (isNew || hasChanges || isMarkedForDeletion) {
            const badge = document.createElement('div');
            let badgeClass = 'pending-badge';
            if (isMarkedForDeletion) badgeClass += ' pending-deleted';
            else if (isNew) badgeClass += ' pending-new';
            else if (hasChanges) badgeClass += ' pending-modified';
            badge.className = badgeClass;
            
            if (isMarkedForDeletion) {
                badge.innerHTML = `
                    <span>🗑️ MARKED FOR DELETION</span>
                    <small>This member will be permanently deleted when you save changes</small>
                    <button class="restore-member-btn" data-member-id="${memberId}" title="Cancel deletion">↶ Restore</button>
                `;
            } else if (isNew) {
                badge.innerHTML = `
                    <span>📝 NEW - Not Saved</span>
                    <small>This member will disappear if you refresh without saving</small>
                    <button class="remove-pending-btn" data-member-id="${memberId}" title="Remove this unsaved member">✕</button>
                `;
            } else {
                badge.innerHTML = `
                    <span>✏️ Modified - Not Saved</span>
                `;
            }
            
            teamMemberDiv.insertBefore(badge, teamMemberDiv.firstChild);
        }
    }

    /**
     * Update the team status display (save button now handled by version control UI)
     */
    updateSaveButton() {
        const statusDiv = document.getElementById('changes-status');
        
        if (!statusDiv) return;
        
        if (this.hasUnsavedChanges) {
            const changeCount = this.pendingChanges.modified.size + 
                               this.pendingChanges.added.length + 
                               this.pendingChanges.deleted.size;
            
            const newMemberCount = this.pendingChanges.added.length;
            const warningText = newMemberCount > 0 
                ? `⚠️ ${changeCount} team change(s) including ${newMemberCount} new member(s) - Use main Save Changes button`
                : `⚠️ ${changeCount} team change(s) - Use main Save Changes button`;
                
            statusDiv.innerHTML = `
                <div style="color: rgba(255, 193, 7, 0.9); font-weight: bold; margin-bottom: 5px;">
                    ${warningText}
                </div>
                <div style="color: rgba(255, 255, 255, 0.8); font-size: 11px;">
                    Team changes tracked in main version control system
                </div>
            `;
        } else {
            statusDiv.innerHTML = `
                <div style="color: rgba(255, 255, 255, 0.6);">
                    Team changes are tracked in the main version control system
                </div>
            `;
        }
    }



    /**
     * Show image selector modal
     */
    async showImageSelector(targetImg, memberId) {
        console.log('Using global image browser for team member image selection...');
        
        if (!window.adminImageManager) {
            console.error('❌ Admin Image Manager is not available on the window object');
            alert('Error: Image manager not found. Please refresh the page.');
            return;
        }

        this.currentImageSelector = targetImg;
        this.currentTeamMemberId = memberId;
        
        // Use the global image browser with a callback
        window.adminImageManager.showImageBrowser(({ publicUrl, signedUrl, filename }) => {
            console.log('✅ Image selected from global browser:', { publicUrl, signedUrl, filename });
            this.assignImageToTeamMember(publicUrl, signedUrl, filename);
        });
    }

    /**
     * Assign selected image to team member
     */
    async assignImageToTeamMember(publicUrl, signedUrl, filename) {
        if (!this.currentImageSelector || !this.currentTeamMemberId) return;

        console.log('🖼️ ASSIGNING IMAGE...');
        console.log(`  - Member ID: ${this.currentTeamMemberId}`);
        console.log(`  - Filename: ${filename}`);
        console.log(`  - Permanent URL (to save): ${publicUrl}`);
        console.log(`  - Temporary URL (for display): ${signedUrl}`);
        
        try {
            // Find the team member in our data
            const member = this.teamMembers.find(m => m.id === this.currentTeamMemberId);
            if (!member) {
                console.error('❌ Team member not found for assignment.');
                return;
            }
            
            // The path within the bucket is what's important. Extract it.
            // Example publicUrl: https://[project].supabase.co/storage/v1/object/public/wolf-property-images/people/new-image.png
            // We need to save the path: "people/new-image.png"
            const urlParts = new URL(publicUrl);
            // The path after the bucket name is the part to save.
            const bucketPath = urlParts.pathname.split('/wolf-property-images/')[1];

            console.log(`  - Extracted Bucket Path (to save): ${bucketPath}`);

            const changes = {
                image_url: publicUrl, // Keep the full public URL for potential direct use
                image_filename: bucketPath // **CRITICAL FIX**: Save the bucket path, not just the filename
            };

            // Track the change as pending
            this.trackMemberChange(this.currentTeamMemberId, changes);
            
            // Update the member data locally
            member.image_url = publicUrl;
            member.image_filename = bucketPath;
            
            // Update the UI with the temporary signed URL for immediate display
            this.currentImageSelector.src = signedUrl;
            this.currentImageSelector.alt = member.name;
            
            // Visual feedback
            this.currentImageSelector.style.border = '3px solid #f39c12';
            setTimeout(() => {
                if (this.currentImageSelector) {
                    this.currentImageSelector.style.border = '';
                }
            }, 2000);
            
            console.log('✅ Image assignment tracked as pending.');
            
        } catch (error) {
            console.error('❌ Error during image assignment:', error);
            alert(`Error assigning image: ${error.message}`);
        }
    }

    /**
     * Remove a pending (unsaved) team member
     */
    removePendingMember(memberId) {
        console.log('🗑️ Removing pending team member:', memberId);
        
        // Find the member
        const memberIndex = this.teamMembers.findIndex(m => m.id === memberId);
        if (memberIndex === -1) {
            console.error('❌ Member not found in local data');
            return;
        }
        
        const member = this.teamMembers[memberIndex];
        
        // Only allow removal of new (unsaved) members
        if (!member.isNew) {
            console.error('❌ Cannot remove saved team member');
            alert('Cannot remove saved team members. Use edit to modify existing members.');
            return;
        }
        
        // Confirm removal
        if (!confirm(`Remove "${member.name}"?\n\nThis unsaved team member will be permanently removed.`)) {
            return;
        }
        
        // Remove from local data
        this.teamMembers.splice(memberIndex, 1);
        
        // Remove from pending added list
        const addedIndex = this.pendingChanges.added.findIndex(m => m.id === memberId);
        if (addedIndex !== -1) {
            this.pendingChanges.added.splice(addedIndex, 1);
        }
        
        // Remove from DOM
        const memberElement = document.querySelector(`[data-member-id="${memberId}"]`);
        if (memberElement) {
            const teamMemberDiv = memberElement.closest('.team-member');
            if (teamMemberDiv) {
                teamMemberDiv.remove();
            }
        }
        
        // Update UI state
        this.hasUnsavedChanges = this.pendingChanges.added.length > 0 || 
                                 this.pendingChanges.modified.size > 0 || 
                                 this.pendingChanges.deleted.size > 0;
        this.updateSaveButton();
        
        console.log('✅ Pending team member removed');
    }

    /**
     * Add new team member (pending)
     */
    async addTeamMember() {
        console.log('➕ Adding new team member (pending)');
        
        try {
            // Create temporary ID for new member
            const tempId = `temp_${Date.now()}`;
            
            // Create new team member data
            const newMemberData = {
                id: tempId,
                name: 'New Team Member',
                position: 'Position Title',
                bio: 'Click to edit this team member\'s biography. Add details about their background, experience, and role in the company.',
                bio_paragraph_2: 'You can add multiple paragraphs to describe their professional achievements and personal interests.',
                image_url: 'https://via.placeholder.com/300x300/e0e0e0/999999?text=Click+to+Add+Photo',
                image_filename: null,
                linkedin_url: '#',
                email: '#',
                sort_order: this.teamMembers.length + 1,
                is_active: true,
                page_name: 'about.html',
                isNew: true // Mark as new for UI purposes
            };
            
            // Add to pending changes
            this.pendingChanges.added.push(newMemberData);
            
            // Track in optimized version control system
            if (adminVersionControlUI.isReady()) {
                adminVersionControlUI.getVersionManager().trackChange(
                    `team_member_${tempId}`,
                    null, // no previous value
                    JSON.stringify(newMemberData),
                    'create',
                    {
                        action: 'add',
                        memberName: newMemberData.name,
                        page: 'about.html',
                        contentType: 'team_member',
                        timestamp: new Date().toISOString()
                    }
                );
            }
            
            this.hasUnsavedChanges = true;
            this.updateSaveButton();
            
            // Add to our local data
            this.teamMembers.push(newMemberData);
            
            // Create and add the new member element
            const memberElement = await this.createTeamMemberElement(newMemberData);
            
            const teamSection = document.querySelector('.team-members .container');
            const sectionHeader = teamSection.querySelector('.section-header');
            sectionHeader.insertAdjacentElement('afterend', memberElement);
            
            console.log('✅ New team member added to pending changes');
            
            // Scroll to new member
            memberElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
        } catch (error) {
            console.error('❌ Error adding team member:', error);
            alert(`Error adding team member: ${error.message}`);
        }
    }

    /**
     * Add delete button to a team member element
     */
    addDeleteButton(memberElement, member) {
        // Don't add delete button if member is already marked for deletion
        if (this.pendingChanges.deleted.has(member.id)) {
            return;
        }

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-member-btn';
        deleteButton.innerHTML = '🗑️';
        deleteButton.setAttribute('title', 'Mark for deletion');
        deleteButton.setAttribute('data-member-id', member.id);

        memberElement.appendChild(deleteButton);

        deleteButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.markMemberForDeletion(member.id);
        });
    }

    /**
     * Mark a team member for deletion
     */
    markMemberForDeletion(memberId) {
        console.log('🗑️ Marking member for deletion:', memberId);
        
        const member = this.teamMembers.find(m => m.id === memberId);
        if (!member) {
            console.error('❌ Member not found');
            return;
        }

        // Confirm deletion
        if (!confirm(`Mark "${member.name}" for deletion?\n\nThis member will be permanently deleted when you save changes.`)) {
            return;
        }
        
        // If this is a new (unsaved) member, just remove it completely
        if (member.isNew) {
            this.removePendingMember(memberId);
            return;
        }
        
        // Add to pending deleted list
        this.pendingChanges.deleted.add(memberId);
        
        // Remove from modified list if it exists there
        this.pendingChanges.modified.delete(memberId);
        
        // Track in optimized version control system
        if (adminVersionControlUI.isReady()) {
            adminVersionControlUI.getVersionManager().trackChange(
                `team_member_${memberId}`,
                JSON.stringify(member), // old value
                null, // new value (deleted)
                'delete',
                {
                    action: 'delete',
                    memberName: member.name,
                    page: 'about.html',
                    contentType: 'team_member',
                    timestamp: new Date().toISOString()
                }
            );
        }
        
        // Update UI - re-render the specific member
        const memberElement = document.querySelector(`[data-member-id="${memberId}"]`);
        if (memberElement) {
            memberElement.classList.add('pending-deletion');
            
            // Remove delete button and add restore UI
            const deleteBtn = memberElement.querySelector('.delete-member-btn');
            if (deleteBtn) {
                deleteBtn.remove();
            }
        }
        
        // Update pending indicator
        this.updateMemberPendingIndicator(memberId);
        
        // Mark as having unsaved changes
        this.hasUnsavedChanges = true;
        this.updateSaveButton();
        
        console.log('✅ Member marked for deletion');
    }

    /**
     * Restore a team member from deletion
     */
    async restoreMember(memberId) {
        console.log('↶ Restoring member from deletion:', memberId);
        
        const member = this.teamMembers.find(m => m.id === memberId);
        if (!member) {
            console.error('❌ Member not found');
            return;
        }
        
        // Remove from pending deleted list
        this.pendingChanges.deleted.delete(memberId);
        
        // Track in optimized version control system
        if (adminVersionControlUI.isReady()) {
            adminVersionControlUI.getVersionManager().trackChange(
                `team_member_${memberId}`,
                null, // old value (was deleted)
                JSON.stringify(member), // new value (restored)
                'create',
                {
                    action: 'restore',
                    memberName: member.name,
                    page: 'about.html',
                    contentType: 'team_member',
                    timestamp: new Date().toISOString()
                }
            );
        }
        
        // Update UI - remove pending deletion state
        const memberElement = document.querySelector(`[data-member-id="${memberId}"]`);
        if (memberElement) {
            memberElement.classList.remove('pending-deletion');
            
            // Re-add delete button if in admin mode
            if (document.body.classList.contains('admin-mode')) {
                this.addDeleteButton(memberElement, member);
            }
        }
        
        // Update pending indicator
        this.updateMemberPendingIndicator(memberId);
        
        // Mark as having unsaved changes
        this.hasUnsavedChanges = this.pendingChanges.added.length > 0 || 
                                 this.pendingChanges.modified.size > 0 || 
                                 this.pendingChanges.deleted.size > 0;
        this.updateSaveButton();
        
        console.log('✅ Member restored from deletion');
    }


    /**
     * Add event listeners
     */
    addEventListeners() {
        // Add team member button
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'add-team-member-btn') {
                e.preventDefault();
                this.addTeamMember();
            }
        });

        // Save functionality now handled by universal version control save button

        // Remove pending member button
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('remove-pending-btn')) {
                e.preventDefault();
                const memberId = e.target.dataset.memberId;
                this.removePendingMember(memberId);
            }
        });

        // Restore member from deletion button
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('restore-member-btn')) {
                e.preventDefault();
                const memberId = e.target.dataset.memberId;
                this.restoreMember(memberId);
            }
        });
    }

    /**
     * Save all pending changes to database (called by universal save button)
     */
    async saveAllChanges() {
        if (!this.hasUnsavedChanges) {
            console.log('No team changes to save');
            return;
        }

        console.log('�� Saving all pending team changes...');
        
        try {
            // Defensive check: Ensure new members are not in the 'modified' list to prevent double-saving.
            for (const newMember of this.pendingChanges.added) {
                if (this.pendingChanges.modified.has(newMember.id)) {
                    console.warn(`New member ${newMember.name} was incorrectly in modified list. Removing to prevent duplication.`);
                    this.pendingChanges.modified.delete(newMember.id);
                }
            }

            // Save modified members
            for (const [memberId, memberChanges] of this.pendingChanges.modified) {
                const member = this.teamMembers.find(m => m.id === memberId);
                if (member) {
                    // Apply all changes to the member
                    Object.assign(member, memberChanges);
                    
                    // Save to database
                    const { error } = await this.dbService.saveTeamMember(member);
                    if (error) {
                        throw new Error(`Failed to save member ${member.name}: ${error}`);
                    }
                }
            }

            // Save new members (convert temp IDs to real IDs)
            const newMembersWithRealIds = [];
            for (const newMember of this.pendingChanges.added) {
                // Remove temporary fields before saving
                const { id: tempId, isNew, ...memberToSave } = newMember;

                const { teamMember, error } = await this.dbService.saveTeamMember(memberToSave);
                if (error) {
                    throw new Error(`Failed to save new member: ${error}`);
                }

                // Keep track of the mapping from temp ID to the newly saved member
                newMembersWithRealIds.push({ tempId, realMember: teamMember });
            }

            // Update local data: remove temp members and add real ones
            this.teamMembers = this.teamMembers.filter(m => !m.id.startsWith('temp_'));
            newMembersWithRealIds.forEach(({ realMember }) => {
                this.teamMembers.push(realMember);
            });


            // Handle deleted members (soft delete)
            for (const memberId of this.pendingChanges.deleted) {
                const { error } = await this.dbService.deleteTeamMember(memberId);
                if (error) {
                    throw new Error(`Failed to delete member: ${error}`);
                }
            }

            // Clear pending changes and re-render UI
            this.clearPendingChanges();
            await this.renderTeamMembers();

            console.log('✅ All team changes saved successfully');

        } catch (error) {
            console.error('❌ Failed to save team changes:', error);
            throw error; // Re-throw so universal save button can handle the error
        }
    }

    // Version control functions removed - replaced by new VersionControlManager

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.dbService.isAuthenticated();
    }

    /**
     * Clean up when leaving admin mode
     */
    cleanup() {
        // Remove admin styling from images
        const teamMemberImages = document.querySelectorAll('.team-member-image img');
        teamMemberImages.forEach(img => {
            img.style.cursor = '';
            img.classList.remove('admin-clickable-image');
            img.style.transition = '';
        });

        // Remove admin styling from text elements
        const editableElements = document.querySelectorAll('[data-field]');
        editableElements.forEach(element => {
            element.style.cursor = '';
            element.style.border = '';
            element.style.padding = '';
            element.style.borderRadius = '';
            element.style.transition = '';
            element.style.backgroundColor = '';
            element.contentEditable = false;
        });

        this.isInitialized = false;
    }
}

// Create global instance
const aboutAdminManager = new AboutAdminManager();

// Make globally available for debugging and integration
window.aboutAdminManager = aboutAdminManager;

// Auto-initialize when admin logs in
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on about page
    if (!window.location.pathname.includes('about.html')) {
        return;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'class' && 
                mutation.target === document.body) {
                
                if (document.body.classList.contains('admin-mode')) {
                    aboutAdminManager.initialize();
                } else {
                    aboutAdminManager.cleanup();
                }
            }
        });
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });

    // Initialize immediately if already in admin mode
    if (document.body.classList.contains('admin-mode')) {
        aboutAdminManager.initialize();
    } else {
        // Load team members for non-admin users (only if not already loaded)
        if (aboutAdminManager.teamMembers.length === 0) {
            aboutAdminManager.loadTeamMembersFromDatabase();
        }
    }

    // Prevent accidental loss of unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (aboutAdminManager.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes to team members. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
});

export default aboutAdminManager; 