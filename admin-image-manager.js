/**
 * Admin Image Manager
 * Handles image uploads to multiple Supabase Storage buckets
 * Including support for the figures bucket for charts and graphs
 */

import dbService from './supabase-client.js';

class AdminImageManager {
    constructor() {
        this.dbService = dbService;
        this.isInitialized = false;
        
        // Available buckets configuration
        this.buckets = {
            'wolf-property-images': {
                name: 'wolf-property-images',
                displayName: '🏠 Property Images',
                subfolders: ['images', 'people'],
                allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
                maxSize: 10 * 1024 * 1024 // 10MB
            },
            'figures': {
                name: 'figures',
                displayName: '📊 Figures & Charts',
                subfolders: ['charts', 'graphs', 'infographics', 'uploaded'],
                allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'],
                maxSize: 15 * 1024 * 1024 // 15MB
            }
        };
    }

    /**
     * Initialize the image manager
     */
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🖼️ Initializing Admin Image Manager...');
        
        try {
            // Add image management controls to admin interface
            this.addImageManagerControls();
            this.isInitialized = true;
            console.log('✅ Admin Image Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Admin Image Manager:', error);
            throw error;
        }
    }

    /**
     * Add image management controls to the admin interface
     */
    addImageManagerControls() {
        const adminControls = document.querySelector('.admin-controls-content');
        if (!adminControls) {
            console.warn('Admin controls not found, image manager controls not added');
            return;
        }

        // Check if controls already exist
        if (document.getElementById('image-manager-controls')) {
            return;
        }

        // Create image manager controls
        const imageManagerControls = document.createElement('div');
        imageManagerControls.id = 'image-manager-controls';
        imageManagerControls.className = 'image-manager-controls';
        imageManagerControls.innerHTML = `
            <div class="image-manager-section">
                <h4>📷 Image Management</h4>
                <div class="image-manager-buttons">
                    <button id="upload-to-figures-btn" class="btn btn-image-manager">
                        📊 Upload to Figures
                    </button>
                    <button id="upload-to-property-btn" class="btn btn-image-manager">
                        🏠 Upload to Property Images
                    </button>
                    <button id="browse-images-btn" class="btn btn-image-manager">
                        🗂️ Browse All Images
                    </button>
                </div>
            </div>
        `;

        // Add to admin controls
        adminControls.appendChild(imageManagerControls);

        // Add event listeners
        document.getElementById('upload-to-figures-btn').addEventListener('click', () => {
            this.showUploadModal('figures');
        });

        document.getElementById('upload-to-property-btn').addEventListener('click', () => {
            this.showUploadModal('wolf-property-images');
        });

        document.getElementById('browse-images-btn').addEventListener('click', () => {
            this.showImageBrowser();
        });

        console.log('✅ Image manager controls added to admin interface');
    }

    /**
     * Show upload modal for specific bucket
     */
    showUploadModal(bucketName) {
        const bucket = this.buckets[bucketName];
        if (!bucket) {
            alert('Unknown bucket: ' + bucketName);
            return;
        }

        // Create upload modal
        const modal = document.createElement('div');
        modal.className = 'upload-modal';
        modal.innerHTML = `
            <div class="upload-modal-content">
                <div class="upload-modal-header">
                    <h3>${bucket.displayName} Upload</h3>
                    <span class="upload-modal-close">&times;</span>
                </div>
                <div class="upload-modal-body">
                    <div class="bucket-info">
                        <p><strong>Bucket:</strong> ${bucket.name}</p>
                        <p><strong>Max file size:</strong> ${(bucket.maxSize / 1024 / 1024).toFixed(1)}MB</p>
                        <p><strong>Allowed types:</strong> ${bucket.allowedTypes.map(type => type.split('/')[1]).join(', ')}</p>
                    </div>
                    
                    <div class="subfolder-selection">
                        <label for="subfolder-select">Choose subfolder:</label>
                        <select id="subfolder-select">
                            ${bucket.subfolders.map(folder => `<option value="${folder}">${folder}</option>`).join('')}
                        </select>
                    </div>

                    <div class="file-upload-area">
                        <div class="file-drop-zone" id="file-drop-zone">
                            <div class="drop-zone-content">
                                <p>📁 Drag and drop images here</p>
                                <p>or</p>
                                <button type="button" class="btn btn-select-files" id="select-files-btn">
                                    Choose Files
                                </button>
                            </div>
                        </div>
                        <input type="file" id="file-input" multiple accept="${bucket.allowedTypes.join(',')}" style="display: none;">
                    </div>

                    <div class="selected-files-list" id="selected-files-list" style="display: none;">
                        <h4>Selected Files:</h4>
                        <div id="files-preview"></div>
                    </div>

                    <div class="upload-progress" id="upload-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <p id="progress-text">Uploading...</p>
                    </div>
                </div>
                <div class="upload-modal-footer">
                    <button id="upload-btn" class="btn btn-primary" disabled>Upload Images</button>
                    <button id="cancel-upload-btn" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        this.setupUploadModalEvents(modal, bucketName);
    }

    /**
     * Setup event listeners for upload modal
     */
    setupUploadModalEvents(modal, bucketName) {
        const bucket = this.buckets[bucketName];
        const dropZone = modal.querySelector('#file-drop-zone');
        const fileInput = modal.querySelector('#file-input');
        const selectFilesBtn = modal.querySelector('#select-files-btn');
        const uploadBtn = modal.querySelector('#upload-btn');
        const cancelBtn = modal.querySelector('#cancel-upload-btn');
        const closeBtn = modal.querySelector('.upload-modal-close');
        const selectedFilesList = modal.querySelector('#selected-files-list');
        const filesPreview = modal.querySelector('#files-preview');
        
        let selectedFiles = [];

        // Close modal events
        closeBtn.addEventListener('click', () => modal.remove());
        cancelBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // File selection events
        selectFilesBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            handleFiles(Array.from(e.target.files));
        });

        // Drag and drop events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files);
        });

        // Upload button
        uploadBtn.addEventListener('click', () => {
            if (selectedFiles.length > 0) {
                const subfolder = modal.querySelector('#subfolder-select').value;
                this.uploadFiles(selectedFiles, bucketName, subfolder, modal);
            }
        });

        function handleFiles(files) {
            selectedFiles = [];
            filesPreview.innerHTML = '';

            files.forEach(file => {
                // Validate file type
                if (!bucket.allowedTypes.includes(file.type)) {
                    alert(`File type ${file.type} not allowed for ${bucket.displayName}`);
                    return;
                }

                // Validate file size
                if (file.size > bucket.maxSize) {
                    alert(`File ${file.name} exceeds maximum size of ${(bucket.maxSize / 1024 / 1024).toFixed(1)}MB`);
                    return;
                }

                selectedFiles.push(file);

                // Create preview
                const filePreview = document.createElement('div');
                filePreview.className = 'file-preview';
                filePreview.innerHTML = `
                    <div class="file-info">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${(file.size / 1024 / 1024).toFixed(2)}MB</span>
                    </div>
                    <button type="button" class="remove-file-btn" data-file-name="${file.name}">×</button>
                `;

                // Add image preview if it's an image
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.className = 'file-thumbnail';
                    img.src = URL.createObjectURL(file);
                    img.onload = () => URL.revokeObjectURL(img.src);
                    filePreview.prepend(img);
                }

                filesPreview.appendChild(filePreview);
            });

            // Show/hide files list and enable/disable upload button
            if (selectedFiles.length > 0) {
                selectedFilesList.style.display = 'block';
                uploadBtn.disabled = false;
            } else {
                selectedFilesList.style.display = 'none';
                uploadBtn.disabled = true;
            }

            // Add remove file listeners
            filesPreview.querySelectorAll('.remove-file-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const fileName = e.target.getAttribute('data-file-name');
                    selectedFiles = selectedFiles.filter(f => f.name !== fileName);
                    e.target.closest('.file-preview').remove();
                    
                    if (selectedFiles.length === 0) {
                        selectedFilesList.style.display = 'none';
                        uploadBtn.disabled = true;
                    }
                });
            });
        }
    }

    /**
     * Upload files to the specified bucket
     */
    async uploadFiles(files, bucketName, subfolder, modal) {
        const progressDiv = modal.querySelector('#upload-progress');
        const progressFill = modal.querySelector('#progress-fill');
        const progressText = modal.querySelector('#progress-text');
        const uploadBtn = modal.querySelector('#upload-btn');

        try {
            progressDiv.style.display = 'block';
            uploadBtn.disabled = true;

            let uploadedCount = 0;
            const totalFiles = files.length;
            const results = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                progressText.textContent = `Uploading ${file.name} (${i + 1}/${totalFiles})...`;
                
                try {
                    const result = await this.uploadSingleFile(file, bucketName, subfolder);
                    results.push({ file: file.name, success: true, url: result.url });
                    uploadedCount++;
                } catch (error) {
                    console.error(`Failed to upload ${file.name}:`, error);
                    results.push({ file: file.name, success: false, error: error.message });
                }

                // Update progress
                const progress = ((i + 1) / totalFiles) * 100;
                progressFill.style.width = `${progress}%`;
            }

            // Show results
            this.showUploadResults(results, modal);

        } catch (error) {
            console.error('Upload process failed:', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            uploadBtn.disabled = false;
        }
    }

    /**
     * Upload a single file to Supabase Storage
     */
    async uploadSingleFile(file, bucketName, subfolder) {
        try {
            // Use the dbService uploadToBucket method
            const result = await this.dbService.uploadToBucket(file, bucketName, subfolder);
            
            if (result.error) {
                throw new Error(result.error);
            }

            console.log(`✅ Uploaded: ${result.fileName} to ${bucketName}/${result.filePath}`);
            console.log(`📎 Public URL: ${result.url}`);

            return {
                fileName: result.fileName,
                filePath: result.filePath,
                url: result.url
            };
        } catch (error) {
            console.error('Upload single file error:', error);
            throw error;
        }
    }

    /**
     * Show upload results
     */
    showUploadResults(results, modal) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        let message = `Upload Complete!\n\n`;
        message += `✅ Successfully uploaded: ${successful.length} files\n`;
        if (failed.length > 0) {
            message += `❌ Failed to upload: ${failed.length} files\n\n`;
            message += `Failed files:\n${failed.map(f => `- ${f.file}: ${f.error}`).join('\n')}`;
        }

        if (successful.length > 0) {
            message += `\n\nSuccessful uploads:\n${successful.map(f => `- ${f.file}\n  URL: ${f.url}`).join('\n')}`;
        }

        alert(message);
        
        if (successful.length > 0) {
            modal.remove();
        }
    }

    /**
     * Show image browser for all buckets
     */
    async showImageBrowser() {
        const modal = document.createElement('div');
        modal.className = 'image-browser-modal';
        modal.innerHTML = `
            <div class="image-browser-content">
                <div class="image-browser-header">
                    <h3>🗂️ Image Browser</h3>
                    <span class="image-browser-close">&times;</span>
                </div>
                <div class="image-browser-body">
                    <div class="bucket-tabs">
                        ${Object.keys(this.buckets).map(bucketName => `
                            <button class="bucket-tab" data-bucket="${bucketName}">
                                ${this.buckets[bucketName].displayName}
                            </button>
                        `).join('')}
                    </div>
                    <div class="images-container" id="images-container">
                        <p>Select a bucket to view images...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.image-browser-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Bucket tab listeners
        modal.querySelectorAll('.bucket-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const bucketName = e.target.getAttribute('data-bucket');
                this.loadBucketImages(bucketName, modal);
                
                // Update active tab
                modal.querySelectorAll('.bucket-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Load first bucket by default
        const firstBucket = Object.keys(this.buckets)[0];
        modal.querySelector(`[data-bucket="${firstBucket}"]`).click();
    }

    /**
     * Load images from a specific bucket
     */
    async loadBucketImages(bucketName, modal) {
        const container = modal.querySelector('#images-container');
        container.innerHTML = '<p>Loading images...</p>';

        try {
            const { files, error } = await this.dbService.listBucketFiles(bucketName);

            if (error) throw new Error(error);

            if (!files || files.length === 0) {
                container.innerHTML = '<p>No images found in this bucket.</p>';
                return;
            }

            // Create image grid
            container.innerHTML = `
                <div class="image-grid">
                    ${files.map(file => {
                        const publicUrl = this.dbService.getPublicUrl(bucketName, file.name);
                        
                        return `
                            <div class="image-item">
                                <img src="${publicUrl}" alt="${file.name}" loading="lazy">
                                <div class="image-info">
                                    <p class="image-name">${file.name}</p>
                                    <p class="image-size">${(file.metadata?.size / 1024 / 1024 || 0).toFixed(2)}MB</p>
                                    <button class="copy-url-btn" data-url="${publicUrl}">Copy URL</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Add copy URL listeners
            container.querySelectorAll('.copy-url-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const url = e.target.getAttribute('data-url');
                    navigator.clipboard.writeText(url).then(() => {
                        e.target.textContent = 'Copied!';
                        setTimeout(() => {
                            e.target.textContent = 'Copy URL';
                        }, 2000);
                    });
                });
            });

        } catch (error) {
            console.error('Failed to load bucket images:', error);
            container.innerHTML = `<p>Failed to load images: ${error.message}</p>`;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.dbService.isAuthenticated();
    }
}

// Create global instance
const adminImageManager = new AdminImageManager();

// Auto-initialize when admin logs in
document.addEventListener('DOMContentLoaded', () => {
    // Check if admin mode is active
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'class' && 
                mutation.target === document.body) {
                
                if (document.body.classList.contains('admin-mode')) {
                    adminImageManager.initialize();
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
        adminImageManager.initialize();
    }
});

export default adminImageManager; 