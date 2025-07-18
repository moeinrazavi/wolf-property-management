/**
 * Robust Version Control Manager for Wolf Property Management Admin System
 * 
 * Features:
 * - Automatically captures complete website state BEFORE any modification
 * - Stores pending changes in temporary cache
 * - Permanently saves state only when "Save Changes" is pressed
 * - Allows viewing and reverting to any previous complete state
 * - Handles all aspects: content, team members, media, settings
 * - Provides clear feedback on all operations
 */

import dbService from './supabase-client.js';

class VersionControlManager {
    constructor() {
        this.dbService = dbService;
        this.isInitialized = false;
        
        // State management
        this.currentState = null;           // Current complete website state
        this.preModificationState = null;   // State before any changes started
        this.temporaryCache = null;         // Cached changes before save
        this.hasUnsavedChanges = false;     // Flag for unsaved changes
        
        // Version history
        this.versionHistory = [];
        this.currentVersion = 0;
        
        // Configuration
        this.MAX_VERSIONS = 20;             // Keep last 20 versions
        this.AUTO_SAVE_INTERVAL = 300000;   // Auto-save every 5 minutes (backup)
        
        // Event listeners for cleanup
        this.eventListeners = [];
        
        console.log('🔄 Version Control Manager created');
    }

    /**
     * Initialize the version control system
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('⚠️ Version Control Manager already initialized');
            return;
        }

        console.log('🚀 Initializing Version Control Manager...');

        try {
            // Initialize database tables
            await this.initializeDatabase();
            
            // Capture initial state
            await this.captureCurrentState();
            
            // Load version history
            await this.loadVersionHistory();
            
            // Set up auto-save
            this.setupAutoSave();
            
            // Add event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Version Control Manager initialized successfully');
            
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to initialize Version Control Manager:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Initialize database tables for version control
     */
    async initializeDatabase() {
        console.log('🔧 Initializing version control database tables...');
        
        // Create website_states table for complete state snapshots
        const createStatesTableSQL = `
            CREATE TABLE IF NOT EXISTS website_states (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                version_number INTEGER NOT NULL,
                description TEXT,
                complete_state JSONB NOT NULL,
                state_hash VARCHAR(64) NOT NULL,
                page_context VARCHAR(100),
                created_by UUID REFERENCES admin_users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_temporary BOOLEAN DEFAULT false,
                UNIQUE(version_number, page_context)
            );
        `;

        // Create indexes for performance
        const createIndexesSQL = `
            CREATE INDEX IF NOT EXISTS idx_website_states_version ON website_states(version_number);
            CREATE INDEX IF NOT EXISTS idx_website_states_page ON website_states(page_context);
            CREATE INDEX IF NOT EXISTS idx_website_states_temp ON website_states(is_temporary);
            CREATE INDEX IF NOT EXISTS idx_website_states_hash ON website_states(state_hash);
        `;

        try {
            // Note: In a real implementation, these would be run via Supabase SQL editor
            // For now, we'll check if the table exists by trying to query it
            const { data, error } = await this.dbService.supabase
                .from('website_states')
                .select('count', { count: 'exact', head: true });

            if (error) {
                console.warn('🔧 website_states table needs to be created. Please run the SQL setup.');
                console.log('SQL to run in Supabase SQL Editor:');
                console.log(createStatesTableSQL);
                console.log(createIndexesSQL);
            } else {
                console.log('✅ website_states table exists');
            }
        } catch (error) {
            console.warn('⚠️ Could not verify database tables:', error);
        }
    }

    /**
     * Capture the complete current state of the website
     */
    async captureCurrentState() {
        console.log('📸 Capturing complete website state...');
        
        try {
            const state = {
                timestamp: new Date().toISOString(),
                page: this.getCurrentPage(),
                
                // Website content
                content: await this.captureWebsiteContent(),
                
                // Team members
                teamMembers: await this.captureTeamMembers(),
                
                // Media content
                mediaContent: await this.captureMediaContent(),
                
                // Admin settings
                adminSettings: await this.captureAdminSettings(),
                
                // UI state
                uiState: this.captureUIState()
            };

            this.currentState = state;
            console.log('✅ Complete website state captured');
            return state;
        } catch (error) {
            console.error('❌ Failed to capture current state:', error);
            throw error;
        }
    }

    /**
     * Start modification session - capture pre-modification state
     */
    async startModificationSession(description = 'Modification session started') {
        console.log('🔄 Starting modification session...');
        
        if (this.preModificationState) {
            console.warn('⚠️ Modification session already in progress');
            return;
        }

        try {
            // Capture complete state before any modifications
            this.preModificationState = await this.captureCurrentState();
            
            // Store in temporary cache
            this.temporaryCache = {
                description: description,
                preModificationState: JSON.parse(JSON.stringify(this.preModificationState)),
                modifications: {},
                startTime: new Date().toISOString()
            };

            console.log('✅ Modification session started, pre-state captured');
            this.triggerEvent('modificationSessionStarted', { description });
            
        } catch (error) {
            console.error('❌ Failed to start modification session:', error);
            throw error;
        }
    }

    /**
     * Track a specific modification
     */
    trackModification(type, elementId, oldValue, newValue, metadata = {}) {
        if (!this.temporaryCache) {
            console.warn('⚠️ No modification session active, starting one...');
            this.startModificationSession('Auto-started modification session');
        }

        const modification = {
            type,           // 'content', 'teamMember', 'media', 'setting'
            elementId,
            oldValue,
            newValue,
            metadata,
            timestamp: new Date().toISOString()
        };

        if (!this.temporaryCache.modifications[type]) {
            this.temporaryCache.modifications[type] = {};
        }
        
        this.temporaryCache.modifications[type][elementId] = modification;
        this.hasUnsavedChanges = true;

        console.log(`📝 Tracked ${type} modification:`, elementId);
        this.triggerEvent('modificationTracked', modification);
    }

    /**
     * Save all changes permanently (from temporary cache to database)
     */
    async saveChanges(versionDescription = '') {
        console.log('💾 Saving changes permanently...');
        
        if (!this.hasUnsavedChanges || !this.temporaryCache) {
            console.log('ℹ️ No changes to save');
            return { success: true, message: 'No changes to save' };
        }

        try {
            // Generate version description if not provided
            if (!versionDescription) {
                versionDescription = this.generateVersionDescription();
            }

            // Get next version number
            const nextVersion = await this.getNextVersionNumber();

            // Create complete state snapshot
            const completeState = {
                version: nextVersion,
                description: versionDescription,
                preModificationState: this.temporaryCache.preModificationState,
                modifications: this.temporaryCache.modifications,
                finalState: await this.captureCurrentState(),
                metadata: {
                    sessionStartTime: this.temporaryCache.startTime,
                    saveTime: new Date().toISOString(),
                    modificationsCount: this.getModificationsCount(),
                    adminUser: this.dbService.currentUser?.id
                }
            };

            // Save to database
            const saveResult = await this.saveStateToDatabase(completeState);
            
            if (!saveResult.success) {
                throw new Error(saveResult.error);
            }

            // Update version history
            await this.loadVersionHistory();

            // Clean up temporary cache
            this.endModificationSession();

            // Trigger success event
            this.triggerEvent('changesSaved', {
                version: nextVersion,
                description: versionDescription,
                modificationsCount: this.getModificationsCount()
            });

            console.log(`✅ Changes saved successfully as version ${nextVersion}`);
            return {
                success: true,
                version: nextVersion,
                description: versionDescription,
                message: `Changes saved successfully as version ${nextVersion}`
            };

        } catch (error) {
            console.error('❌ Failed to save changes:', error);
            this.triggerEvent('saveError', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Revert to a specific version
     */
    async revertToVersion(versionNumber, confirm = true) {
        console.log(`🔄 Reverting to version ${versionNumber}...`);

        if (confirm && this.hasUnsavedChanges) {
            const userConfirmed = window.confirm(
                `You have unsaved changes that will be lost.\n\n` +
                `Are you sure you want to revert to version ${versionNumber}?`
            );
            if (!userConfirmed) {
                return { success: false, message: 'Revert cancelled by user' };
            }
        }

        try {
            // Find the version in history
            const targetVersion = this.versionHistory.find(v => v.version_number === versionNumber);
            if (!targetVersion) {
                throw new Error(`Version ${versionNumber} not found`);
            }

            // Get the complete state from database
            const { data, error } = await this.dbService.supabase
                .from('website_states')
                .select('complete_state')
                .eq('version_number', versionNumber)
                .single();

            if (error) {
                throw new Error(`Failed to load version ${versionNumber}: ${error.message}`);
            }

            const stateToRevert = data.complete_state;

            // Apply the state
            await this.applyState(stateToRevert.preModificationState);

            // Clear any pending changes
            this.endModificationSession();

            // Trigger revert event
            this.triggerEvent('versionReverted', {
                versionNumber,
                description: targetVersion.description
            });

            console.log(`✅ Successfully reverted to version ${versionNumber}`);
            return {
                success: true,
                message: `Successfully reverted to version ${versionNumber}`,
                version: versionNumber
            };

        } catch (error) {
            console.error('❌ Failed to revert to version:', error);
            this.triggerEvent('revertError', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Apply a complete state to the website
     */
    async applyState(state) {
        console.log('🔄 Applying state to website...');

        try {
            // Apply website content
            if (state.content) {
                await this.applyWebsiteContent(state.content);
            }

            // Apply team members
            if (state.teamMembers) {
                await this.applyTeamMembers(state.teamMembers);
            }

            // Apply media content
            if (state.mediaContent) {
                await this.applyMediaContent(state.mediaContent);
            }

            // Apply admin settings
            if (state.adminSettings) {
                await this.applyAdminSettings(state.adminSettings);
            }

            // Apply UI state
            if (state.uiState) {
                this.applyUIState(state.uiState);
            }

            // Refresh the current state
            await this.captureCurrentState();

            console.log('✅ State applied successfully');
        } catch (error) {
            console.error('❌ Failed to apply state:', error);
            throw error;
        }
    }

    /**
     * Capture website content from database
     */
    async captureWebsiteContent() {
        try {
            const { data, error } = await this.dbService.supabase
                .from('website_content')
                .select('*')
                .eq('is_active', true)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error capturing website content:', error);
            return [];
        }
    }

    /**
     * Capture team members from database
     */
    async captureTeamMembers() {
        try {
            const { teamMembers, error } = await this.dbService.getTeamMembers();
            if (error) throw new Error(error);
            return teamMembers || [];
        } catch (error) {
            console.error('Error capturing team members:', error);
            return [];
        }
    }

    /**
     * Capture media content from database
     */
    async captureMediaContent() {
        try {
            const { data, error } = await this.dbService.supabase
                .from('media_content')
                .select('*')
                .eq('is_active', true)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error capturing media content:', error);
            return [];
        }
    }

    /**
     * Capture admin settings (placeholder for future expansion)
     */
    async captureAdminSettings() {
        // Placeholder for admin settings
        return {
            theme: 'default',
            autoSave: true,
            maxVersions: this.MAX_VERSIONS
        };
    }

    /**
     * Capture current UI state
     */
    captureUIState() {
        return {
            currentPage: this.getCurrentPage(),
            scrollPosition: window.scrollY,
            activeElements: this.getActiveElements(),
            adminMode: true
        };
    }

    /**
     * Apply website content
     */
    async applyWebsiteContent(content) {
        // Update database with the content
        for (const item of content) {
            const { error } = await this.dbService.supabase
                .from('website_content')
                .upsert({
                    page_name: item.page_name,
                    element_id: item.element_id,
                    content_text: item.content_text,
                    content_type: item.content_type,
                    version: item.version,
                    is_active: true,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error applying content item:', error);
            }
        }

        // Refresh the page content display
        this.refreshPageContent();
    }

    /**
     * Apply team members
     */
    async applyTeamMembers(teamMembers) {
        // First, get current team members to identify what needs to be updated/added/removed
        const { teamMembers: currentMembers } = await this.dbService.getTeamMembers();
        const currentIds = new Set(currentMembers.map(m => m.id));
        const targetIds = new Set(teamMembers.map(m => m.id));

        // Add/update team members
        for (const member of teamMembers) {
            const { error } = await this.dbService.saveTeamMember(member);
            if (error) {
                console.error('Error applying team member:', error);
            }
        }

        // Remove team members that are not in the target state
        for (const currentMember of currentMembers) {
            if (!targetIds.has(currentMember.id)) {
                const { error } = await this.dbService.deleteTeamMember(currentMember.id);
                if (error) {
                    console.error('Error removing team member:', error);
                }
            }
        }

        // Refresh team members display if on about page
        this.refreshTeamMembersDisplay();
    }

    /**
     * Apply media content
     */
    async applyMediaContent(mediaContent) {
        // Similar to team members - sync the media content
        for (const media of mediaContent) {
            const { error } = await this.dbService.supabase
                .from('media_content')
                .upsert({
                    page_name: media.page_name,
                    element_id: media.element_id,
                    file_name: media.file_name,
                    file_url: media.file_url,
                    file_type: media.file_type,
                    alt_text: media.alt_text,
                    is_active: true,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error applying media content:', error);
            }
        }
    }

    /**
     * Apply admin settings
     */
    async applyAdminSettings(settings) {
        // Apply admin settings (placeholder for future expansion)
        console.log('Applying admin settings:', settings);
    }

    /**
     * Apply UI state
     */
    applyUIState(uiState) {
        // Restore scroll position
        if (uiState.scrollPosition) {
            window.scrollTo(0, uiState.scrollPosition);
        }
    }

    /**
     * Utility methods
     */
    getCurrentPage() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }

    getActiveElements() {
        return Array.from(document.querySelectorAll('.editable-text')).map(el => ({
            id: el.getAttribute('data-editable-id'),
            text: el.textContent
        }));
    }

    getModificationsCount() {
        if (!this.temporaryCache) return 0;
        
        let count = 0;
        Object.values(this.temporaryCache.modifications).forEach(typeModifications => {
            count += Object.keys(typeModifications).length;
        });
        return count;
    }

    async getNextVersionNumber() {
        const { data, error } = await this.dbService.supabase
            .from('website_states')
            .select('version_number')
            .order('version_number', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) {
            return 1;
        }

        return data[0].version_number + 1;
    }

    generateVersionDescription() {
        const modificationsCount = this.getModificationsCount();
        const currentTime = new Date().toLocaleString();
        
        let description = `Auto-save: ${modificationsCount} changes - ${currentTime}`;
        
        if (this.temporaryCache.description && this.temporaryCache.description !== 'Modification session started') {
            description = this.temporaryCache.description;
        }
        
        return description;
    }

    async saveStateToDatabase(completeState) {
        try {
            const stateData = {
                version_number: completeState.version,
                description: completeState.description,
                complete_state: completeState,
                state_hash: this.generateStateHash(completeState),
                page_context: this.getCurrentPage(),
                created_by: this.dbService.currentUser?.id,
                is_temporary: false
            };

            const { error } = await this.dbService.supabase
                .from('website_states')
                .insert(stateData);

            if (error) {
                throw error;
            }

            // Clean up old versions if we exceed the max limit
            await this.cleanupOldVersions();

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    generateStateHash(state) {
        // Simple hash generation for state comparison
        return btoa(JSON.stringify(state)).substr(0, 32);
    }

    async cleanupOldVersions() {
        try {
            // Keep only the latest MAX_VERSIONS
            const { data, error } = await this.dbService.supabase
                .from('website_states')
                .select('id, version_number')
                .eq('is_temporary', false)
                .order('version_number', { ascending: false })
                .limit(this.MAX_VERSIONS + 10); // Get a few extra to clean up

            if (error || !data || data.length <= this.MAX_VERSIONS) {
                return; // Nothing to clean up
            }

            // Delete versions beyond the limit
            const versionsToDelete = data.slice(this.MAX_VERSIONS);
            const idsToDelete = versionsToDelete.map(v => v.id);

            const { error: deleteError } = await this.dbService.supabase
                .from('website_states')
                .delete()
                .in('id', idsToDelete);

            if (deleteError) {
                console.warn('Failed to cleanup old versions:', deleteError);
            } else {
                console.log(`🧹 Cleaned up ${idsToDelete.length} old versions`);
            }
        } catch (error) {
            console.warn('Error during version cleanup:', error);
        }
    }

    async loadVersionHistory() {
        try {
            const { data, error } = await this.dbService.supabase
                .from('website_states')
                .select('version_number, description, created_at, created_by')
                .eq('is_temporary', false)
                .order('version_number', { ascending: false });

            if (error) {
                console.error('Error loading version history:', error);
                this.versionHistory = [];
                return;
            }

            this.versionHistory = data || [];
            this.currentVersion = this.versionHistory.length > 0 ? this.versionHistory[0].version_number : 0;
            
            console.log(`📚 Loaded ${this.versionHistory.length} versions from history`);
        } catch (error) {
            console.error('Error loading version history:', error);
            this.versionHistory = [];
        }
    }

    endModificationSession() {
        this.preModificationState = null;
        this.temporaryCache = null;
        this.hasUnsavedChanges = false;
        console.log('✅ Modification session ended');
    }

    setupAutoSave() {
        // Auto-save functionality (commented out for now)
        // setInterval(() => {
        //     if (this.hasUnsavedChanges) {
        //         console.log('🔄 Auto-saving changes...');
        //         this.saveChanges('Auto-save');
        //     }
        // }, this.AUTO_SAVE_INTERVAL);
    }

    setupEventListeners() {
        // Warn before leaving page with unsaved changes
        const beforeUnloadHandler = (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        };

        window.addEventListener('beforeunload', beforeUnloadHandler);
        this.eventListeners.push({ type: 'beforeunload', handler: beforeUnloadHandler });
    }

    refreshPageContent() {
        // Trigger page content refresh
        if (window.loadContentFromDatabase) {
            window.loadContentFromDatabase();
        }
    }

    refreshTeamMembersDisplay() {
        // Trigger team members refresh if on about page
        if (window.aboutAdminManager && window.aboutAdminManager.renderTeamMembers) {
            window.aboutAdminManager.renderTeamMembers();
        }
    }

    /**
     * Event system for component communication
     */
    triggerEvent(eventName, data) {
        const event = new CustomEvent(`versionControl.${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }

    addEventListener(eventName, handler) {
        document.addEventListener(`versionControl.${eventName}`, handler);
    }

    removeEventListener(eventName, handler) {
        document.removeEventListener(`versionControl.${eventName}`, handler);
    }

    /**
     * Public API methods
     */
    getVersionHistory() {
        return this.versionHistory;
    }

    getCurrentVersion() {
        return this.currentVersion;
    }

    hasChanges() {
        return this.hasUnsavedChanges;
    }

    getTemporaryCache() {
        return this.temporaryCache;
    }

    /**
     * Cleanup
     */
    destroy() {
        // Remove event listeners
        this.eventListeners.forEach(({ type, handler }) => {
            window.removeEventListener(type, handler);
        });
        
        this.endModificationSession();
        this.isInitialized = false;
        console.log('🔄 Version Control Manager destroyed');
    }
}

// Create global instance
const versionControlManager = new VersionControlManager();

// Export for use in other modules
export default versionControlManager; 