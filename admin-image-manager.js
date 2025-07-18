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
        
        // Only use the main bucket - wolf-property-images
        this.bucket = {
            name: 'wolf-property-images',
            displayName: '🏠 Property Images',
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
            maxSize: 10 * 1024 * 1024 // 10MB
        };
    }

    /**
     * Initialize the image manager
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Admin Image Manager already initialized, skipping...');
            return;
        }
        
        console.log('🖼️ Initializing Admin Image Manager...');
        console.log('🔐 Authentication status:', this.dbService.isAuthenticated());
        console.log('🪣 Target bucket:', this.bucket.name);
        
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
        console.log('🎛️ Adding image manager controls to admin interface...');
        
        const adminControls = document.querySelector('.admin-controls-content');
        if (!adminControls) {
            console.warn('❌ Admin controls not found, image manager controls not added');
            return;
        }

        // Check if controls already exist
        if (document.getElementById('image-manager-controls')) {
            console.log('⚠️ Image manager controls already exist, skipping...');
            return;
        }

        console.log('🔨 Creating image management controls...');
        // Create image management controls
        const imageManagerControls = document.createElement('div');
        imageManagerControls.id = 'image-manager-controls';
        imageManagerControls.className = 'image-manager-controls';
        imageManagerControls.innerHTML = `
            <div class="image-manager-section">
                <h4>📷 Image Management</h4>
                <p style="color: rgba(255, 255, 255, 0.8); font-size: 14px; margin: 0 0 15px 0;">
                    Browse and manage images in your wolf-property-images bucket
                </p>
                <div class="image-manager-buttons">
                    <button id="browse-images-btn" class="btn btn-image-manager btn-primary-image" style="background-color: #e74c3c; font-weight: bold; margin-right: 10px;">
                        🗂️ Browse All Images
                    </button>
                    <button id="upload-images-btn" class="btn btn-image-manager" style="background-color: #27ae60;">
                        ➕ Upload New Images
                    </button>
                    <button id="test-bucket-btn" class="btn btn-image-manager" style="background-color: #f39c12; margin-left: 10px;">
                        🔧 Test Bucket Access
                    </button>
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: rgba(255, 255, 255, 0.6);">
                    Main bucket: wolf-property-images
                </div>
            </div>
        `;

        // Add to admin controls (make it prominent by adding at the top)
        const firstChild = adminControls.firstChild;
        if (firstChild) {
            adminControls.insertBefore(imageManagerControls, firstChild);
        } else {
            adminControls.appendChild(imageManagerControls);
        }

        // Add event listeners
        document.getElementById('browse-images-btn').addEventListener('click', () => {
            console.log('🗂️ Browse Images button clicked');
            this.showImageBrowser();
        });

        document.getElementById('upload-images-btn').addEventListener('click', () => {
            console.log('➕ Upload Images button clicked');
            this.showUploadModal();
        });

        document.getElementById('test-bucket-btn').addEventListener('click', () => {
            console.log('🔧 Test Bucket Access button clicked');
            this.testBucketAccess();
        });

        console.log('✅ Image manager controls added to admin interface successfully');
    }

    /**
     * Test bucket access and permissions
     */
    async testBucketAccess() {
        const logToTerminal = (message) => {
            console.log(message);
            // Also send to terminal via fetch to a simple endpoint we can create
            fetch('/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            }).catch(() => {});
        };

        logToTerminal('🔧 === BUCKET ACCESS DIAGNOSTIC TEST ===');
        logToTerminal('🔧 Testing bucket access for wolf-property-images...');
        
        try {
            // Test 1: Check dbService configuration
            logToTerminal('🔧 Test 1: Checking dbService configuration...');
            if (!this.dbService || !this.dbService.supabase) {
                logToTerminal('❌ dbService not properly configured!');
                alert('❌ dbService not configured. Please check the setup.');
                return;
            }
            logToTerminal('✅ dbService is available');

            // Get config from dbService
            const supabaseUrl = this.dbService.supabase.supabaseUrl;
            logToTerminal(`✅ Supabase URL: ${supabaseUrl}`);

            // Test 2: Test basic bucket listing using dbService method
            logToTerminal('🔧 Test 2: Testing basic bucket listing using dbService...');
            
            // Try the direct method first
            try {
                const { data: directTest, error: directError } = await this.dbService.supabase.storage
                    .from('wolf-property-images')
                    .list('', { limit: 10 });

                if (directError) {
                    logToTerminal(`⚠️ Direct method failed: ${directError.message}`);
                } else {
                    logToTerminal('✅ Direct method worked!');
                    logToTerminal(`📁 Direct method found ${directTest?.length || 0} items`);
                }
            } catch (directException) {
                logToTerminal(`⚠️ Direct method exception: ${directException.message}`);
            }

            // Test 3: Test with service role by creating new client
            logToTerminal('🔧 Test 3: Testing with service role key...');
            
            // Import Supabase client
            const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
            
            // Get service role key from the global config or use the one you provided
            const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNycHNwemdlbW5meGtxYWxnam16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY4NTc4NywiZXhwIjoyMDY4MjYxNzg3fQ.gs0HWCRjDlp81mvx28DKfRN0MFK2JjJbIf4aBJThl2M';
            
            const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey);
            logToTerminal('✅ Service role client created');

            // Test root bucket listing
            const { data: rootListing, error: rootError } = await serviceRoleClient.storage
                .from('wolf-property-images')
                .list('', { limit: 100 });

            if (rootError) {
                logToTerminal(`❌ Error listing root bucket: ${rootError.message}`);
                logToTerminal(`❌ Error details: ${JSON.stringify(rootError)}`);
                alert(`❌ Bucket access failed: ${rootError.message}`);
                return;
            }

            logToTerminal('✅ Root bucket listing successful');
            logToTerminal(`📁 Root items found: ${rootListing?.length || 0}`);
            
            if (rootListing && rootListing.length > 0) {
                rootListing.forEach((item, index) => {
                    logToTerminal(`📄 Root item ${index + 1}: ${item.name} (${item.id ? 'file' : 'folder'})`);
                });
            }

            // Test 4: Test all known paths
            const pathsToTest = ['images', 'images/people'];
            for (const path of pathsToTest) {
                logToTerminal(`🔧 Test 4.${pathsToTest.indexOf(path) + 1}: Testing path "${path}"...`);
                
                const { data: pathData, error: pathError } = await serviceRoleClient.storage
                    .from('wolf-property-images')
                    .list(path, { limit: 100 });

                if (pathError) {
                    logToTerminal(`❌ Error listing path "${path}": ${pathError.message}`);
                } else {
                    logToTerminal(`✅ Path "${path}" listing successful`);
                    logToTerminal(`📁 Items in "${path}": ${pathData?.length || 0}`);
                    
                    if (pathData && pathData.length > 0) {
                        pathData.forEach((item, index) => {
                            logToTerminal(`📄 "${path}" item ${index + 1}: ${item.name}`);
                        });
                    }
                }
            }

            // Test 5: Test our recursive function
            logToTerminal('🔧 Test 5: Testing our recursive listBucketFiles function...');
            const result = await this.dbService.listBucketFiles('wolf-property-images');
            logToTerminal(`📊 Recursive function result: ${JSON.stringify(result, null, 2)}`);

            if (result.error) {
                logToTerminal(`❌ Our function returned error: ${result.error}`);
                alert(`❌ Our function failed: ${result.error}`);
            } else {
                logToTerminal('✅ Our function succeeded');
                logToTerminal(`📁 Total files found: ${result.files.length}`);
                
                if (result.files.length > 0) {
                    result.files.forEach((file, index) => {
                        logToTerminal(`📄 File ${index + 1}: ${file.fullPath || file.name}`);
                    });
                    alert(`✅ Test successful! Found ${result.files.length} files. Check console and terminal for details.`);
                } else {
                    logToTerminal('⚠️ No files found in recursive search');
                    alert('⚠️ Test completed but no files found. Check console and terminal for details.');
                }
            }

        } catch (error) {
            const errorMsg = `💥 Test failed with exception: ${error.message}`;
            logToTerminal(errorMsg);
            logToTerminal(`💥 Full error: ${JSON.stringify(error, null, 2)}`);
            alert(`💥 Test failed: ${error.message}`);
        }
    }

    /**
     * Show upload modal for the main bucket
     */
    showUploadModal() {
        const bucket = this.bucket;

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
        this.setupUploadModalEvents(modal);
    }

    /**
     * Setup event listeners for upload modal
     */
    setupUploadModalEvents(modal) {
        const bucket = this.bucket;
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
                this.uploadFiles(selectedFiles, bucket.name, modal);
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

            // Add remove file listeners
            filesPreview.querySelectorAll('.remove-file-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const fileName = e.target.getAttribute('data-file-name');
                    selectedFiles = selectedFiles.filter(f => f.name !== fileName);
                    e.target.closest('.file-preview').remove();
                    updateUploadButton();
                });
            });

            updateUploadButton();
        }

        function updateUploadButton() {
            if (selectedFiles.length > 0) {
                selectedFilesList.style.display = 'block';
                uploadBtn.disabled = false;
                uploadBtn.textContent = `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`;
            } else {
                selectedFilesList.style.display = 'none';
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Upload Images';
            }
        }
    }

    /**
     * Upload files to the main bucket
     */
    async uploadFiles(files, bucketName, modal) {
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
                    const result = await this.uploadSingleFile(file, bucketName);
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
     * Upload a single file to the main bucket
     */
    async uploadSingleFile(file, bucketName) {
        try {
            // Upload directly to the main bucket without subfolder
            const result = await this.dbService.uploadToBucket(file, bucketName, '');
            
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
     * Show image browser for the main bucket
     */
    async showImageBrowser() {
        console.log('🚀 Showing image browser for wolf-property-images bucket');
        
        const modal = document.createElement('div');
        modal.className = 'image-browser-modal';
        modal.innerHTML = `
            <div class="image-browser-content">
                <div class="image-browser-header">
                    <h3>🗂️ Browse Images</h3>
                    <div style="font-size: 14px; color: #666; margin: 5px 0;">
                        Manage images in your wolf-property-images bucket
                    </div>
                    <span class="image-browser-close">&times;</span>
                </div>
                <div class="image-browser-body">
                    <div class="bucket-actions" style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                        <button id="upload-new-images" class="btn btn-image-manager" style="margin-right: 10px; background-color: #27ae60;">
                            ➕ Upload New Images
                        </button>
                        <button id="refresh-images" class="btn btn-image-manager">
                            🔄 Refresh
                        </button>
                        <span style="margin-left: 15px; color: #666; font-size: 14px;">
                            Bucket: wolf-property-images
                        </span>
                    </div>
                    <div class="images-container" id="images-container">
                        <p>Loading images...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        console.log('✅ Image browser modal added to page');

        // Add event listeners
        modal.querySelector('.image-browser-close').addEventListener('click', () => {
            console.log('❌ Image browser modal closed');
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('❌ Image browser modal closed (clicked outside)');
                modal.remove();
            }
        });

        // Upload new images button
        modal.querySelector('#upload-new-images').addEventListener('click', () => {
            console.log('➕ Upload New Images button clicked from browser');
            modal.remove();
            this.showUploadModal();
        });

        // Refresh button
        modal.querySelector('#refresh-images').addEventListener('click', () => {
            console.log('🔄 Refresh button clicked');
            this.loadBucketImages(modal);
        });

        // Load images from the main bucket
        console.log('📂 Starting to load bucket images...');
        this.loadBucketImages(modal);
    }

    /**
     * Load images from a specific bucket
     */
    async loadBucketImages(modal) {
        const container = modal.querySelector('#images-container');
        container.innerHTML = '<div style="text-align: center; padding: 20px;"><p>Loading images...</p></div>';

        console.log('🚀 Starting to load bucket images...');
        console.log('🔧 Admin authenticated:', this.dbService.isAuthenticated());

        try {
            console.log('📞 Calling dbService.listBucketFiles for wolf-property-images...');
            const { files, error } = await this.dbService.listBucketFiles('wolf-property-images');

            console.log('📨 Response from listBucketFiles:', { files, error });

            if (error) {
                console.error('❌ Error from listBucketFiles:', error);
                throw new Error(error);
            }

            console.log('📊 Files analysis:', {
                totalFiles: files?.length || 0,
                files: files,
                isArray: Array.isArray(files)
            });

            if (!files || files.length === 0) {
                console.warn('⚠️ No files returned from bucket');
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <p style="font-size: 18px; margin-bottom: 10px;">📂 No images found in this bucket</p>
                        <p style="margin-bottom: 20px;">Upload some images to get started!</p>
                        <button class="btn btn-image-manager" onclick="this.closest('.image-browser-modal').querySelector('#upload-new-images').click()">
                            ➕ Upload Images
                        </button>
                    </div>
                `;
                return;
            }

            // Filter only image files
            console.log('🔍 Filtering image files...');
            const imageFiles = files.filter(file => {
                const fileName = file.fullPath || file.name;
                const ext = fileName.toLowerCase().split('.').pop();
                const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
                console.log(`📁 File: ${fileName}, extension: ${ext}, isImage: ${isImage}`);
                return isImage;
            });

            console.log(`✅ Found ${imageFiles.length} image files out of ${files.length} total files`);

            if (imageFiles.length === 0) {
                console.warn('⚠️ No image files found (wrong file types)');
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <p>📁 ${files.length} files found, but no images</p>
                        <p>Supported formats: JPG, PNG, WEBP, GIF, SVG</p>
                        <details style="margin-top: 15px;">
                            <summary>Files found:</summary>
                            <ul style="text-align: left; margin: 10px auto; max-width: 300px;">
                                ${files.map(f => `<li>${f.fullPath || f.name}</li>`).join('')}
                            </ul>
                        </details>
                    </div>
                `;
                return;
            }

            // Create image grid header
            console.log('🎨 Creating image grid...');
            
            // Generate signed URLs for all images (since bucket is private)
            console.log('🔐 Generating signed URLs for private bucket images...');
            const imageFilesWithUrls = await Promise.all(
                imageFiles.map(async (file) => {
                    const filePath = file.fullPath || file.name;
                    const signedUrl = await this.dbService.getFileUrl('wolf-property-images', filePath, true);
                    return {
                        ...file,
                        signedUrl: signedUrl
                    };
                })
            );

            container.innerHTML = `
                <div class="bucket-summary" style="margin-bottom: 20px; padding: 15px; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #3498db;">
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📊 Bucket Summary</h4>
                    <p style="margin: 5px 0; color: #555;"><strong>Total files:</strong> ${files.length} | <strong>Images:</strong> ${imageFiles.length}</p>
                    <p style="margin: 5px 0; color: #555;"><strong>Bucket:</strong> wolf-property-images (Private)</p>
                    <p style="margin: 5px 0; color: #666; font-size: 12px;">🔐 Using signed URLs for secure access</p>
                </div>
                <div class="image-grid">
                    ${imageFilesWithUrls.map(file => {
                        const filePath = file.fullPath || file.name;
                        const displayName = file.name;
                        const imageUrl = file.signedUrl;
                        const publicUrl = this.dbService.getPublicUrl('wolf-property-images', filePath); // For copying
                        const fileSize = file.metadata?.size ? (file.metadata.size / 1024 / 1024).toFixed(2) : 'Unknown';
                        const uploadDate = file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Unknown';
                        
                        console.log(`🖼️ Processing image: ${filePath}, Display name: ${displayName}, Signed URL: ${imageUrl}`);
                        
                        return `
                            <div class="image-item" data-url="${publicUrl}" data-filename="${displayName}">
                                <div class="image-thumbnail-container" style="position: relative; overflow: hidden; border-radius: 8px 8px 0 0;">
                                    <img src="${imageUrl}" alt="${displayName}" loading="lazy" 
                                         style="cursor: pointer;" 
                                         onclick="this.closest('.image-item').querySelector('.view-full-btn').click()"
                                         onerror="console.error('❌ Failed to load image: ${filePath}', this.src)">
                                    <div class="image-overlay" style="position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.7); color: white; padding: 5px; border-radius: 0 8px 0 8px; font-size: 12px;">
                                        ${fileSize}MB
                                    </div>
                                </div>
                                <div class="image-info">
                                    <p class="image-name" title="${filePath}">${displayName.length > 20 ? displayName.substring(0, 20) + '...' : displayName}</p>
                                    <p class="image-path" style="margin: 3px 0; font-size: 10px; color: #666;">${filePath}</p>
                                    <p class="image-date" style="margin: 5px 0; font-size: 11px; color: #888;">Uploaded: ${uploadDate}</p>
                                    <div class="image-actions" style="display: flex; gap: 5px; flex-wrap: wrap;">
                                        <button class="copy-url-btn" data-url="${publicUrl}" style="flex: 1; min-width: 70px;">📋 Copy URL</button>
                                        <button class="view-full-btn" data-url="${imageUrl}" data-filename="${displayName}" style="flex: 1; min-width: 70px; background: #27ae60;">👁️ View</button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            console.log('✅ Image grid created successfully');

            // Add event listeners for copy URL
            container.querySelectorAll('.copy-url-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = e.target.getAttribute('data-url');
                    console.log('📋 Copying URL to clipboard:', url);
                    navigator.clipboard.writeText(url).then(() => {
                        const originalText = e.target.textContent;
                        e.target.textContent = '✅ Copied!';
                        e.target.style.background = '#27ae60';
                        setTimeout(() => {
                            e.target.textContent = originalText;
                            e.target.style.background = '#3498db';
                        }, 2000);
                    }).catch(() => {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = url;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        e.target.textContent = '✅ Copied!';
                    });
                });
            });

            // Add event listeners for view full image
            container.querySelectorAll('.view-full-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = e.target.getAttribute('data-url');
                    const filename = e.target.getAttribute('data-filename');
                    console.log('👁️ Opening full-size image:', filename);
                    this.showFullSizeImage(url, filename);
                });
            });

        } catch (error) {
            console.error('💥 Failed to load bucket images:', error);
            console.error('💥 Full error object:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    <p style="font-size: 18px; margin-bottom: 10px;">❌ Failed to load images</p>
                    <p style="margin-bottom: 20px;">${error.message}</p>
                    <button class="btn btn-image-manager" onclick="location.reload()">
                        🔄 Reload Page
                    </button>
                    <details style="margin-top: 15px; text-align: left;">
                        <summary>Technical Details</summary>
                        <pre style="background: #f8f8f8; padding: 10px; border-radius: 5px; margin: 10px 0; font-size: 12px; overflow: auto;">${JSON.stringify(error, null, 2)}</pre>
                    </details>
                </div>
            `;
        }
    }

    /**
     * Show full-size image in modal
     */
    showFullSizeImage(imageUrl, filename) {
        const imageModal = document.createElement('div');
        imageModal.className = 'fullsize-image-modal';
        imageModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); display: flex; justify-content: center;
            align-items: center; z-index: 15000; cursor: pointer;
        `;
        
        imageModal.innerHTML = `
            <div style="max-width: 90%; max-height: 90%; text-align: center; position: relative;">
                <img src="${imageUrl}" alt="${filename}" style="max-width: 100%; max-height: 80vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                <div style="margin-top: 15px; color: white; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 5px;">
                    <p style="margin: 0; font-size: 16px; font-weight: bold;">${filename}</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Click anywhere to close</p>
                </div>
                <button style="position: absolute; top: -10px; right: -10px; background: #e74c3c; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 18px;" onclick="this.closest('.fullsize-image-modal').remove()">×</button>
            </div>
        `;
        
        imageModal.addEventListener('click', () => imageModal.remove());
        document.body.appendChild(imageModal);
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