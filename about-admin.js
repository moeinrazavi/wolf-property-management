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

class AboutAdminManager {
    constructor() {
        this.dbService = dbService;
        this.isInitialized = false;
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
            
            // Load team members from database
            await this.loadTeamMembersFromDatabase();
            
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
        console.log('📋 Loading team members from database...');
        
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
        
        // Get proper image URL (signed URL for private bucket)
        let imageUrl = member.image_url;
        if (member.image_filename && member.image_url.includes('wolf-property-images')) {
            try {
                const { signedUrl } = await this.dbService.getSignedUrl('wolf-property-images', `images/people/${member.image_filename}`);
                if (signedUrl) {
                    imageUrl = signedUrl;
                }
            } catch (error) {
                console.warn('Could not get signed URL for image:', member.image_filename);
            }
        }
        
        // Add pending indicator for new/unsaved members
        const isPending = member.isNew || this.pendingChanges.modified.has(member.id);
        const pendingBadge = member.isNew ? `
            <div class="pending-badge pending-new">
                <span>📝 NEW - Not Saved</span>
                <small>This member will disappear if you refresh without saving</small>
                <button class="remove-pending-btn" data-member-id="${member.id}" title="Remove this unsaved member">✕</button>
            </div>
        ` : (isPending ? `
            <div class="pending-badge pending-modified">
                <span>✏️ Modified - Not Saved</span>
            </div>
        ` : '');

        memberDiv.innerHTML = `
            ${pendingBadge}
            <div class="team-member-image ${member.isNew ? 'pending-new-border' : ''}">
                <img src="${imageUrl}" alt="${member.name}" data-member-id="${member.id}">
                <div class="image-overlay"></div>
            </div>
            <div class="team-member-info">
                <h3 data-member-id="${member.id}" data-field="name">${member.name}</h3>
                <p class="position" data-member-id="${member.id}" data-field="position">${member.position}</p>
                <div class="team-member-bio">
                    <p data-member-id="${member.id}" data-field="bio">${member.bio}</p>
                    ${member.bio_paragraph_2 ? `<p data-member-id="${member.id}" data-field="bio_paragraph_2">${member.bio_paragraph_2}</p>` : ''}
                </div>
                <div class="social-links">
                    <a href="${member.linkedin_url}" class="social-link">LinkedIn</a>
                    <a href="${member.email}" class="social-link">Email</a>
                </div>
            </div>
        `;
        
        // Add admin functionality if in admin mode
        if (document.body.classList.contains('admin-mode')) {
            this.makeTeamMemberEditable(memberDiv);
        }
        
        return memberDiv;
    }

    /**
     * Make a team member element editable in admin mode
     */
    makeTeamMemberEditable(memberElement) {
        const memberId = memberElement.dataset.memberId;
        
        // Make image clickable
        const img = memberElement.querySelector('.team-member-image img');
        if (img) {
            img.style.cursor = 'pointer';
            img.style.border = '3px dashed rgba(231, 76, 60, 0.5)';
            img.style.transition = 'all 0.3s ease';
            
            img.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖼️ Image clicked for member:', memberId);
                this.showImageSelector(img, memberId);
            });

            img.addEventListener('mouseenter', () => {
                img.style.border = '3px dashed rgba(231, 76, 60, 0.8)';
                img.style.transform = 'scale(1.05)';
            });

            img.addEventListener('mouseleave', () => {
                img.style.border = '3px dashed rgba(231, 76, 60, 0.5)';
                img.style.transform = 'scale(1)';
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
                    <button id="save-team-changes-btn" class="btn btn-primary" style="background-color: #e74c3c;" disabled>
                        💾 Save Changes
                    </button>
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
            // Add visual indicator for admin mode
            img.style.cursor = 'pointer';
            img.style.border = '3px dashed rgba(231, 76, 60, 0.5)';
            img.style.transition = 'all 0.3s ease';
            
            // Add click handler
            img.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showImageSelector(img);
            });

            // Add hover effect
            img.addEventListener('mouseenter', () => {
                img.style.border = '3px dashed rgba(231, 76, 60, 0.8)';
                img.style.transform = 'scale(1.05)';
            });

            img.addEventListener('mouseleave', () => {
                img.style.border = '3px dashed rgba(231, 76, 60, 0.5)';
                img.style.transform = 'scale(1)';
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
        
        // Track the change as pending
        this.trackMemberChange(memberId, { [fieldName]: newValue });
        
        // Update the field locally
        member[fieldName] = newValue;
        
        console.log('✅ Field change tracked as pending');
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
        const member = this.teamMembers.find(m => m.id === memberId);
        const isNew = member && member.isNew;

        // Remove existing badge
        const existingBadge = teamMemberDiv.querySelector('.pending-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Add appropriate badge if needed
        if (isNew || hasChanges) {
            const badge = document.createElement('div');
            badge.className = `pending-badge ${isNew ? 'pending-new' : 'pending-modified'}`;
            
            if (isNew) {
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
     * Update the save button state
     */
    updateSaveButton() {
        const saveBtn = document.getElementById('save-team-changes-btn');
        const statusDiv = document.getElementById('changes-status');
        
        if (!saveBtn || !statusDiv) return;
        
        if (this.hasUnsavedChanges) {
            saveBtn.disabled = false;
            saveBtn.style.background = '#e74c3c';
            saveBtn.style.animation = 'pulse 2s infinite';
            saveBtn.textContent = '💾 Save Changes (*)';
            
            const changeCount = this.pendingChanges.modified.size + 
                               this.pendingChanges.added.length + 
                               this.pendingChanges.deleted.size;
            
            const newMemberCount = this.pendingChanges.added.length;
            const warningText = newMemberCount > 0 
                ? `⚠️ ${changeCount} unsaved change(s) including ${newMemberCount} new member(s) - Will be lost if you refresh!`
                : `⚠️ ${changeCount} unsaved change(s) - Click save to create new version`;
                
            statusDiv.innerHTML = `
                <div style="color: rgba(255, 193, 7, 0.9); font-weight: bold; margin-bottom: 5px;">
                    ${warningText}
                </div>
                <div style="color: rgba(255, 255, 255, 0.8); font-size: 11px;">
                    New members and edits are temporary until saved
                </div>
            `;
        } else {
            saveBtn.disabled = true;
            saveBtn.style.background = '#6c757d';
            saveBtn.style.animation = 'none';
            saveBtn.textContent = '💾 Save Changes';
            
            statusDiv.innerHTML = `
                <div style="color: rgba(255, 255, 255, 0.6);">
                    Changes are saved with version history for easy reverting
                </div>
            `;
        }
    }



    /**
     * Show image selector modal
     */
    async showImageSelector(targetImg, memberId) {
        console.log('🖼️ Opening image selector for team member:', memberId);
        
        this.currentImageSelector = targetImg;
        this.currentTeamMemberId = memberId;
        
        const modal = document.createElement('div');
        modal.className = 'image-selector-modal';
        modal.innerHTML = `
            <div class="image-selector-content">
                <div class="image-selector-header">
                    <h3>📷 Select Team Member Image</h3>
                    <p style="color: #666; margin: 5px 0;">Choose an image from your bucket</p>
                    <span class="image-selector-close">&times;</span>
                </div>
                <div class="image-selector-body">
                    <div class="images-container" id="selector-images-container">
                        <p>Loading images...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.image-selector-close').addEventListener('click', () => {
            modal.remove();
            this.currentImageSelector = null;
            this.currentTeamMemberId = null;
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                this.currentImageSelector = null;
                this.currentTeamMemberId = null;
            }
        });

        // Load images
        await this.loadSelectableImages(modal);
    }

    /**
     * Load images for selection
     */
    async loadSelectableImages(modal) {
        const container = modal.querySelector('#selector-images-container');
        
        try {
            console.log('📞 Loading images for selection...');
            const { files, error } = await this.dbService.listBucketFiles('wolf-property-images');

            if (error) {
                throw new Error(error);
            }

            if (!files || files.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <p>No images found in bucket</p>
                    </div>
                `;
                return;
            }

            // Filter image files
            const imageFiles = files.filter(file => {
                const fileName = file.fullPath || file.name;
                const ext = fileName.toLowerCase().split('.').pop();
                return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
            });

            if (imageFiles.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <p>No image files found in bucket</p>
                    </div>
                `;
                return;
            }

            // Create image grid
            container.innerHTML = `
                <div class="selectable-images-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; padding: 20px;">
                    ${imageFiles.map(file => {
                        const filePath = file.fullPath || file.name;
                        const displayName = file.name;
                        const signedUrl = file.signedUrl;
                        const publicUrl = this.dbService.getPublicUrl('wolf-property-images', filePath);
                        
                        return `
                            <div class="selectable-image-item" data-public-url="${publicUrl}" data-signed-url="${signedUrl}" data-filename="${displayName}" style="cursor: pointer; border: 2px solid transparent; border-radius: 8px; overflow: hidden; transition: all 0.3s ease;">
                                <img src="${signedUrl}" alt="${displayName}" style="width: 100%; height: 120px; object-fit: cover;" onerror="console.error('Failed to load:', this.src)">
                                <div style="padding: 8px; background: #f8f9fa; text-align: center;">
                                    <p style="margin: 0; font-size: 12px; font-weight: bold; color: #333;">${displayName.length > 15 ? displayName.substring(0, 15) + '...' : displayName}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Add click handlers for image selection
            container.querySelectorAll('.selectable-image-item').forEach(item => {
                item.addEventListener('click', () => {
                    const publicUrl = item.dataset.publicUrl;
                    const signedUrl = item.dataset.signedUrl;
                    const filename = item.dataset.filename;
                    
                    this.assignImageToTeamMember(publicUrl, signedUrl, filename);
                    modal.remove();
                    this.currentImageSelector = null;
                });

                item.addEventListener('mouseenter', () => {
                    item.style.border = '2px solid #3498db';
                    item.style.transform = 'scale(1.05)';
                });

                item.addEventListener('mouseleave', () => {
                    item.style.border = '2px solid transparent';
                    item.style.transform = 'scale(1)';
                });
            });

        } catch (error) {
            console.error('❌ Failed to load images for selection:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    <p>Failed to load images: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Assign selected image to team member
     */
    async assignImageToTeamMember(publicUrl, signedUrl, filename) {
        if (!this.currentImageSelector || !this.currentTeamMemberId) return;

        console.log(`🖼️ Assigning image ${filename} to team member ${this.currentTeamMemberId}`);
        
        try {
            // Find the team member in our data
            const member = this.teamMembers.find(m => m.id === this.currentTeamMemberId);
            if (!member) {
                console.error('❌ Team member not found');
                return;
            }
            
            // Track the change as pending
            this.trackMemberChange(this.currentTeamMemberId, {
                image_url: publicUrl,
                image_filename: filename
            });
            
            // Update the member data locally
            member.image_url = publicUrl;
            member.image_filename = filename;
            
            // Update the UI
            this.currentImageSelector.src = signedUrl;
            this.currentImageSelector.alt = member.name;
            
            // Visual feedback
            this.currentImageSelector.style.border = '3px solid #f39c12'; // Orange for pending
            setTimeout(() => {
                this.currentImageSelector.style.border = '3px dashed rgba(231, 76, 60, 0.5)';
            }, 2000);
            
            console.log('✅ Team member image change tracked as pending');
            
        } catch (error) {
            console.error('❌ Error assigning image:', error);
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

        // Save changes button
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'save-team-changes-btn') {
                e.preventDefault();
                this.saveAllChanges();
            }
        });

        // Remove pending member button
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('remove-pending-btn')) {
                e.preventDefault();
                const memberId = e.target.dataset.memberId;
                this.removePendingMember(memberId);
            }
        });
    }

    /**
     * Save all pending changes to database with version history
     */
    async saveAllChanges() {
        if (!this.hasUnsavedChanges) {
            console.log('No changes to save');
            return;
        }

        console.log('💾 Saving all pending changes...');
        
        const saveBtn = document.getElementById('save-team-changes-btn');
        const originalText = saveBtn.textContent;
        
        try {
            // Defensive check: Ensure new members are not in the 'modified' list to prevent double-saving.
            for (const newMember of this.pendingChanges.added) {
                if (this.pendingChanges.modified.has(newMember.id)) {
                    console.warn(`New member ${newMember.name} was incorrectly in modified list. Removing to prevent duplication.`);
                    this.pendingChanges.modified.delete(newMember.id);
                }
            }

            // Update button to show saving state
            saveBtn.textContent = '⏳ Saving...';
            saveBtn.disabled = true;

            // Create version history entry
            const versionDescription = this.generateVersionDescription();
            const changes = this.generateChangesSnapshot();

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

            // Save version history
            await this.saveVersionHistory(versionDescription, changes);

            // Clear pending changes and re-render UI
            this.clearPendingChanges();
            await this.renderTeamMembers();

            // Success feedback
            saveBtn.style.background = '#27ae60';
            saveBtn.textContent = '✅ Saved!';
            
            setTimeout(() => {
                saveBtn.textContent = originalText;
                this.updateSaveButton();
            }, 3000);

            console.log('✅ All changes saved successfully');

        } catch (error) {
            console.error('❌ Failed to save changes:', error);
            alert(`Failed to save changes: ${error.message}`);
            
            // Reset button
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    /**
     * Generate version description based on changes
     */
    generateVersionDescription() {
        const parts = [];
        
        if (this.pendingChanges.modified.size > 0) {
            parts.push(`Modified ${this.pendingChanges.modified.size} team member(s)`);
        }
        
        if (this.pendingChanges.added.length > 0) {
            parts.push(`Added ${this.pendingChanges.added.length} team member(s)`);
        }
        
        if (this.pendingChanges.deleted.size > 0) {
            parts.push(`Deleted ${this.pendingChanges.deleted.size} team member(s)`);
        }
        
        return parts.join(', ') || 'Updated team members';
    }

    /**
     * Generate changes snapshot for version history
     */
    generateChangesSnapshot() {
        return {
            modified: Object.fromEntries(this.pendingChanges.modified),
            added: this.pendingChanges.added.map(member => ({
                name: member.name,
                position: member.position
            })),
            deleted: Array.from(this.pendingChanges.deleted),
            timestamp: new Date().toISOString(),
            page: 'about.html'
        };
    }

    /**
     * Save version history entry
     */
    async saveVersionHistory(description, changes) {
        try {
            // Get current version number
            const currentVersion = await this.getCurrentVersionNumber();
            const newVersion = currentVersion + 1;

            // Create version history entry
            const versionData = {
                version_number: newVersion,
                description: description,
                changes: changes,
                page_name: 'about.html',
                created_at: new Date().toISOString()
            };

            // Save to version_history table
            const { error } = await this.dbService.supabase
                .from('version_history')
                .insert(versionData);

            if (error) {
                console.warn('Failed to save version history:', error);
            } else {
                console.log(`✅ Version ${newVersion} saved to history`);
            }

        } catch (error) {
            console.warn('Failed to save version history:', error);
        }
    }

    /**
     * Get current version number for about page
     */
    async getCurrentVersionNumber() {
        try {
            const { data, error } = await this.dbService.supabase
                .from('version_history')
                .select('version_number')
                .eq('page_name', 'about.html')
                .order('version_number', { ascending: false })
                .limit(1);

            if (error || !data || data.length === 0) {
                return 0; // Start with version 1
            }

            return data[0].version_number;
        } catch (error) {
            console.warn('Failed to get current version:', error);
            return 0;
        }
    }

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
            img.style.border = '';
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
    }
    
    // Also load team members from database on page load (for non-admin users)
    aboutAdminManager.loadTeamMembersFromDatabase();

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