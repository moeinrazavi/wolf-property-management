/**
 * Optimized Version Control Manager for Wolf Property Management
 * 
 * Key Optimizations:
 * - Differential change tracking (like WordPress revisions)
 * - Intelligent caching for instant restoration
 * - Batch operations for better performance
 * - Minimal database round trips
 * - Smart snapshot creation at intervals
 */

import dbService from './supabase-client.js';

class OptimizedVersionControlManager {
    constructor() {
        this.dbService = dbService;
        this.isInitialized = false;
        
        // Performance optimizations
        this.changeCache = new Map(); // Cache recent changes
        this.snapshotCache = new Map(); // Cache snapshots for instant restore
        this.pendingChanges = []; // Batch changes before saving
        this.batchTimer = null;
        
        // Configuration
        this.BATCH_DELAY = 1000; // Batch changes for 1 second
        this.CACHE_SIZE = 50; // Keep 50 recent versions in cache
        this.SNAPSHOT_INTERVAL = 5; // Create snapshot every 5 versions
        this.MAX_VERSIONS = 100; // Keep max 100 versions
        
        // State tracking
        this.currentVersion = 0;
        this.hasUnsavedChanges = false;
        this.currentPage = this.getCurrentPage();
        
        console.log('🚀 Optimized Version Control Manager created');
    }

    /**
     * Initialize the optimized version control system
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('⚠️ Optimized Version Control Manager already initialized');
            return { success: true };
        }

        console.log('🚀 Initializing Optimized Version Control Manager...');

        try {
            // Load current version number
            await this.loadCurrentVersion();
            
            // Preload recent snapshots into cache
            await this.preloadSnapshots();
            
            // Set up cleanup job
            this.setupMaintenanceJobs();
            
            this.isInitialized = true;
            console.log('✅ Optimized Version Control Manager initialized successfully');
            
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to initialize Optimized Version Control Manager:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Track a change with intelligent batching
     */
    trackChange(elementId, oldValue, newValue, changeType = 'update', metadata = {}) {
        // Skip if no actual change
        if (oldValue === newValue) {
            return;
        }

        const change = {
            elementId,
            oldValue,
            newValue,
            changeType, // 'create', 'update', 'delete'
            contentType: metadata.contentType || 'text',
            timestamp: Date.now(),
            metadata: {
                page: this.currentPage,
                ...metadata
            }
        };

        // Add to pending changes
        this.pendingChanges.push(change);
        this.hasUnsavedChanges = true;

        // Update cache immediately for UI responsiveness
        this.changeCache.set(elementId, change);

        // Batch the save operation
        this.scheduleBatchSave();

        console.log(`📝 Change tracked: ${elementId} (${changeType})`);
        this.triggerEvent('changeTracked', change);
    }

    /**
     * Batch save changes for better performance
     */
    scheduleBatchSave() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        this.batchTimer = setTimeout(() => {
            this.processPendingChanges();
        }, this.BATCH_DELAY);
    }

    /**
     * Process and temporarily store pending changes
     */
    async processPendingChanges() {
        if (this.pendingChanges.length === 0) {
            return;
        }

        console.log(`🔄 Processing ${this.pendingChanges.length} pending changes...`);

        // Store in temporary session storage for crash recovery
        const changesBatch = {
            timestamp: Date.now(),
            page: this.currentPage,
            changes: [...this.pendingChanges]
        };

        // Store in browser session for recovery
        sessionStorage.setItem('versionControl_pendingChanges', JSON.stringify(changesBatch));

        // Clear pending changes
        this.pendingChanges = [];
        
        this.triggerEvent('changesBatched', changesBatch);
    }

    /**
     * Save all changes as a new version (GitHub-style)
     * CRITICAL: Saves the CURRENT state as version checkpoint, then applies changes
     */
    async saveChangesGitHubStyle(description = '', pendingTeamChanges = null, pendingRentalChanges = null) {
        console.log('💾 Saving changes with GitHub-style version control...');

        try {
            // **STEP 1: Capture CURRENT state from database BEFORE any changes**
            console.log('📸 Capturing current database state (BEFORE changes)...');
            const currentContentState = await this.captureCurrentContentState();
            
            // Get content changes from session storage
            const pendingData = sessionStorage.getItem('versionControl_pendingChanges');
            let contentChanges = [];
            if (pendingData) {
                const changesBatch = JSON.parse(pendingData);
                contentChanges = changesBatch.changes || [];
            }
            
            // Check if we have any changes to save
            const hasContentChanges = contentChanges.length > 0;
            const hasTeamChanges = pendingTeamChanges && Object.keys(pendingTeamChanges).length > 0;
            const hasRentalChanges = pendingRentalChanges && Object.keys(pendingRentalChanges).length > 0;
            
            if (!hasContentChanges && !hasTeamChanges && !hasRentalChanges) {
                return { success: true, message: 'No changes to save' };
            }

            console.log(`📋 Found ${contentChanges.length} content changes, ${hasTeamChanges ? 'team member' : 'no team'} changes, and ${hasRentalChanges ? 'rental listing' : 'no rental'} changes`);

            // **STEP 2: Generate version number**
            const versionNumber = await this.getNextVersionNumber();

            // **STEP 3: Save CURRENT state as the version checkpoint**
            // This represents the state BEFORE the changes we're about to apply
            await this.saveContentStateAsVersion(
                currentContentState, 
                versionNumber, 
                description || this.generateAutoDescription(contentChanges, pendingTeamChanges, pendingRentalChanges)
            );

            console.log(`📝 Version ${versionNumber} checkpoint created with CURRENT state (before changes)`);

            // **STEP 4: Apply new changes to make them live**
            let totalChanges = 0;
            
            // Apply content changes if any
            if (hasContentChanges) {
                console.log('✅ Applying content changes to database...');
                await this.applyChangesToWebsiteContent(contentChanges);
                totalChanges += contentChanges.length;
            }
            
            // Apply team member changes if any
            if (hasTeamChanges) {
                console.log('✅ Applying team member changes to database...');
                await this.applyTeamChangesToDatabase(pendingTeamChanges);
                totalChanges += Object.keys(pendingTeamChanges).length;
            }
            
            // Apply rental listing changes if any
            if (hasRentalChanges) {
                console.log('✅ Applying rental listing changes to database...');
                await this.applyRentalChangesToDatabase(pendingRentalChanges);
                totalChanges += Object.keys(pendingRentalChanges).length;
            }

            // **STEP 5: Update version tracking**
            this.currentVersion = versionNumber;

            // Create snapshot if needed
            if (versionNumber % this.SNAPSHOT_INTERVAL === 0) {
                await this.createSnapshot(versionNumber);
            }

            // Clear session storage
            sessionStorage.removeItem('versionControl_pendingChanges');
            this.hasUnsavedChanges = false;

            // Update cache
            if (hasContentChanges) {
                this.updateCacheAfterSave(versionNumber, contentChanges);
            }

            // Cleanup old versions
            this.scheduleCleanup();

            console.log(`✅ Version ${versionNumber} saved successfully with GitHub-style logic`);
            console.log(`📋 Version ${versionNumber} = state BEFORE changes, current = state AFTER changes`);
            
            this.triggerEvent('versionSaved', { 
                version: versionNumber, 
                description: description || this.generateAutoDescription(contentChanges, pendingTeamChanges, pendingRentalChanges),
                changeCount: totalChanges 
            });

            return {
                success: true,
                version: versionNumber,
                description: description || this.generateAutoDescription(contentChanges, pendingTeamChanges),
                changeCount: totalChanges
            };
            
        } catch (error) {
            console.error('❌ Failed to save version with GitHub-style logic:', error);
            this.triggerEvent('saveError', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Legacy save method - redirects to GitHub-style save
     */
    async saveChanges(description = '') {
        return await this.saveChangesGitHubStyle(description);
    }

    /**
     * Capture the current content state from the website_content table
     */
    async captureCurrentContentState() {
        console.log('📸 Capturing current content state...');
        
        try {
            // Get current content from database
            const { data: contentData, error } = await this.dbService.supabase
                .from('website_content')
                .select('element_id, content_text, content_type')
                .eq('page_name', this.currentPage)
                .eq('is_active', true)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error getting current content:', error);
                throw error;
            }

            // Convert to content state format
            const contentState = {};
            const processedElements = new Set();
            
            // Process content data (already ordered by updated_at DESC to get latest)
            contentData.forEach(item => {
                if (!processedElements.has(item.element_id)) {
                    contentState[item.element_id] = item.content_text;
                    processedElements.add(item.element_id);
                }
            });

            // Get current team members from database
            try {
                const { data: teamMembers, error: teamError } = await this.dbService.supabase
                    .from('team_members')
                    .select('*')
                    .eq('page_name', this.currentPage)
                    .eq('is_active', true)
                    .order('sort_order');
                    
                if (!teamError && teamMembers && teamMembers.length > 0) {
                    // Store team members data with special prefix
                    contentState['_team_members_data'] = JSON.stringify(teamMembers);
                    console.log(`✅ Captured ${teamMembers.length} team members`);
                } else if (teamError) {
                    console.warn('⚠️ Could not capture team members:', teamError);
                }
            } catch (teamError) {
                console.warn('⚠️ Error capturing team members:', teamError);
            }

            console.log(`✅ Captured current state with ${Object.keys(contentState).length} elements`);
            return contentState;
            
        } catch (error) {
            console.error('❌ Failed to capture current content state:', error);
            throw error;
        }
    }

    /**
     * Save a content state as a version checkpoint
     */
    async saveContentStateAsVersion(contentState, versionNumber, description) {
        console.log(`💾 Saving content state as version ${versionNumber}...`);
        
        try {
            // Try to save to different version control tables based on what exists
            let saved = false;

            // Try 1: Save to version_history table (simple schema)
            try {
                const { error } = await this.dbService.supabase
                    .from('version_history')
                    .insert({
                        version_number: versionNumber,
                        page_name: this.currentPage,
                        description: description,
                        changes: contentState,
                        created_by: this.dbService.currentUser?.id,
                        created_at: new Date().toISOString()
                    });

                if (!error) {
                    console.log('✅ Saved version to version_history table');
                    saved = true;
                }
            } catch (versionHistoryError) {
                console.log('⚠️ version_history table not available, trying other tables...');
            }

            // Try 2: Save to content_versions + content_changes (optimized schema)
            if (!saved) {
                try {
                    // Insert version record
                    const { data: versionRecord, error: versionError } = await this.dbService.supabase
                        .from('content_versions')
                        .insert({
                            version_number: versionNumber,
                            page_name: this.currentPage,
                            description: description,
                            version_type: 'manual',
                            change_summary: {
                                element_count: Object.keys(contentState).length,
                                snapshot: true
                            },
                            created_by: this.dbService.currentUser?.id,
                            parent_version: this.currentVersion
                        })
                        .select()
                        .single();

                    if (!versionError && versionRecord) {
                        // Save content as "changes" (the state being preserved)
                        const contentRecords = Object.entries(contentState).map(([elementId, content]) => ({
                            version_id: versionRecord.id,
                            element_id: elementId,
                            change_type: 'snapshot',
                            old_value: null,
                            new_value: content,
                            content_type: 'text',
                            metadata: { snapshot: true }
                        }));

                        const { error: changesError } = await this.dbService.supabase
                            .from('content_changes')
                            .insert(contentRecords);

                        if (!changesError) {
                            console.log('✅ Saved version to content_versions + content_changes tables');
                            saved = true;
                        }
                    }
                } catch (optimizedError) {
                    console.log('⚠️ Optimized schema tables not available, trying website_states...');
                }
            }

            // Try 3: Save to website_states table (alternative schema)
            if (!saved) {
                try {
                    const { error } = await this.dbService.supabase
                        .from('website_states')
                        .insert({
                            version_number: versionNumber,
                            page_context: this.currentPage,
                            description: description,
                            complete_state: contentState,
                            state_hash: this.generateHash(JSON.stringify(contentState)),
                            created_by: this.dbService.currentUser?.id,
                            is_temporary: false
                        });

                    if (!error) {
                        console.log('✅ Saved version to website_states table');
                        saved = true;
                    }
                } catch (websiteStatesError) {
                    console.log('⚠️ website_states table not available');
                }
            }

            if (!saved) {
                throw new Error('No available version control table found to save version');
            }

            console.log(`✅ Version ${versionNumber} saved as checkpoint`);
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to save content state as version:', error);
            throw error;
        }
    }

    /**
     * Generate a simple hash for content state
     */
    generateHash(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }

    /**
     * Restore to a specific version with actual content restoration
     */
    async restoreVersion(versionNumber, confirm = true) {
        console.log(`🔄 Restoring to version ${versionNumber}...`);

        if (confirm && this.hasUnsavedChanges) {
            const userConfirmed = window.confirm(
                `You have unsaved changes that will be lost.\n\n` +
                `Are you sure you want to restore to version ${versionNumber}?`
            );
            if (!userConfirmed) {
                return { success: false, message: 'Restore cancelled by user' };
            }
        }

        try {
            const startTime = Date.now();

            // **PROPER VERSION RESTORATION**: Get actual version data and restore it
            console.log(`🔄 Restoring to version ${versionNumber} with actual content...`);
            
            // Try to get version data from different possible tables
            let versionContent = null;
            
            // First try: optimized schema (content_changes table)
            try {
                const { data: versionData, error: versionError } = await this.dbService.supabase
                    .from('content_versions')
                    .select('id')
                    .eq('version_number', versionNumber)
                    .eq('page_name', this.currentPage)
                    .single();

                if (!versionError && versionData) {
                    // Get changes for this version
                    const { data: changesData, error: changesError } = await this.dbService.supabase
                        .from('content_changes')
                        .select('element_id, new_value, change_type')
                        .eq('version_id', versionData.id);

                    if (!changesError && changesData) {
                        versionContent = {};
                        changesData.forEach(change => {
                            if (change.change_type !== 'delete' && change.new_value) {
                                versionContent[change.element_id] = change.new_value;
                            }
                        });
                        console.log('✅ Retrieved version content from optimized schema');
                    }
                }
            } catch (optimizedError) {
                console.log('⚠️ Optimized schema not available, trying simple schema...');
            }

            // Second try: simple schema (version_history table with JSONB)
            if (!versionContent) {
                try {
                    const { data: historyData, error: historyError } = await this.dbService.supabase
                        .from('version_history')
                        .select('changes')
                        .eq('version_number', versionNumber)
                        .eq('page_name', this.currentPage)
                        .single();

                    if (!historyError && historyData && historyData.changes) {
                        versionContent = historyData.changes;
                        console.log('✅ Retrieved version content from version_history table');
                    }
                } catch (historyError) {
                    console.log('⚠️ Version history table not available...');
                }
            }

            // Third try: website_states table (if exists)
            if (!versionContent) {
                try {
                    const { data: statesData, error: statesError } = await this.dbService.supabase
                .from('website_states')
                .select('complete_state')
                .eq('version_number', versionNumber)
                        .eq('page_context', this.currentPage)
                .single();

                    if (!statesError && statesData && statesData.complete_state) {
                        versionContent = statesData.complete_state;
                        console.log('✅ Retrieved version content from website_states table');
                    }
                } catch (statesError) {
                    console.log('⚠️ Website states table not available...');
                }
            }

            if (!versionContent || Object.keys(versionContent).length === 0) {
                throw new Error(`No content found for version ${versionNumber}. The version may not exist or contain no changes.`);
            }

            console.log(`📋 Found content for ${Object.keys(versionContent).length} elements in version ${versionNumber}`);

            // Apply the version content to the database (make it persistent)
            await this.restoreContentToDatabase(versionContent, versionNumber);

            // Apply the version content to the page display
            await this.applyContentToPage(versionContent);

            // Clear any pending changes
            sessionStorage.removeItem('versionControl_pendingChanges');
            this.hasUnsavedChanges = false;
            this.changeCache.clear();

            // Refresh team members if on about page to sync with any team member changes
            if (window.aboutAdminManager && window.aboutAdminManager.loadTeamMembersFromDatabase) {
                await window.aboutAdminManager.loadTeamMembersFromDatabase();
            }
            
            // Refresh rental listings if on rentals page to sync with any rental listing changes
            if (window.rentalsAdminManager && window.rentalsAdminManager.loadRentalListingsFromDatabase) {
                await window.rentalsAdminManager.loadRentalListingsFromDatabase();
                await window.rentalsAdminManager.renderRentalListings();
            }

            const restoreTime = Date.now() - startTime;
            console.log(`✅ Version ${versionNumber} restored successfully in ${restoreTime}ms`);

            this.triggerEvent('versionRestored', { 
                version: versionNumber, 
                restoreTime 
            });

            return {
                success: true,
                version: versionNumber,
                restoreTime,
                method: 'version_restore',
                elementsRestored: Object.keys(versionContent).length
            };

        } catch (error) {
            console.error('❌ Failed to restore version:', error);
            this.triggerEvent('restoreError', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Restore content to database so it persists on page refresh
     */
    async restoreContentToDatabase(versionContent, versionNumber) {
        console.log('💾 Restoring content to database for persistence...');
        
        try {
            let contentItemsCount = 0;
            
            // Process each content item individually to handle existing content properly
            for (const [elementId, content] of Object.entries(versionContent)) {
                // Skip internal tracking fields and team members data (handled separately)
                if (elementId.startsWith('_')) continue;
                
                try {
                    contentItemsCount++;
                    
                    // First, check if content already exists for this element
                    const { data: existingContent, error: selectError } = await this.dbService.supabase
                        .from('website_content')
                        .select('id')
                        .eq('page_name', this.currentPage)
                        .eq('element_id', elementId)
                        .eq('is_active', true)
                        .order('updated_at', { ascending: false })
                        .limit(1);

                    if (selectError) {
                        console.warn(`Warning checking existing content for ${elementId}:`, selectError);
                    }

                    if (existingContent && existingContent.length > 0) {
                        // Update existing content
                        const { error: updateError } = await this.dbService.supabase
                            .from('website_content')
                            .update({
                                content_text: content,
                                content_type: 'text',
                                updated_at: new Date().toISOString(),
                                version: versionNumber
                            })
                            .eq('id', existingContent[0].id);

                        if (updateError) {
                            console.warn(`Error updating content for ${elementId}:`, updateError);
                        } else {
                            console.log(`✅ Restored content for ${elementId} to database`);
                        }
                    } else {
                        // Insert new content
                        const { error: insertError } = await this.dbService.supabase
                            .from('website_content')
                            .insert({
                                page_name: this.currentPage,
                                element_id: elementId,
                                content_text: content,
                                content_type: 'text',
                                version: versionNumber,
                                is_active: true,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            });

                        if (insertError) {
                            console.warn(`Error inserting content for ${elementId}:`, insertError);
                        } else {
                            console.log(`✅ Inserted restored content for ${elementId} to database`);
                        }
                    }
                } catch (elementError) {
                    console.warn(`Error processing content for ${elementId}:`, elementError);
                }
            }

            // Restore team members if data exists
            if (versionContent['_team_members_data']) {
                try {
                    const teamMembersData = JSON.parse(versionContent['_team_members_data']);
                    await this.restoreTeamMembersToDatabase(teamMembersData);
                    console.log(`✅ Restored ${teamMembersData.length} team members`);
                } catch (teamError) {
                    console.error('❌ Error restoring team members:', teamError);
                }
            }

            console.log(`✅ Restored ${contentItemsCount} content items to database`);
            
        } catch (error) {
            console.error('❌ Failed to restore content to database:', error);
            throw error;
        }
    }

    /**
     * Restore team members to database
     */
    async restoreTeamMembersToDatabase(teamMembersData) {
        console.log('👥 Restoring team members to database...');
        
        try {
            // First, deactivate all current team members for this page
            await this.dbService.supabase
                .from('team_members')
                .update({ is_active: false })
                .eq('page_name', this.currentPage);
                
            // Then insert/restore the version team members
            for (const member of teamMembersData) {
                // Remove the original id to avoid conflicts, let database generate new ones
                const { id: originalId, ...memberData } = member;
                
                const { error } = await this.dbService.supabase
                    .from('team_members')
                    .upsert({
                        ...memberData,
                        is_active: true,
                        updated_at: new Date().toISOString()
                    });
                    
                if (error) {
                    console.error('❌ Error restoring team member:', error);
                }
            }
            
            console.log('✅ Team members restored successfully');
            
        } catch (error) {
            console.error('❌ Error restoring team members:', error);
            throw error;
        }
    }

    /**
     * Apply content to the page display
     */
    async applyContentToPage(versionContent) {
        console.log('🖼️ Applying restored content to page display...');
        
        try {
            let appliedCount = 0;
            
            // Apply each content item to the page
            for (const [elementId, content] of Object.entries(versionContent)) {
                // Skip internal tracking fields and team members data (handled separately)
                if (elementId.startsWith('_')) continue;
                try {
                    // Find element on the page using multiple strategies
                    let element = null;
                    
                    // Strategy 1: Find by data-editable-id attribute
                    element = document.querySelector(`[data-editable-id="${elementId}"]`);
                    
                    // Strategy 2: Find by matching current content
                    if (!element) {
                        const allEditableElements = document.querySelectorAll('[contenteditable="true"], .editable-text, [data-editable-id]');
                        element = Array.from(allEditableElements).find(el => {
                            const currentContent = el.textContent || el.innerText;
                            return currentContent.trim() === content.trim() || 
                                   el.getAttribute('data-editable-id') === elementId;
                        });
                    }
                    
                    // Strategy 3: Find by element ID matching
                    if (!element) {
                        element = document.getElementById(elementId);
                    }
                    
                    // Strategy 4: Try finding by selector patterns
                    if (!element) {
                        // Try common patterns
                        const selectors = [
                            `#${elementId}`,
                            `.${elementId}`,
                            `[id="${elementId}"]`,
                            `[data-element-id="${elementId}"]`
                        ];
                        
                        for (const selector of selectors) {
                            try {
                                element = document.querySelector(selector);
                                if (element) break;
                            } catch (e) {
                                // Invalid selector, continue
                            }
                        }
                    }
                    
                    if (element) {
                        // Apply the content
                        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                            element.value = content;
                        } else {
                            element.textContent = content;
                        }
                        
                        // Set the data attribute for future reference
                        element.setAttribute('data-editable-id', elementId);
                        
                        appliedCount++;
                        console.log(`✅ Applied restored content to: ${elementId}`);
                    } else {
                        console.warn(`⚠️ Could not find element for: ${elementId}`);
                    }
                } catch (elementError) {
                    console.warn(`Error applying content for ${elementId}:`, elementError);
                }
            }
            
            // Apply team members to page if data exists
            if (versionContent['_team_members_data']) {
                try {
                    const teamMembersData = JSON.parse(versionContent['_team_members_data']);
                    await this.applyTeamMembersToPage(teamMembersData);
                    console.log(`✅ Applied ${teamMembersData.length} team members to page`);
                } catch (teamError) {
                    console.error('❌ Error applying team members to page:', teamError);
                }
            }
            
            console.log(`✅ Applied ${appliedCount} out of ${Object.keys(versionContent).length} content items to page`);
            
        } catch (error) {
            console.error('❌ Failed to apply content to page:', error);
            throw error;
        }
    }

    /**
     * Apply team members to page
     */
    async applyTeamMembersToPage(teamMembersData) {
        console.log('👥 Applying team members to page...');
        
        try {
            // Check if aboutAdminManager is available to re-render team members
            if (window.aboutAdminManager && typeof window.aboutAdminManager.renderTeamMembers === 'function') {
                // Update the team members data in aboutAdminManager
                window.aboutAdminManager.teamMembers = teamMembersData;
                window.aboutAdminManager.originalTeamMembers = JSON.parse(JSON.stringify(teamMembersData));
                
                // Clear any pending changes since we're restoring to a specific version
                if (typeof window.aboutAdminManager.clearPendingChanges === 'function') {
                    window.aboutAdminManager.clearPendingChanges();
                }
                
                // Re-render the team members section
                await window.aboutAdminManager.renderTeamMembers();
                console.log('✅ Team members section re-rendered');
            } else {
                // Fallback: try to refresh the page section or show a message
                console.log('⚠️ aboutAdminManager not available, page refresh may be needed to see team member changes');
            }
            
        } catch (error) {
            console.error('❌ Error applying team members to page:', error);
            throw error;
        }
    }

    /**
     * Get version history with fallback compatibility
     */
    async getVersionHistory(limit = 20) {
        try {
            // Try different tables in order of preference
            let versions = [];
            
            // First try: optimized content_versions table
            try {
                const { data, error } = await this.dbService.supabase
                    .from('content_versions')
                    .select('version_number, description, created_at, version_type')
                    .eq('page_name', this.currentPage)
                    .eq('is_active', true)
                    .order('version_number', { ascending: false })
                    .limit(limit);

                if (!error && data && data.length > 0) {
                    versions = data;
                    console.log('✅ Retrieved version history from content_versions table');
                }
            } catch (contentVersionsError) {
                console.log('⚠️ content_versions table not available, trying version_history...');
            }

            // Second try: simple version_history table
            if (versions.length === 0) {
                try {
                    const { data, error } = await this.dbService.supabase
                        .from('version_history')
                        .select('version_number, description, created_at')
                        .eq('page_name', this.currentPage)
                        .order('version_number', { ascending: false })
                        .limit(limit);

                    if (!error && data && data.length > 0) {
                        versions = data.map(v => ({
                            ...v,
                            version_type: 'manual' // Default type for simple schema
                        }));
                        console.log('✅ Retrieved version history from version_history table');
                    }
                } catch (versionHistoryError) {
                    console.log('⚠️ version_history table not available, trying website_states...');
                }
            }

            // Third try: website_states table
            if (versions.length === 0) {
                try {
                    const { data, error } = await this.dbService.supabase
                        .from('website_states')
                        .select('version_number, description, created_at')
                        .eq('page_context', this.currentPage)
                        .order('version_number', { ascending: false })
                        .limit(limit);

                    if (!error && data && data.length > 0) {
                        versions = data.map(v => ({
                            ...v,
                            version_type: 'manual' // Default type
                        }));
                        console.log('✅ Retrieved version history from website_states table');
                    }
                } catch (websiteStatesError) {
                    console.log('⚠️ website_states table not available');
                }
            }

            if (versions.length === 0) {
                console.log('⚠️ No version history found in any table - creating placeholder');
                // Return a placeholder if no versions exist
                versions = [{
                    version_number: 1,
                    description: 'Current version (no history available)',
                    created_at: new Date().toISOString(),
                    version_type: 'current'
                }];
            }

            return { versions, error: null };
        } catch (error) {
            console.error('Error loading version history:', error);
            return { versions: [], error: error.message };
        }
    }

    /**
     * Private helper methods
     */

    async loadCurrentVersion() {
        const { data, error } = await this.dbService.supabase
            .from('content_versions')
            .select('version_number')
            .eq('page_name', this.currentPage)
            .eq('is_active', true)
            .order('version_number', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) {
            this.currentVersion = 0;
        } else {
            this.currentVersion = data[0].version_number;
        }

        console.log(`📊 Current version: ${this.currentVersion}`);
    }

    async preloadSnapshots() {
        console.log('📋 Preloading recent snapshots into cache...');
        
        const { data, error } = await this.dbService.supabase
            .from('content_snapshots')
            .select('version_number, complete_content')
            .eq('page_name', this.currentPage)
            .order('version_number', { ascending: false })
            .limit(10);

        if (!error && data) {
            data.forEach(snapshot => {
                const key = `${snapshot.version_number}_${this.currentPage}`;
                this.snapshotCache.set(key, snapshot.complete_content);
            });
            console.log(`📋 Preloaded ${data.length} snapshots`);
        }
    }

    async getNextVersionNumber() {
        const { data, error } = await this.dbService.supabase
            .from('content_versions')
            .select('version_number')
            .order('version_number', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) {
            return 1;
        }

        return data[0].version_number + 1;
    }



    async createSnapshot(versionNumber) {
        console.log(`📋 Creating snapshot for version ${versionNumber}...`);
        
        try {
            // Use the database function for efficient snapshot creation
            const { error } = await this.dbService.supabase
                .rpc('create_content_snapshot', {
                    target_version: versionNumber,
                    target_page: this.currentPage
                });

            if (error) throw error;

            console.log(`✅ Snapshot created for version ${versionNumber}`);
        } catch (error) {
            console.warn('Failed to create snapshot:', error);
        }
    }

    async getSnapshotFromDatabase(versionNumber) {
        try {
            // **FALLBACK APPROACH**: Try content_snapshots table, but handle if it doesn't exist
            const { data, error } = await this.dbService.supabase
                .from('content_snapshots')
                .select('complete_content')
                .eq('version_number', versionNumber)
                .eq('page_name', this.currentPage)
                .single();

            if (error || !data) {
                console.warn('No database snapshot found (table may not exist or no data):', error?.message);
                return null;
            }

            return data.complete_content;
        } catch (error) {
            console.warn('Database snapshot not available:', error.message);
            return null;
        }
    }

    async buildContentFromChanges(versionNumber) {
        console.log(`🔧 Building content from changes for version ${versionNumber}...`);
        
        try {
            // **FALLBACK APPROACH**: Get content from website_content table directly
            // This is more reliable than stored procedures
            console.log('🔄 Using direct database query for restore (more reliable)...');
            
            const { data: contentData, error } = await this.dbService.supabase
                .from('website_content')
                .select('element_id, content_text, content_type')
                .eq('page_name', this.currentPage)
                .eq('is_active', true)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error getting content from database:', error);
                throw error;
            }

            // Convert to the expected format, ensuring we get the latest version of each element
            const content = {};
            const processedElements = new Set();
            
            // Process content data (already ordered by updated_at DESC)
            contentData.forEach(item => {
                if (!processedElements.has(item.element_id)) {
                    content[item.element_id] = item.content_text;
                    processedElements.add(item.element_id);
                }
            });

            console.log(`✅ Built content from database with ${Object.keys(content).length} elements`);
            return content;
            
        } catch (error) {
            console.error('Error building content from changes:', error);
            throw error;
        }
    }

    async applyContentToPage(content) {
        console.log('🔄 Applying content to page...');
        
        // Apply content to editable elements
        Object.entries(content).forEach(([elementId, value]) => {
            const element = document.querySelector(`[data-editable-id="${elementId}"]`);
            if (element) {
                if (element.tagName === 'IMG') {
                    element.src = value;
                } else {
                    element.textContent = value;
                }
            }
        });

        // Update database to reflect the restored state
        await this.updateDatabaseContent(content);

        // Trigger page refresh events
        this.triggerEvent('contentApplied', { elementCount: Object.keys(content).length });
    }

    async updateDatabaseContent(content) {
        console.log('🔄 Updating database content...');
        
        try {
            // Process each content item individually to handle existing content properly
            for (const [elementId, value] of Object.entries(content)) {
                try {
                    // First, check if content already exists for this element
                    const { data: existingContent, error: selectError } = await this.dbService.supabase
                        .from('website_content')
                        .select('id')
                        .eq('page_name', this.currentPage)
                        .eq('element_id', elementId)
                        .eq('is_active', true)
                        .order('updated_at', { ascending: false })
                        .limit(1);

                    if (selectError) {
                        console.warn(`Warning checking existing content for ${elementId}:`, selectError);
                    }

                    if (existingContent && existingContent.length > 0) {
                        // Update existing content
                        const { error: updateError } = await this.dbService.supabase
                            .from('website_content')
                            .update({
                                content_text: value,
                                content_type: 'text',
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existingContent[0].id);

                        if (updateError) {
                            console.warn(`Error updating content for ${elementId}:`, updateError);
                        }
            } else {
                        // Insert new content
                        const { error: insertError } = await this.dbService.supabase
                            .from('website_content')
                            .insert({
                                page_name: this.currentPage,
                                element_id: elementId,
                                content_text: value,
                                content_type: 'text',
                                version: this.currentVersion || 1,
                                is_active: true,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            });

                        if (insertError) {
                            console.warn(`Error inserting content for ${elementId}:`, insertError);
                        }
                    }
                } catch (elementError) {
                    console.warn(`Error processing content for ${elementId}:`, elementError);
                }
            }
        } catch (error) {
            console.warn('Error updating database content:', error);
        }
    }

    /**
     * Apply saved changes to website_content table so they persist on page refresh
     */
    async applyChangesToWebsiteContent(changes) {
        console.log('💾 Applying changes to website_content table for persistence...');
        
        try {
            const processedChanges = changes.filter(change => change.changeType !== 'delete');
            
            if (processedChanges.length === 0) {
                console.log('📝 No content updates to apply');
                return;
            }

            // Process each change individually to handle existing content properly
            for (const change of processedChanges) {
                try {
                    // First, check if content already exists for this element
                    const { data: existingContent, error: selectError } = await this.dbService.supabase
                        .from('website_content')
                        .select('id, version')
                        .eq('page_name', this.currentPage)
                        .eq('element_id', change.elementId)
                        .eq('is_active', true)
                        .order('updated_at', { ascending: false })
                        .limit(1);

                    if (selectError) {
                        console.warn(`Warning checking existing content for ${change.elementId}:`, selectError);
                    }

                    if (existingContent && existingContent.length > 0) {
                        // Update existing content
                        const { error: updateError } = await this.dbService.supabase
                            .from('website_content')
                            .update({
                                content_text: change.newValue,
                                content_type: change.contentType || 'text',
                                updated_at: new Date().toISOString(),
                                version: this.currentVersion
                            })
                            .eq('id', existingContent[0].id);

                        if (updateError) {
                            console.error(`❌ Error updating content for ${change.elementId}:`, updateError);
                        } else {
                            console.log(`✅ Updated content for ${change.elementId}`);
                        }
                    } else {
                        // Insert new content
                        const { error: insertError } = await this.dbService.supabase
                            .from('website_content')
                            .insert({
                                page_name: this.currentPage,
                                element_id: change.elementId,
                                content_text: change.newValue,
                                content_type: change.contentType || 'text',
                                version: this.currentVersion,
                                is_active: true,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            });

                        if (insertError) {
                            console.error(`❌ Error inserting content for ${change.elementId}:`, insertError);
                        } else {
                            console.log(`✅ Inserted new content for ${change.elementId}`);
                        }
                    }
                } catch (elementError) {
                    console.error(`❌ Error processing change for ${change.elementId}:`, elementError);
                }
            }

            console.log(`✅ Processed ${processedChanges.length} changes to website_content table`);
            
        } catch (error) {
            console.error('❌ Failed to apply changes to website_content:', error);
            throw error;
        }
    }

    /**
     * Apply team member changes to team_members table so they persist on page refresh
     */
    async applyChangesToTeamMembers(changes) {
        console.log('👥 Applying team member changes to database for persistence...');
        
        try {
            // Filter for team member changes
            const teamMemberChanges = changes.filter(change => 
                change.elementId && change.elementId.startsWith('team_member_')
            );
            
            if (teamMemberChanges.length === 0) {
                console.log('📝 No team member changes to apply');
                return;
            }

            // Group changes by member ID and process them
            const memberUpdates = new Map();
            
            for (const change of teamMemberChanges) {
                try {
                    const memberId = change.elementId.replace('team_member_', '');
                    
                    if (change.changeType === 'delete') {
                        // Handle member deletion
                        console.log(`🗑️ Deleting team member: ${memberId}`);
                        const deleteResult = await this.dbService.deleteTeamMember(memberId);
                        if (deleteResult.error) {
                            console.error(`❌ Error deleting team member ${memberId}:`, deleteResult.error);
                        } else {
                            console.log(`✅ Deleted team member: ${memberId}`);
                        }
                    } else if (change.changeType === 'create') {
                        // Handle new member creation
                        console.log(`➕ Creating new team member from change data`);
                        try {
                            const memberData = JSON.parse(change.newValue);
                            const saveResult = await this.dbService.saveTeamMember(memberData);
                            if (saveResult.error) {
                                console.error(`❌ Error creating team member:`, saveResult.error);
                            } else {
                                console.log(`✅ Created new team member:`, saveResult.teamMember?.name);
                            }
                        } catch (parseError) {
                            console.error(`❌ Error parsing team member data for creation:`, parseError);
                        }
                    } else if (change.changeType === 'update') {
                        // Handle member updates
                        try {
                            const oldData = change.oldValue ? JSON.parse(change.oldValue) : {};
                            const newData = change.newValue ? JSON.parse(change.newValue) : {};
                            
                            // Merge the updates for this member
                            if (!memberUpdates.has(memberId)) {
                                memberUpdates.set(memberId, { id: memberId });
                            }
                            
                            const currentUpdate = memberUpdates.get(memberId);
                            Object.assign(currentUpdate, newData);
                            memberUpdates.set(memberId, currentUpdate);
                            
                        } catch (parseError) {
                            console.error(`❌ Error parsing team member update data:`, parseError);
                        }
                    }
                } catch (memberError) {
                    console.error(`❌ Error processing team member change:`, memberError);
                }
            }

            // Apply all member updates
            for (const [memberId, updateData] of memberUpdates) {
                try {
                    console.log(`🔄 Updating team member: ${memberId}`, updateData);
                    const saveResult = await this.dbService.saveTeamMember(updateData);
                    if (saveResult.error) {
                        console.error(`❌ Error updating team member ${memberId}:`, saveResult.error);
                    } else {
                        console.log(`✅ Updated team member: ${saveResult.teamMember?.name}`);
                    }
                } catch (updateError) {
                    console.error(`❌ Error updating team member ${memberId}:`, updateError);
                }
            }

            console.log(`✅ Processed ${teamMemberChanges.length} team member changes`);
            
        } catch (error) {
            console.error('❌ Failed to apply team member changes:', error);
            // Don't throw here - we don't want team member errors to break content saving
        }
    }

    updateCacheAfterSave(versionNumber, changes) {
        // Update the snapshot cache with the new state
        const currentContent = {};
        
        // Build current state from changes
        changes.forEach(change => {
            if (change.changeType !== 'delete') {
                currentContent[change.elementId] = change.newValue;
            }
        });

        this.snapshotCache.set(`${versionNumber}_${this.currentPage}`, currentContent);
        
        // Limit cache size
        if (this.snapshotCache.size > this.CACHE_SIZE) {
            const firstKey = this.snapshotCache.keys().next().value;
            this.snapshotCache.delete(firstKey);
        }
    }

    setupMaintenanceJobs() {
        // Schedule periodic cleanup
        setInterval(() => {
            this.scheduleCleanup();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    async scheduleCleanup() {
        try {
            await this.dbService.supabase
                .rpc('cleanup_old_versions', { keep_count: this.MAX_VERSIONS });
        } catch (error) {
            console.warn('Cleanup job failed:', error);
        }
    }

    generateAutoDescription(contentChanges = [], teamChanges = null, rentalChanges = null) {
        const parts = [];
        
        // Analyze content changes
        if (contentChanges && contentChanges.length > 0) {
            const changeTypes = this.summarizeChangeTypes(contentChanges);
            
            if (changeTypes.update > 0) parts.push(`${changeTypes.update} content updates`);
            if (changeTypes.create > 0) parts.push(`${changeTypes.create} content additions`);
            if (changeTypes.delete > 0) parts.push(`${changeTypes.delete} content deletions`);
        }
        
        // Analyze team member changes
        if (teamChanges && Object.keys(teamChanges).length > 0) {
            let teamCount = 0;
            if (teamChanges.added) teamCount += teamChanges.added.length;
            if (teamChanges.modified) {
                teamCount += teamChanges.modified instanceof Map ? 
                    teamChanges.modified.size : 
                    Object.keys(teamChanges.modified).length;
            }
            if (teamChanges.deleted) teamCount += teamChanges.deleted.length;
            
            if (teamCount > 0) parts.push(`${teamCount} team member changes`);
        }
        
        // Analyze rental listing changes
        if (rentalChanges && Object.keys(rentalChanges).length > 0) {
            let rentalCount = 0;
            if (rentalChanges.added) rentalCount += rentalChanges.added.length;
            if (rentalChanges.modified) {
                rentalCount += rentalChanges.modified instanceof Map ? 
                    rentalChanges.modified.size : 
                    Object.keys(rentalChanges.modified).length;
            }
            if (rentalChanges.deleted) rentalCount += rentalChanges.deleted.length;
            
            if (rentalCount > 0) parts.push(`${rentalCount} rental listing changes`);
        }
        
        if (parts.length === 0) {
            return `Auto-save ${new Date().toLocaleString()}`;
        }
        
        return `Auto-save: ${parts.join(', ')} - ${new Date().toLocaleString()}`;
    }

    summarizeChangeTypes(changes) {
        return changes.reduce((summary, change) => {
            summary[change.changeType] = (summary[change.changeType] || 0) + 1;
            return summary;
        }, {});
    }

    getCurrentPage() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }

    /**
     * Event system
     */
    triggerEvent(eventName, data) {
        const event = new CustomEvent(`optimizedVersionControl.${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }

    addEventListener(eventName, handler) {
        document.addEventListener(`optimizedVersionControl.${eventName}`, handler);
    }

    /**
     * Public API
     */
    hasChanges() {
        return this.hasUnsavedChanges || this.pendingChanges.length > 0;
    }

    getCurrentVersion() {
        return this.currentVersion;
    }

    getStats() {
        return {
            currentVersion: this.currentVersion,
            cacheSize: this.snapshotCache.size,
            pendingChanges: this.pendingChanges.length,
            hasUnsavedChanges: this.hasUnsavedChanges
        };
    }

    /**
     * Clear all versions from version control database
     */
    async clearAllVersions() {
        console.log('🗑️ Clearing all versions from database...');
        
        try {
            let deletedCount = 0;
            const tables = ['version_history', 'content_versions', 'website_states'];
            
            // Try to clear from all possible version tables
            for (const tableName of tables) {
                try {
                    // First count existing versions
                    const { data: existingData, error: countError } = await this.dbService.supabase
                        .from(tableName)
                        .select('id', { count: 'exact' });
                        
                    if (!countError && existingData) {
                        const tableCount = existingData.length;
                        
                        // Delete all records from this table
                        const { error: deleteError } = await this.dbService.supabase
                            .from(tableName)
                            .delete()
                            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except impossible UUID
                            
                        if (!deleteError) {
                            deletedCount += tableCount;
                            console.log(`✅ Cleared ${tableCount} versions from ${tableName}`);
                        } else {
                            console.warn(`⚠️ Error clearing ${tableName}:`, deleteError);
                        }
                    }
                } catch (tableError) {
                    console.warn(`⚠️ Table ${tableName} not available or accessible:`, tableError);
                }
            }
            
            // Clear any cached data
            this.snapshotCache.clear();
            this.changeCache.clear();
            
            // Reset version counter
            this.currentVersion = 0;
            
            console.log(`✅ Cleared ${deletedCount} total versions from all tables`);
            
            return {
                success: true,
                deletedCount: deletedCount
            };
            
        } catch (error) {
            console.error('❌ Failed to clear all versions:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Apply team member changes directly to database (GitHub-style)
     */
    async applyTeamChangesToDatabase(pendingTeamChanges) {
        console.log('👥 Applying team member changes to database...');
        
        try {
            // pendingTeamChanges should be an object with the structure:
            // { added: [...], modified: Map/Object, deleted: [...] }
            
            if (pendingTeamChanges.added && pendingTeamChanges.added.length > 0) {
                console.log(`➕ Adding ${pendingTeamChanges.added.length} new team members...`);
                for (const newMember of pendingTeamChanges.added) {
                    const { error } = await this.dbService.saveTeamMember(newMember);
                    if (error) {
                        console.error(`❌ Error adding team member ${newMember.name}:`, error);
                    } else {
                        console.log(`✅ Added team member: ${newMember.name}`);
                    }
                }
            }
            
            if (pendingTeamChanges.modified) {
                const modifiedEntries = pendingTeamChanges.modified instanceof Map ? 
                    Array.from(pendingTeamChanges.modified.entries()) :
                    Object.entries(pendingTeamChanges.modified);
                    
                console.log(`🔄 Updating ${modifiedEntries.length} team members...`);
                for (const [memberId, changes] of modifiedEntries) {
                    // Get the full member data and apply changes
                    const { data: existingMember } = await this.dbService.supabase
                        .from('team_members')
                        .select('*')
                        .eq('id', memberId)
                        .single();
                        
                    if (existingMember) {
                        const updatedMember = { ...existingMember, ...changes };
                        const { error } = await this.dbService.saveTeamMember(updatedMember);
                        if (error) {
                            console.error(`❌ Error updating team member ${memberId}:`, error);
                        } else {
                            console.log(`✅ Updated team member: ${updatedMember.name}`);
                        }
                    }
                }
            }
            
            if (pendingTeamChanges.deleted && pendingTeamChanges.deleted.length > 0) {
                console.log(`🗑️ Deleting ${pendingTeamChanges.deleted.length} team members...`);
                for (const memberId of pendingTeamChanges.deleted) {
                    const { error } = await this.dbService.deleteTeamMember(memberId);
                    if (error) {
                        console.error(`❌ Error deleting team member ${memberId}:`, error);
                    } else {
                        console.log(`✅ Deleted team member: ${memberId}`);
                    }
                }
            }
            
            console.log('✅ All team member changes applied successfully');
            
        } catch (error) {
            console.error('❌ Error applying team member changes:', error);
            throw error;
        }
    }

    /**
     * Apply rental listing changes directly to database (GitHub-style)
     */
    async applyRentalChangesToDatabase(pendingRentalChanges) {
        console.log('🏠 Applying rental listing changes to database...');
        
        try {
            // pendingRentalChanges should be an object with the structure:
            // { added: [...], modified: Map/Object, deleted: [...] }
            
            if (pendingRentalChanges.added && pendingRentalChanges.added.length > 0) {
                console.log(`➕ Adding ${pendingRentalChanges.added.length} new rental listings...`);
                for (const newListing of pendingRentalChanges.added) {
                    // Remove temporary fields before saving
                    const { id: tempId, isNew, ...listingToSave } = newListing;
                    const { error } = await this.dbService.saveRentalListing(listingToSave);
                    if (error) {
                        console.error(`❌ Error adding rental listing ${newListing.title}:`, error);
                    } else {
                        console.log(`✅ Added rental listing: ${newListing.title}`);
                    }
                }
            }
            
            if (pendingRentalChanges.modified) {
                const modifiedEntries = pendingRentalChanges.modified instanceof Map ? 
                    Array.from(pendingRentalChanges.modified.entries()) :
                    Object.entries(pendingRentalChanges.modified);
                    
                console.log(`🔄 Updating ${modifiedEntries.length} rental listings...`);
                for (const [listingId, changes] of modifiedEntries) {
                    // Get the full listing data and apply changes
                    const { data: existingListing } = await this.dbService.supabase
                        .from('rental_listings')
                        .select('*')
                        .eq('id', listingId)
                        .single();
                        
                    if (existingListing) {
                        const updatedListing = { ...existingListing, ...changes };
                        const { error } = await this.dbService.saveRentalListing(updatedListing);
                        if (error) {
                            console.error(`❌ Error updating rental listing ${listingId}:`, error);
                        } else {
                            console.log(`✅ Updated rental listing: ${updatedListing.title}`);
                        }
                    }
                }
            }
            
            if (pendingRentalChanges.deleted && pendingRentalChanges.deleted.length > 0) {
                console.log(`🗑️ Deleting ${pendingRentalChanges.deleted.length} rental listings...`);
                for (const listingId of pendingRentalChanges.deleted) {
                    const { error } = await this.dbService.deleteRentalListing(listingId);
                    if (error) {
                        console.error(`❌ Error deleting rental listing ${listingId}:`, error);
                    } else {
                        console.log(`✅ Deleted rental listing: ${listingId}`);
                    }
                }
            }
            
            console.log('✅ All rental listing changes applied successfully');
            
        } catch (error) {
            console.error('❌ Failed to apply rental listing changes:', error);
            throw error;
        }
    }

    /**
     * Create baseline version (Version 0) - represents initial state before any changes
     */
    async createBaselineVersion() {
        console.log('📸 Creating baseline version - capturing initial state...');
        
        try {
            // Capture the current state as it exists right now
            const initialState = await this.captureCurrentContentState();
            
            // Save this as Version 1 (the baseline)
            const baselineVersion = 1;
            await this.saveContentStateAsVersion(
                initialState, 
                baselineVersion, 
                'Initial State - Baseline before any changes'
            );
            
            // Update current version
            this.currentVersion = baselineVersion;
            
            console.log(`✅ Baseline Version ${baselineVersion} created with initial state`);
            console.log(`📋 Captured ${Object.keys(initialState).length} content items as baseline`);
            
            // Check if team members were captured
            if (initialState['_team_members_data']) {
                const teamMembers = JSON.parse(initialState['_team_members_data']);
                console.log(`👥 Baseline includes ${teamMembers.length} team members`);
            }
            
            return { success: true, version: baselineVersion };
            
        } catch (error) {
            console.error('❌ Failed to create baseline version:', error);
            throw error;
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        this.changeCache.clear();
        this.snapshotCache.clear();
        this.pendingChanges = [];
        this.isInitialized = false;
        console.log('🔄 Optimized Version Control Manager destroyed');
    }
}

// Create global instance
const optimizedVersionControlManager = new OptimizedVersionControlManager();

// Export for use in other modules
export default optimizedVersionControlManager; 