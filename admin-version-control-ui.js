/**
 * Optimized Version Control UI for Wolf Property Management
 * 
 * Features:
 * - Real-time performance metrics
 * - Fast version switching with progress indicators
 * - Intelligent UI updates
 * - Batch change indicators
 * - Cache status display
 */

import optimizedVersionControlManager from './version-control-manager.js';

class OptimizedVersionControlUI {
    constructor() {
        this.versionManager = optimizedVersionControlManager;
        this.isInitialized = false;
        this.eventListeners = [];
        this.updateTimer = null;
        
        // UI state
        this.isRestoring = false;
        this.lastRestoreTime = 0;
        
        console.log('🎛️ Optimized Version Control UI created');
    }

    /**
     * Initialize the optimized UI
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('⚠️ Optimized Version Control UI already initialized');
            return;
        }

        console.log('🚀 Initializing Optimized Version Control UI...');

        try {
            // Initialize the version control manager
            const result = await this.versionManager.initialize();
            if (!result.success) {
                throw new Error(result.error);
            }

            // Add optimized UI elements
            this.addOptimizedUI();
            
                    // Set up event listeners
        this.setupEventListeners();
        
        // Start performance monitoring
        this.startPerformanceMonitoring();
        
        this.isInitialized = true;
        console.log('✅ Optimized Version Control UI initialized successfully');
        
        // Update UI to show baseline version if it exists
        this.updateUI();
            
        } catch (error) {
            console.error('❌ Failed to initialize Optimized Version Control UI:', error);
            throw error;
        }
    }

    /**
     * Add optimized UI elements
     */
    addOptimizedUI() {
        const adminControls = document.querySelector('.admin-controls-content');
        if (!adminControls) {
            console.warn('❌ Admin controls not found');
            return;
        }

        // Remove old UI if it exists
        const existingUI = document.getElementById('optimized-version-control-ui');
        if (existingUI) {
            existingUI.remove();
        }

        const optimizedUI = document.createElement('div');
        optimizedUI.id = 'optimized-version-control-ui';
        optimizedUI.className = 'optimized-version-control-ui';
        optimizedUI.innerHTML = this.createUIHTML();

        // Insert at the beginning of admin controls
        adminControls.insertBefore(optimizedUI, adminControls.firstChild);
        
        // Update initial state
        this.updateUI();
    }

    /**
     * Create the optimized UI HTML
     */
    createUIHTML() {
        return `
            <div class="optimized-version-section">
                <div class="version-header">
                    <h4>⚡ Optimized Version Control</h4>
                    <div class="performance-badge" id="performance-badge">
                        <span class="performance-indicator">●</span>
                        <span class="performance-text">Ready</span>
                    </div>
                </div>
                
                <div class="version-stats" id="version-stats">
                    <div class="stat-item">
                        <span class="stat-label">Current:</span>
                        <span class="stat-value" id="current-version-stat">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Cached:</span>
                        <span class="stat-value" id="cache-size-stat">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Pending:</span>
                        <span class="stat-value" id="pending-changes-stat">0</span>
                    </div>
                    <div class="stat-item" id="restore-time-stat" style="display: none;">
                        <span class="stat-label">Last Restore:</span>
                        <span class="stat-value" id="restore-time-value">-</span>
                    </div>
                </div>
                
                <div class="version-actions">
                    <button id="optimized-save-btn" class="btn btn-primary optimized-save-btn" disabled>
                        💾 Save Changes
                    </button>
                    <button id="optimized-history-btn" class="btn btn-secondary">
                        📚 Quick History
                    </button>
                    <button id="performance-details-btn" class="btn btn-secondary btn-small">
                        📊 Performance
                    </button>
                    <button id="clear-all-versions-btn" class="btn btn-danger btn-small">
                        🗑️ Clear All Versions
                    </button>
                </div>
                
                <div class="batch-indicator" id="batch-indicator" style="display: none;">
                    <div class="batch-progress">
                        <div class="batch-bar" id="batch-bar"></div>
                    </div>
                    <div class="batch-text" id="batch-text">Batching changes...</div>
                </div>
            </div>
        `;
    }

    /**
     * Update UI with current state and performance metrics
     */
    updateUI() {
        const stats = this.versionManager.getStats();
        
        // Update version stats
        this.updateElement('current-version-stat', stats.currentVersion);
        this.updateElement('cache-size-stat', stats.cacheSize);
        this.updateElement('pending-changes-stat', stats.pendingChanges);
        
        // Update save button
        const saveButton = document.getElementById('optimized-save-btn');
        if (saveButton) {
            const hasChanges = stats.hasUnsavedChanges || stats.pendingChanges > 0;
            saveButton.disabled = !hasChanges;
            saveButton.classList.toggle('has-changes', hasChanges);
            
            if (hasChanges) {
                const totalChanges = stats.pendingChanges + (stats.hasUnsavedChanges ? 1 : 0);
                saveButton.textContent = `💾 Save Changes (${totalChanges})`;
            } else {
                saveButton.textContent = '💾 Save Changes';
            }
        }
        
        // Update performance badge
        this.updatePerformanceBadge(stats);
        
        // Show/hide batch indicator
        this.updateBatchIndicator(stats.pendingChanges > 0);
    }

    /**
     * Update performance badge based on system state
     */
    updatePerformanceBadge(stats) {
        const badge = document.getElementById('performance-badge');
        if (!badge) return;

        const indicator = badge.querySelector('.performance-indicator');
        const text = badge.querySelector('.performance-text');
        
        if (this.isRestoring) {
            indicator.style.color = '#f39c12';
            text.textContent = 'Restoring...';
            badge.className = 'performance-badge restoring';
        } else if (stats.pendingChanges > 0) {
            indicator.style.color = '#e74c3c';
            text.textContent = 'Batching';
            badge.className = 'performance-badge batching';
        } else if (stats.cacheSize > 10) {
            indicator.style.color = '#27ae60';
            text.textContent = 'Optimized';
            badge.className = 'performance-badge optimized';
        } else {
            indicator.style.color = '#3498db';
            text.textContent = 'Ready';
            badge.className = 'performance-badge ready';
        }
    }

    /**
     * Update batch indicator
     */
    updateBatchIndicator(show) {
        const indicator = document.getElementById('batch-indicator');
        if (!indicator) return;

        if (show) {
            indicator.style.display = 'block';
            this.animateBatchProgress();
        } else {
            indicator.style.display = 'none';
        }
    }

    /**
     * Animate batch progress bar
     */
    animateBatchProgress() {
        const bar = document.getElementById('batch-bar');
        if (!bar) return;

        bar.style.width = '0%';
        bar.style.transition = 'width 1s ease-out';
        
        setTimeout(() => {
            bar.style.width = '100%';
        }, 100);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Save button
        this.addEventDelegate('click', 'optimized-save-btn', () => this.handleSaveChanges());
        
        // History button
        this.addEventDelegate('click', 'optimized-history-btn', () => this.showQuickHistory());
        
        // Performance details button
        this.addEventDelegate('click', 'performance-details-btn', () => this.showPerformanceDetails());
        
        // Clear all versions button
        this.addEventDelegate('click', 'clear-all-versions-btn', () => this.handleClearAllVersions());

        // Listen to version control events
        this.versionManager.addEventListener('changeTracked', () => this.updateUI());
        this.versionManager.addEventListener('changesBatched', () => this.updateUI());
        this.versionManager.addEventListener('versionSaved', (e) => this.handleVersionSaved(e.detail));
        this.versionManager.addEventListener('versionRestored', (e) => this.handleVersionRestored(e.detail));
        this.versionManager.addEventListener('saveError', (e) => this.showErrorMessage(e.detail.error));
        this.versionManager.addEventListener('restoreError', (e) => this.showErrorMessage(e.detail.error));
    }

    /**
     * Handle save changes with GitHub-style version control
     */
    async handleSaveChanges() {
        const saveButton = document.getElementById('optimized-save-btn');
        if (!saveButton || saveButton.disabled) return;

        // Show loading state
        const originalText = saveButton.textContent;
        saveButton.textContent = '⏳ Saving...';
        saveButton.disabled = true;

        const startTime = Date.now();

        try {
            // Get description from user
            const description = this.promptForDescription();
            
            // **GITHUB-STYLE FIX**: Pass pending team member changes to version control
            // Instead of saving them first, we let version control handle the entire flow
            let pendingTeamChanges = null;
            if (window.aboutAdminManager && window.aboutAdminManager.hasUnsavedChanges) {
                console.log('📋 Getting pending team member changes for version control...');
                pendingTeamChanges = window.aboutAdminManager.getPendingChangesForVersionControl();
            }
            
            // Save changes with GitHub-style logic (version control will handle everything)
            const result = await this.versionManager.saveChangesGitHubStyle(description, pendingTeamChanges);
            
            if (result.success) {
                const saveTime = Date.now() - startTime;
                this.showSuccessMessage(
                    `✅ Version ${result.version} saved in ${saveTime}ms! (${result.changeCount} changes)`
                );
                
                // Clear team manager pending changes since version control handled them
                if (window.aboutAdminManager && pendingTeamChanges) {
                    console.log('🔄 Clearing team manager pending changes...');
                    window.aboutAdminManager.clearPendingChanges();
                    // Refresh to show the applied changes
                    await window.aboutAdminManager.loadTeamMembersFromDatabase();
                }
                
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            this.showErrorMessage(`Save failed: ${error.message}`);
        } finally {
            saveButton.textContent = originalText;
            this.updateUI();
        }
    }

    /**
     * Show quick history modal with fast restoration
     */
    async showQuickHistory() {
        try {
            const { versions, error } = await this.versionManager.getVersionHistory(10);
            
            if (error) {
                throw new Error(error);
            }

            const modal = this.createHistoryModal(versions);
            document.body.appendChild(modal);
            
        } catch (error) {
            this.showErrorMessage(`Failed to load history: ${error.message}`);
        }
    }

    /**
     * Create optimized history modal
     */
    createHistoryModal(versions) {
        const modal = document.createElement('div');
        modal.className = 'optimized-history-modal';
        modal.innerHTML = `
            <div class="optimized-history-content">
                <div class="history-header">
                    <h3>⚡ Quick Version History</h3>
                    <div class="cache-status">
                        <span class="cache-indicator">📋</span>
                        <span>${this.versionManager.getStats().cacheSize} cached versions</span>
                    </div>
                    <button class="history-close">&times;</button>
                </div>
                <div class="version-info">
                    <p style="color: #666; font-size: 14px; margin: 10px 0;">
                        💡 Each version is a checkpoint you can restore to. Version 1 is your baseline (original state).
                    </p>
                </div>
                <div class="history-body">
                    <div class="performance-info">
                        <div class="perf-item">
                            <span class="perf-icon">⚡</span>
                            <span>Cached versions restore instantly</span>
                        </div>
                        <div class="perf-item">
                            <span class="perf-icon">🔧</span>
                            <span>Other versions build from changes</span>
                        </div>
                    </div>
                    <div class="version-list">
                        ${versions.length === 0 ? 
                            '<div class="no-versions">No versions saved yet</div>' : 
                            versions.map(version => this.createVersionItem(version)).join('')
                        }
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        modal.querySelector('.history-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Version restore buttons
        modal.querySelectorAll('.optimized-restore-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const versionNumber = parseInt(btn.getAttribute('data-version'));
                await this.handleFastRestore(versionNumber, btn);
                modal.remove();
            });
        });

        return modal;
    }

    /**
     * Create version item with performance indicators
     */
    createVersionItem(version) {
        const isCached = this.versionManager.snapshotCache.has(
            `${version.version_number}_${this.versionManager.currentPage}`
        );
        
        const isBaseline = version.version_number === 1 || (version.description && version.description.includes('Initial State'));
        const versionClass = isBaseline ? 'optimized-version-item baseline-version' : 'optimized-version-item';
        
        return `
            <div class="${versionClass}">
                <div class="version-info">
                    <div class="version-header">
                        <span class="version-number">${isBaseline ? '📸 v' + version.version_number : 'v' + version.version_number}</span>
                        <div class="version-indicators">
                            ${isBaseline ? '<span class="baseline-indicator" title="Baseline - Original State">🏠</span>' : ''}
                            ${isCached ? '<span class="cache-indicator" title="Cached - Instant Restore">📋</span>' : '<span class="build-indicator" title="Will build from changes">🔧</span>'}
                        </div>
                    </div>
                    <div class="version-description">${version.description || 'No description'}</div>
                    <div class="version-meta">
                        <span class="version-date">${new Date(version.created_at).toLocaleString()}</span>
                        <span class="version-type">${version.version_type}</span>
                    </div>
                </div>
                <div class="version-actions">
                    <button class="optimized-restore-btn btn-primary" data-version="${version.version_number}">
                        ${isCached ? '⚡ Instant Restore' : '🔧 Restore'}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Handle fast restoration with progress tracking
     */
    async handleFastRestore(versionNumber, button) {
        const originalText = button.textContent;
        button.textContent = '⏳ Restoring...';
        button.disabled = true;
        
        this.isRestoring = true;
        this.updateUI();

        try {
            const result = await this.versionManager.restoreVersion(versionNumber, true);
            
            if (result.success) {
                this.lastRestoreTime = result.restoreTime;
                
                // Show restore time stat
                const restoreTimeStat = document.getElementById('restore-time-stat');
                const restoreTimeValue = document.getElementById('restore-time-value');
                if (restoreTimeStat && restoreTimeValue) {
                    restoreTimeValue.textContent = `${result.restoreTime}ms`;
                    restoreTimeStat.style.display = 'block';
                }
                
                // Show detailed success message
                const elementsText = result.elementsRestored ? ` (${result.elementsRestored} elements)` : '';
                this.showSuccessMessage(
                    `✅ Version ${versionNumber} restored in ${result.restoreTime}ms${elementsText}!`
                );
                
                // No need to refresh page content - restore function already applied content directly
                // Content and database have been updated by the restore function
            } else {
                if (result.message !== 'Restore cancelled by user') {
                    throw new Error(result.error);
                }
            }
            
        } catch (error) {
            console.error('❌ Restore failed:', error);
            this.showErrorMessage(`Restore failed: ${error.message}`);
        } finally {
            button.textContent = originalText;
            button.disabled = false;
            this.isRestoring = false;
            this.updateUI();
        }
    }

    /**
     * Show performance details modal
     */
    showPerformanceDetails() {
        const stats = this.versionManager.getStats();
        
        const modal = document.createElement('div');
        modal.className = 'performance-details-modal';
        modal.innerHTML = `
            <div class="performance-details-content">
                <div class="performance-header">
                    <h3>📊 Performance Details</h3>
                    <button class="performance-close">&times;</button>
                </div>
                <div class="performance-body">
                    <div class="performance-section">
                        <h4>System Status</h4>
                        <div class="perf-stats">
                            <div class="perf-stat">
                                <span class="perf-label">Current Version:</span>
                                <span class="perf-value">${stats.currentVersion}</span>
                            </div>
                            <div class="perf-stat">
                                <span class="perf-label">Cached Snapshots:</span>
                                <span class="perf-value">${stats.cacheSize}</span>
                            </div>
                            <div class="perf-stat">
                                <span class="perf-label">Pending Changes:</span>
                                <span class="perf-value">${stats.pendingChanges}</span>
                            </div>
                            <div class="perf-stat">
                                <span class="perf-label">Unsaved Changes:</span>
                                <span class="perf-value">${stats.hasUnsavedChanges ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="performance-section">
                        <h4>Performance Optimizations</h4>
                        <div class="optimization-list">
                            <div class="optimization-item">
                                <span class="opt-icon">📋</span>
                                <span class="opt-text">Snapshot caching for instant restoration</span>
                            </div>
                            <div class="optimization-item">
                                <span class="opt-icon">⚡</span>
                                <span class="opt-text">Differential change tracking</span>
                            </div>
                            <div class="optimization-item">
                                <span class="opt-icon">🔄</span>
                                <span class="opt-text">Intelligent batch processing</span>
                            </div>
                            <div class="optimization-item">
                                <span class="opt-icon">🗄️</span>
                                <span class="opt-text">Optimized database queries</span>
                            </div>
                        </div>
                    </div>
                    
                    ${this.lastRestoreTime > 0 ? `
                    <div class="performance-section">
                        <h4>Last Restore Performance</h4>
                        <div class="restore-performance">
                            <div class="restore-time">${this.lastRestoreTime}ms</div>
                            <div class="restore-analysis">
                                ${this.analyzeRestorePerformance(this.lastRestoreTime)}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.performance-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Analyze restore performance
     */
    analyzeRestorePerformance(restoreTime) {
        if (restoreTime < 50) {
            return '🚀 Excellent - Cached snapshot used';
        } else if (restoreTime < 200) {
            return '⚡ Very Good - Database snapshot used';
        } else if (restoreTime < 500) {
            return '✅ Good - Built from changes';
        } else {
            return '⚠️ Slow - Consider optimizing';
        }
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        // Update UI every 2 seconds
        this.updateTimer = setInterval(() => {
            this.updateUI();
        }, 2000);
    }

    /**
     * Integration with content editing
     */
    trackContentChange(elementId, oldValue, newValue, metadata = {}) {
        this.versionManager.trackChange(elementId, oldValue, newValue, 'update', metadata);
    }

    /**
     * Handle version saved event
     */
    handleVersionSaved(detail) {
        this.updateUI();
        // Auto-hide batch indicator after save
        setTimeout(() => {
            this.updateBatchIndicator(false);
        }, 1000);
    }

    /**
     * Handle version restored event
     */
    handleVersionRestored(detail) {
        this.lastRestoreTime = detail.restoreTime;
        this.updateUI();
    }

    /**
     * Handle clear all versions request
     */
    async handleClearAllVersions() {
        // Confirm action with user
        const confirmed = confirm(
            '⚠️ Clear All Versions?\n\n' +
            'This will permanently delete ALL saved versions from version control.\n' +
            'This action cannot be undone.\n\n' +
            'Are you sure you want to continue?'
        );
        
        if (!confirmed) return;
        
        // Double confirmation for safety
        const doubleConfirmed = confirm(
            '🚨 FINAL CONFIRMATION\n\n' +
            'Type "DELETE" in the next prompt to confirm deletion of all versions.'
        );
        
        if (!doubleConfirmed) return;
        
        const confirmText = prompt('Type "DELETE" to confirm:');
        if (confirmText !== 'DELETE') {
            alert('❌ Action cancelled - confirmation text did not match.');
            return;
        }
        
        try {
            // Show loading state
            const clearButton = document.getElementById('clear-all-versions-btn');
            if (clearButton) {
                clearButton.textContent = '⏳ Clearing...';
                clearButton.disabled = true;
            }
            
            // Clear all versions from database
            const result = await this.versionManager.clearAllVersions();
            
            if (result.success) {
                this.showSuccessMessage(
                    `✅ All versions cleared successfully! (${result.deletedCount} versions deleted)`
                );
                this.updateUI();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ Failed to clear versions:', error);
            this.showErrorMessage(`Failed to clear versions: ${error.message}`);
        } finally {
            // Restore button state
            const clearButton = document.getElementById('clear-all-versions-btn');
            if (clearButton) {
                clearButton.textContent = '🗑️ Clear All Versions';
                clearButton.disabled = false;
            }
        }
    }

    /**
     * Utility methods
     */
    addEventDelegate(eventType, elementId, handler) {
        const delegate = (e) => {
            if (e.target && e.target.id === elementId) {
                e.preventDefault();
                handler(e);
            }
        };
        document.addEventListener(eventType, delegate);
        this.eventListeners.push({ type: eventType, handler: delegate });
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    promptForDescription() {
        return prompt(
            'Version Description (optional):\n\n' +
            'Describe the changes you made:'
        ) || '';
    }

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

    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `optimized-toast toast-${type}`;
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
     * Public API
     */
    isReady() {
        return this.isInitialized;
    }

    getVersionManager() {
        return this.versionManager;
    }

    /**
     * Cleanup
     */
    cleanup() {
        // Clear timers
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        // Remove event listeners
        this.eventListeners.forEach(({ type, handler }) => {
            document.removeEventListener(type, handler);
        });
        this.eventListeners = [];
        
        // Remove UI elements
        const ui = document.getElementById('optimized-version-control-ui');
        if (ui) {
            ui.remove();
        }
        
        // Remove any toasts
        document.querySelectorAll('.optimized-toast').forEach(toast => toast.remove());
        
        this.isInitialized = false;
        console.log('🎛️ Optimized Version Control UI cleaned up');
    }
}

// Create global instance
const adminVersionControlUI = new OptimizedVersionControlUI();

// Export for use in other modules
export default adminVersionControlUI; 