/**
 * Admin Version Control UI
 * Integrates the new VersionControlManager with the admin interface
 * Provides version control buttons, status displays, and user feedback
 */

import versionControlManager from './version-control-manager.js';

class AdminVersionControlUI {
    constructor() {
        this.versionControlManager = versionControlManager;
        this.isInitialized = false;
        this.eventListeners = [];
        
        console.log('🎛️ Admin Version Control UI created');
    }

    /**
     * Initialize the admin version control UI
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('⚠️ Admin Version Control UI already initialized');
            return;
        }

        console.log('🚀 Initializing Admin Version Control UI...');

        try {
            // Initialize the version control manager first
            const result = await this.versionControlManager.initialize();
            if (!result.success) {
                throw new Error(result.error);
            }

            // Add version control UI elements
            this.addVersionControlUI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Admin Version Control UI initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Admin Version Control UI:', error);
            throw error;
        }
    }

    /**
     * Add version control UI elements to admin controls
     */
    addVersionControlUI() {
        const adminControls = document.querySelector('.admin-controls-content');
        if (!adminControls) {
            console.warn('❌ Admin controls not found');
            return;
        }

        // Check if controls already exist
        if (document.getElementById('version-control-ui')) {
            console.log('⚠️ Version control UI already exists, updating...');
            this.updateVersionControlUI();
            return;
        }

        const versionControlUI = document.createElement('div');
        versionControlUI.id = 'version-control-ui';
        versionControlUI.className = 'version-control-ui';
        versionControlUI.innerHTML = `
            <div class="version-control-section">
                <h4>🔄 Version Control</h4>
                <div class="version-status">
                    <div id="version-info" class="version-info">
                        <span>Current Version: <span id="current-version">0</span></span>
                        <span>Total Versions: <span id="total-versions">0</span></span>
                    </div>
                    <div id="changes-status" class="changes-status">
                        No changes detected
                    </div>
                </div>
                
                <div class="version-control-buttons">
                    <button id="save-all-changes-btn" class="btn btn-primary version-save-btn" disabled>
                        💾 Save Changes
                    </button>
                    <button id="version-history-btn" class="btn btn-secondary">
                        📚 View History
                    </button>
                    <button id="refresh-state-btn" class="btn btn-secondary">
                        🔄 Refresh State
                    </button>
                </div>
                
                <div class="version-warnings" id="version-warnings" style="display: none;">
                    <div class="warning-content">
                        ⚠️ You have unsaved changes that will be lost if you leave this page.
                    </div>
                </div>
            </div>
        `;

        // Insert at the beginning of admin controls
        adminControls.insertBefore(versionControlUI, adminControls.firstChild);
        
        // Update initial state
        this.updateVersionControlUI();
    }

    /**
     * Update the version control UI with current state
     */
    updateVersionControlUI() {
        const currentVersionEl = document.getElementById('current-version');
        const totalVersionsEl = document.getElementById('total-versions');
        const changesStatusEl = document.getElementById('changes-status');
        const saveButton = document.getElementById('save-all-changes-btn');
        const warningsEl = document.getElementById('version-warnings');

        if (!currentVersionEl || !totalVersionsEl || !changesStatusEl || !saveButton) {
            return;
        }

        // Update version numbers
        const versionHistory = this.versionControlManager.getVersionHistory();
        const currentVersion = this.versionControlManager.getCurrentVersion();
        
        currentVersionEl.textContent = currentVersion;
        totalVersionsEl.textContent = versionHistory.length;

        // Update changes status and save button
        const hasVersionControlChanges = this.versionControlManager.hasChanges();
        const hasTeamChanges = window.aboutAdminManager && window.aboutAdminManager.hasUnsavedChanges;
        const hasAnyChanges = hasVersionControlChanges || hasTeamChanges;
        const temporaryCache = this.versionControlManager.getTemporaryCache();
        
        if (hasAnyChanges) {
            let modificationsCount = 0;
            let changesText = '';
            
            // Count version control changes
            if (hasVersionControlChanges && temporaryCache) {
                modificationsCount += this.getModificationsCount(temporaryCache);
                changesText += `${this.getModificationsCount(temporaryCache)} content change(s)`;
            }
            
            // Count team changes
            if (hasTeamChanges && window.aboutAdminManager) {
                const teamChanges = window.aboutAdminManager.pendingChanges;
                const teamChangeCount = teamChanges.modified.size + teamChanges.added.length + teamChanges.deleted.size;
                modificationsCount += teamChangeCount;
                if (changesText) changesText += ', ';
                changesText += `${teamChangeCount} team change(s)`;
            }
            
            saveButton.disabled = false;
            saveButton.classList.add('has-changes');
            saveButton.textContent = `💾 Save Changes (${modificationsCount})`;
            
            changesStatusEl.innerHTML = `
                <div class="changes-detected">
                    ✏️ ${changesText}
                    ${temporaryCache ? `<small>Session started: ${new Date(temporaryCache.startTime).toLocaleTimeString()}</small>` : ''}
                </div>
            `;
            changesStatusEl.className = 'changes-status has-changes';
            
            // Show warnings
            warningsEl.style.display = 'block';
        } else {
            saveButton.disabled = true;
            saveButton.classList.remove('has-changes');
            saveButton.textContent = '💾 Save Changes';
            
            changesStatusEl.innerHTML = 'No changes detected';
            changesStatusEl.className = 'changes-status';
            
            // Hide warnings
            warningsEl.style.display = 'none';
        }
    }

    /**
     * Count modifications in temporary cache
     */
    getModificationsCount(temporaryCache) {
        if (!temporaryCache || !temporaryCache.modifications) {
            return 0;
        }
        
        let count = 0;
        Object.values(temporaryCache.modifications).forEach(typeModifications => {
            count += Object.keys(typeModifications).length;
        });
        return count;
    }

    /**
     * Set up event listeners for version control UI
     */
    setupEventListeners() {
        // Save changes button
        const saveHandler = async (e) => {
            if (e.target && e.target.id === 'save-all-changes-btn') {
                e.preventDefault();
                await this.handleSaveChanges();
            }
        };
        document.addEventListener('click', saveHandler);
        this.eventListeners.push({ type: 'click', handler: saveHandler });

        // Version history button
        const historyHandler = async (e) => {
            if (e.target && e.target.id === 'version-history-btn') {
                e.preventDefault();
                await this.showVersionHistory();
            }
        };
        document.addEventListener('click', historyHandler);
        this.eventListeners.push({ type: 'click', handler: historyHandler });

        // Refresh state button
        const refreshHandler = async (e) => {
            if (e.target && e.target.id === 'refresh-state-btn') {
                e.preventDefault();
                await this.handleRefreshState();
            }
        };
        document.addEventListener('click', refreshHandler);
        this.eventListeners.push({ type: 'click', handler: refreshHandler });

        // Listen to version control events
        const versionControlHandler = (e) => {
            switch (e.type) {
                case 'versionControl.modificationSessionStarted':
                case 'versionControl.modificationTracked':
                case 'versionControl.changesSaved':
                case 'versionControl.versionReverted':
                    this.updateVersionControlUI();
                    break;
                case 'versionControl.saveError':
                case 'versionControl.revertError':
                    this.showErrorMessage(e.detail.error);
                    break;
            }
        };

        const eventTypes = [
            'modificationSessionStarted',
            'modificationTracked', 
            'changesSaved',
            'versionReverted',
            'saveError',
            'revertError'
        ];

        eventTypes.forEach(eventType => {
            this.versionControlManager.addEventListener(eventType, versionControlHandler);
        });
    }

    /**
     * Handle save changes button click
     */
    async handleSaveChanges() {
        console.log('💾 Universal save changes requested by user...');
        
        const saveButton = document.getElementById('save-all-changes-btn');
        if (!saveButton || saveButton.disabled) {
            return;
        }

        // Show loading state
        const originalText = saveButton.textContent;
        saveButton.textContent = '⏳ Saving...';
        saveButton.disabled = true;

        try {
            // 1. Save team member changes first (if on about page)
            if (window.aboutAdminManager && window.aboutAdminManager.hasUnsavedChanges) {
                console.log('💾 Saving team member changes...');
                await window.aboutAdminManager.saveAllChanges();
            }

            // 2. Request custom description from user
            const description = this.promptForDescription();
            
            // 3. Save all changes through version control manager
            const result = await this.versionControlManager.saveChanges(description);
            
            if (result.success) {
                this.showSuccessMessage(`✅ All changes saved successfully as version ${result.version}!`);
                console.log(`✅ Version ${result.version} saved successfully`);
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            this.showErrorMessage(`Save failed: ${error.message}`);
        } finally {
            saveButton.textContent = originalText;
            this.updateVersionControlUI();
        }
    }

    /**
     * Prompt user for version description
     */
    promptForDescription() {
        const description = prompt(
            'Version Description (optional):\n\n' +
            'Enter a brief description of the changes you made:'
        );
        
        return description || '';
    }

    /**
     * Show version history modal
     */
    async showVersionHistory() {
        const versionHistory = this.versionControlManager.getVersionHistory();
        
        const modal = document.createElement('div');
        modal.className = 'version-history-modal';
        modal.innerHTML = `
            <div class="version-history-content">
                <div class="version-history-header">
                    <h3>📚 Version History</h3>
                    <button class="version-close">&times;</button>
                </div>
                <div class="version-history-body">
                    <p class="version-info-text">
                        Each version represents a complete snapshot of your website before changes were made.
                        You can revert to any previous version to restore the entire state.
                    </p>
                    <div class="version-list">
                        ${versionHistory.length === 0 ? '<div class="no-versions">No versions saved yet</div>' : 
                          versionHistory.map(version => `
                            <div class="version-item">
                                <div class="version-header">
                                    <span class="version-number">Version ${version.version_number}</span>
                                    <span class="version-date">${new Date(version.created_at).toLocaleString()}</span>
                                </div>
                                <div class="version-description">${version.description || 'No description provided'}</div>
                                <div class="version-actions">
                                    <button class="version-revert-btn btn-danger" data-version="${version.version_number}">
                                        🔄 Revert to This Version
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.version-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Revert version buttons
        modal.querySelectorAll('.version-revert-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const versionNumber = parseInt(btn.getAttribute('data-version'));
                await this.handleRevertToVersion(versionNumber);
                modal.remove();
            });
        });
    }

    /**
     * Handle revert to version
     */
    async handleRevertToVersion(versionNumber) {
        console.log(`🔄 Revert to version ${versionNumber} requested by user...`);
        
        try {
            const result = await this.versionControlManager.revertToVersion(versionNumber, true);
            
            if (result.success) {
                this.showSuccessMessage(`✅ Successfully reverted to version ${versionNumber}!`);
                
                // Refresh the page content to show reverted state
                await this.refreshPageContent();
            } else {
                if (result.message !== 'Revert cancelled by user') {
                    this.showErrorMessage(`Revert failed: ${result.error}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Revert failed:', error);
            this.showErrorMessage(`Revert failed: ${error.message}`);
        }
    }

    /**
     * Handle refresh state button click
     */
    async handleRefreshState() {
        console.log('🔄 Refresh state requested by user...');
        
        const refreshButton = document.getElementById('refresh-state-btn');
        if (!refreshButton) return;

        // Show loading state
        const originalText = refreshButton.textContent;
        refreshButton.textContent = '🔄 Refreshing...';
        refreshButton.disabled = true;

        try {
            // Capture fresh state
            await this.versionControlManager.captureCurrentState();
            
            // Refresh page content
            await this.refreshPageContent();
            
            this.showSuccessMessage('✅ State refreshed successfully!');
            
        } catch (error) {
            console.error('❌ Refresh failed:', error);
            this.showErrorMessage(`Refresh failed: ${error.message}`);
        } finally {
            refreshButton.textContent = originalText;
            refreshButton.disabled = false;
            this.updateVersionControlUI();
        }
    }

    /**
     * Refresh page content from database
     */
    async refreshPageContent() {
        // Trigger content refresh if available
        if (window.loadContentFromDatabase) {
            await window.loadContentFromDatabase();
        }
        
        // Trigger team members refresh if on about page
        if (window.aboutAdminManager && window.aboutAdminManager.loadTeamMembersFromDatabase) {
            await window.aboutAdminManager.loadTeamMembersFromDatabase();
        }
    }

    /**
     * Start modification session when admin enters edit mode
     */
    async startModificationSession(description = 'Admin modification session') {
        try {
            await this.versionControlManager.startModificationSession(description);
            this.updateVersionControlUI();
        } catch (error) {
            console.error('❌ Failed to start modification session:', error);
        }
    }

    /**
     * Track a modification made by admin
     */
    trackModification(type, elementId, oldValue, newValue, metadata = {}) {
        try {
            this.versionControlManager.trackModification(type, elementId, oldValue, newValue, metadata);
            this.updateVersionControlUI();
        } catch (error) {
            console.error('❌ Failed to track modification:', error);
        }
    }

    /**
     * Show success message to user
     */
    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    /**
     * Show error message to user
     */
    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `version-control-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                ${message}
                <button class="toast-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    }

    /**
     * Clean up when leaving admin mode
     */
    cleanup() {
        // Remove event listeners
        this.eventListeners.forEach(({ type, handler }) => {
            document.removeEventListener(type, handler);
        });
        this.eventListeners = [];
        
        // Remove UI elements
        const versionControlUI = document.getElementById('version-control-ui');
        if (versionControlUI) {
            versionControlUI.remove();
        }
        
        // Remove any toasts
        document.querySelectorAll('.version-control-toast').forEach(toast => toast.remove());
        
        this.isInitialized = false;
        console.log('🎛️ Admin Version Control UI cleaned up');
    }

    /**
     * Public API methods
     */
    isReady() {
        return this.isInitialized;
    }

    getVersionControlManager() {
        return this.versionControlManager;
    }
}

// Create global instance
const adminVersionControlUI = new AdminVersionControlUI();

// Export for use in other modules
export default adminVersionControlUI; 