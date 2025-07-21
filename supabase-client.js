import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import { SUPABASE_CONFIG, CONTENT_MAPPING } from './supabase-config.js';

// Initialize Supabase client
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Database service class
class DatabaseService {
    constructor() {
        this.supabase = supabase;
        this.currentUser = null;
    }

    // Authentication methods
    async signIn(email, password) {
        try {
            console.log('Attempting to sign in with:', email);
            
            // Use custom admin table for authentication
            const { data, error } = await this.supabase
                .from('admin_users')
                .select('*')
                .eq('email', email)
                .eq('is_active', true)
                .single();

            if (error) {
                console.error('Database error:', error);
                return { user: null, error: 'Database connection failed' };
            }

            // Simple password check (in production, use proper hashing)
            if (data && data.password_hash === password) {
                this.currentUser = data;
                console.log('Authentication successful for:', email);
                
                // Update last login
                try {
                    await this.supabase
                        .from('admin_users')
                        .update({ last_login: new Date().toISOString() })
                        .eq('id', data.id);
                } catch (updateError) {
                    console.warn('Could not update last login:', updateError);
                }

                return { user: data, error: null };
            } else {
                console.log('Invalid credentials for:', email);
                return { user: null, error: 'Invalid credentials' };
            }
        } catch (error) {
            console.error('Sign in error:', error);
            return { user: null, error: error.message };
        }
    }

    async signOut() {
        this.currentUser = null;
        return { error: null };
    }

    // Content management methods
    async getContent(pageName) {
        try {
            const { data, error } = await this.supabase
                .from('website_content')
                .select('*')
                .eq('page_name', pageName)
                .eq('is_active', true)
                .order('element_id');

            if (error) {
                console.error('Get content error:', error);
                return { content: {}, error: error.message };
            }

            // Convert to key-value pairs
            const content = {};
            if (data) {
                data.forEach(item => {
                    content[item.element_id] = item.content_text;
                });
            }

            return { content, error: null };
        } catch (error) {
            console.error('Get content error:', error);
            return { content: {}, error: error.message };
        }
    }

    async getMediaContent(pageName) {
        try {
            const { data, error } = await this.supabase
                .from('media_content')
                .select('*')
                .eq('page_name', pageName)
                .eq('is_active', true);

            if (error) {
                console.error('Get media content error:', error);
                return { media: {}, error: error.message };
            }

            // Convert to key-value pairs
            const media = {};
            if (data) {
                data.forEach(item => {
                    media[item.element_id] = {
                        url: item.file_url,
                        alt: item.alt_text,
                        type: item.file_type
                    };
                });
            }

            return { media, error: null };
        } catch (error) {
            console.error('Get media content error:', error);
            return { media: {}, error: error.message };
        }
    }

    async saveContent(pageName, changes, versionDescription = '') {
        try {
            console.log('Saving content to Supabase:', { pageName, changes, versionDescription });
            
            // First, let's test if we can access the tables
            console.log('Testing table access...');
            
            // Test website_content table access
            const { data: testContent, error: testContentError } = await this.supabase
                .from('website_content')
                .select('count', { count: 'exact', head: true });
                
            if (testContentError) {
                console.error('Cannot access website_content table:', testContentError);
                return { version: null, error: `Cannot access website_content table: ${testContentError.message}` };
            }
            
            // Test version_history table access
            const { data: testVersion, error: testVersionError } = await this.supabase
                .from('version_history')
                .select('count', { count: 'exact', head: true });
                
            if (testVersionError) {
                console.error('Cannot access version_history table:', testVersionError);
                return { version: null, error: `Cannot access version_history table: ${testVersionError.message}` };
            }
            
            console.log('Table access test successful');
            
            // Get current version number
            const { data: versionData, error: versionQueryError } = await this.supabase
                .from('version_history')
                .select('version_number')
                .eq('page_name', pageName)
                .order('version_number', { ascending: false })
                .limit(1);

            if (versionQueryError) {
                console.error('Version query error:', versionQueryError);
                return { version: null, error: 'Could not get version number' };
            }

            const nextVersion = versionData && versionData.length > 0 ? versionData[0].version_number + 1 : 1;
            console.log('Next version number:', nextVersion);

            // Save each change
            const contentPromises = Object.keys(changes).map(async (elementId) => {
                const contentData = {
                    page_name: pageName,
                    element_id: elementId,
                    content_text: changes[elementId],
                    content_type: 'text',
                    version: nextVersion,
                    is_active: true,
                    updated_at: new Date().toISOString()
                };
                console.log('Saving content item:', contentData);
                
                const result = await this.supabase
                    .from('website_content')
                    .upsert(contentData);
                    
                if (result.error) {
                    console.error('Error saving content item:', elementId, result.error);
                } else {
                    console.log('Successfully saved content item:', elementId);
                }
                
                return result;
            });

            const contentResults = await Promise.all(contentPromises);
            
            // Check for content save errors
            for (let i = 0; i < contentResults.length; i++) {
                const result = contentResults[i];
                const elementId = Object.keys(changes)[i];
                if (result.error) {
                    console.error('Content save error for element:', elementId, result.error);
                    return { version: null, error: `Could not save content for ${elementId}: ${result.error.message}` };
                }
            }

            console.log('All content items saved successfully');

            // Save version history
            const versionHistoryData = {
                version_number: nextVersion,
                description: versionDescription || `Version ${nextVersion} - ${new Date().toLocaleString()}`,
                changes: changes,
                page_name: pageName,
                created_by: this.currentUser?.id
            };
            console.log('Saving version history:', versionHistoryData);
            
            const { error: versionError } = await this.supabase
                .from('version_history')
                .insert(versionHistoryData);

            if (versionError) {
                console.error('Version history save error:', versionError);
                return { version: null, error: 'Could not save version history' };
            }

            console.log('Version history saved successfully');
            return { version: nextVersion, error: null };
        } catch (error) {
            console.error('Save content error:', error);
            return { version: null, error: error.message };
        }
    }

    async getVersionHistory(pageName) {
        try {
            const { data, error } = await this.supabase
                .from('version_history')
                .select('*')
                .eq('page_name', pageName)
                .order('version_number', { ascending: false })
                .limit(10);

            if (error) throw error;

            return { versions: data, error: null };
        } catch (error) {
            console.error('Get version history error:', error);
            return { versions: [], error: error.message };
        }
    }

    async restoreVersion(pageName, versionNumber) {
        try {
            console.log(`Restoring version ${versionNumber} for page ${pageName}`);
            
            // Get the version data
            const { data, error } = await this.supabase
                .from('version_history')
                .select('changes')
                .eq('page_name', pageName)
                .eq('version_number', versionNumber)
                .single();

            if (error) {
                console.error('Error getting version data:', error);
                throw error;
            }

            console.log('Version data retrieved:', data);

            // Apply the restored changes to the database
            const changes = data.changes;
            const contentPromises = Object.keys(changes).map(elementId => {
                const contentData = {
                    page_name: pageName,
                    element_id: elementId,
                    content_text: changes[elementId],
                    content_type: 'text',
                    version: versionNumber,
                    is_active: true,
                    updated_at: new Date().toISOString()
                };
                
                console.log('Restoring content item:', contentData);
                
                return this.supabase
                    .from('website_content')
                    .upsert(contentData);
            });

            const contentResults = await Promise.all(contentPromises);
            
            // Check for content restore errors
            for (let i = 0; i < contentResults.length; i++) {
                const result = contentResults[i];
                const elementId = Object.keys(changes)[i];
                if (result.error) {
                    console.error('Content restore error for element:', elementId, result.error);
                    throw new Error(`Could not restore content for ${elementId}: ${result.error.message}`);
                }
            }

            console.log('All content items restored successfully');

            return { success: true, error: null };
        } catch (error) {
            console.error('Restore version error:', error);
            return { success: false, error: error.message };
        }
    }

    async clearVersionHistory(pageName) {
        try {
            const { error } = await this.supabase
                .from('version_history')
                .delete()
                .eq('page_name', pageName);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('Clear version history error:', error);
            return { success: false, error: error.message };
        }
    }

    async uploadMedia(pageName, elementId, file, altText = '') {
        try {
            const fileName = `${pageName}_${elementId}_${Date.now()}_${file.name}`;
            const filePath = `media/${fileName}`;

            // Upload file to Supabase Storage
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('website-media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from('website-media')
                .getPublicUrl(filePath);

            // Save media record
            const { error: mediaError } = await this.supabase
                .from('media_content')
                .upsert({
                    page_name: pageName,
                    element_id: elementId,
                    file_name: fileName,
                    file_url: urlData.publicUrl,
                    file_type: file.type,
                    alt_text: altText,
                    is_active: true,
                    updated_at: new Date().toISOString()
                });

            if (mediaError) throw mediaError;

            return { url: urlData.publicUrl, error: null };
        } catch (error) {
            console.error('Upload media error:', error);
            return { url: null, error: error.message };
        }
    }

    /**
     * Upload file to any specified bucket
     * @param {File} file - The file to upload
     * @param {string} bucketName - The name of the bucket
     * @param {string} subfolder - Optional subfolder within the bucket
     * @param {string} altText - Optional alt text for images
     * @returns {Object} Upload result with URL or error
     */
    async uploadToBucket(file, bucketName, subfolder = '', altText = '') {
        try {
            // Sanitize filename - remove spaces and special characters
            const sanitizedFileName = file.name
                .replace(/\s+/g, '-')           // Replace spaces with hyphens
                .replace(/[^a-zA-Z0-9.-]/g, '') // Remove special characters except dots and hyphens
                .toLowerCase();                 // Convert to lowercase
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${timestamp}-${sanitizedFileName}`;
            const filePath = subfolder ? `${subfolder}/${fileName}` : fileName;

            console.log(`📤 Uploading ${fileName} to ${bucketName}/${filePath}...`);
            console.log(`📁 Original filename: ${file.name}`);
            console.log(`🧹 Sanitized filename: ${sanitizedFileName}`);

            // For admin uploads, we need to use a client with service role permissions
            // Create a temporary client with service role key for this upload
            const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
            const serviceRoleClient = createClient(
                SUPABASE_CONFIG.url, 
                SUPABASE_CONFIG.serviceRoleKey
            );

            // Upload file to specified bucket using service role client
            const { data: uploadData, error: uploadError } = await serviceRoleClient.storage
                .from(bucketName)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw uploadError;
            }

            // Get public URL using regular client
            const { data: urlData } = this.supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            console.log(`✅ Upload successful: ${urlData.publicUrl}`);

            return { 
                url: urlData.publicUrl, 
                fileName: fileName,
                filePath: filePath,
                bucketName: bucketName,
                originalFileName: file.name,
                error: null 
            };
        } catch (error) {
            console.error('Upload to bucket error:', error);
            return { url: null, error: error.message };
        }
    }

    /**
     * List files in a specific bucket (recursively searches all subfolders)
     * @param {string} bucketName - The name of the bucket
     * @param {string} path - Optional path within the bucket
     * @param {number} limit - Maximum number of files to return
     * @returns {Object} List of files or error
     */
    async listBucketFiles(bucketName, path = '', limit = 1000) {
        try {
            console.log(`📁 Listing files in bucket: ${bucketName}, path: "${path}", limit: ${limit}`);
            
            // For admin operations on private buckets, use service role client
            const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
            const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNycHNwemdlbW5meGtxYWxnam16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY4NTc4NywiZXhwIjoyMDY4MjYxNzg3fQ.gs0HWCRjDlp81mvx28DKfRN0MFK2JjJbIf4aBJThl2M';
            const supabaseUrl = this.supabase.supabaseUrl;
            
            const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey);

            console.log(`🔑 Using service role key for bucket access`);

            // Function to recursively list files in all directories
            const getAllFiles = async (currentPath = '') => {
                console.log(`🔍 Scanning path: "${currentPath}"`);
                
                const { data, error } = await serviceRoleClient.storage
                    .from(bucketName)
                    .list(currentPath, {
                        limit: 1000,
                        offset: 0,
                        sortBy: { column: 'created_at', order: 'desc' }
                    });

                if (error) {
                    console.error(`❌ Error listing path "${currentPath}":`, error);
                    throw error;
                }

                console.log(`📋 Found ${data?.length || 0} items in path "${currentPath}"`);

                let allFiles = [];
                
                for (const item of data || []) {
                    if (item.id === null) {
                        // This is a folder, recurse into it
                        console.log(`📁 Found folder: ${item.name}, recursing...`);
                        const subPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                        const subFiles = await getAllFiles(subPath);
                        allFiles = allFiles.concat(subFiles);
                    } else {
                        // This is a file, add full path info
                        const fileWithPath = {
                            ...item,
                            fullPath: currentPath ? `${currentPath}/${item.name}` : item.name
                        };
                        console.log(`📄 Found file: ${fileWithPath.fullPath}`);
                        allFiles.push(fileWithPath);
                    }
                }

                return allFiles;
            };

            // Get all files recursively
            const allFiles = await getAllFiles(path);

            console.log(`✅ Successfully found ${allFiles.length} total files in bucket ${bucketName}`);
            console.log(`📋 All files:`, allFiles.map(f => f.fullPath || f.name));

            return { files: allFiles, error: null };
        } catch (error) {
            console.error('❌ List bucket files error:', error);
            console.error('❌ Error details:', {
                bucketName,
                path,
                limit,
                errorMessage: error.message,
                errorCode: error.statusCode || 'unknown'
            });
            return { files: [], error: error.message };
        }
    }

    /**
     * Delete file from bucket
     * @param {string} bucketName - The name of the bucket
     * @param {string} filePath - The path to the file within the bucket
     * @returns {Object} Success or error result
     */
    async deleteFromBucket(bucketName, filePath) {
        try {
            const { error } = await this.supabase.storage
                .from(bucketName)
                .remove([filePath]);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('Delete from bucket error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get signed URL for a file in a private bucket
     * @param {string} bucketName - The name of the bucket
     * @param {string} filePath - The path to the file within the bucket
     * @param {number} expiresIn - Expiration time in seconds (default 99 years)
     * @returns {Object} Signed URL result
     */
    async getSignedUrl(bucketName, filePath, expiresIn = 3124224000) {
        try {
            console.log(`🔐 Creating signed URL for: ${bucketName}/${filePath} (expires in ${expiresIn} seconds = ${Math.round(expiresIn / (365 * 24 * 60 * 60))} years)`);
            
            // Use service role client for private bucket access
            const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
            const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNycHNwemdlbW5meGtxYWxnam16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY4NTc4NywiZXhwIjoyMDY4MjYxNzg3fQ.gs0HWCRjDlp81mvx28DKfRN0MFK2JjJbIf4aBJThl2M';
            const supabaseUrl = this.supabase.supabaseUrl;
            
            const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey);

            const { data, error } = await serviceRoleClient.storage
                .from(bucketName)
                .createSignedUrl(filePath, expiresIn);

            if (error) {
                console.error(`❌ Error creating signed URL for ${filePath}:`, error);
                throw error;
            }

            console.log(`✅ Created long-term signed URL for ${filePath}: ${data.signedUrl}`);
            return { signedUrl: data.signedUrl, error: null };
            
        } catch (error) {
            console.error('❌ Get signed URL error:', error);
            return { signedUrl: null, error: error.message };
        }
    }

    /**
     * Get public URL for a file in any bucket
     * @param {string} bucketName - The name of the bucket
     * @param {string} filePath - The path to the file within the bucket
     * @returns {string} Public URL
     */
    getPublicUrl(bucketName, filePath) {
        const { data } = this.supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);
        
        return data.publicUrl;
    }

    /**
     * Get appropriate URL for file (signed for private buckets, public for public buckets)
     * @param {string} bucketName - The name of the bucket
     * @param {string} filePath - The path to the file within the bucket
     * @param {boolean} isPrivate - Whether the bucket is private (default true for wolf-property-images)
     * @returns {Promise<string>} URL for the file
     */
    async getFileUrl(bucketName, filePath, isPrivate = true) {
        if (isPrivate) {
            const result = await this.getSignedUrl(bucketName, filePath);
            return result.signedUrl || this.getPublicUrl(bucketName, filePath);
        } else {
            return this.getPublicUrl(bucketName, filePath);
        }
    }

    async getMedia(pageName) {
        try {
            const { data, error } = await this.supabase
                .from('media_content')
                .select('*')
                .eq('page_name', pageName)
                .eq('is_active', true);

            if (error) throw error;

            return { media: data, error: null };
        } catch (error) {
            console.error('Get media error:', error);
            return { media: [], error: error.message };
        }
    }

    // Team Members methods
    async getTeamMembers(pageName = 'about.html') {
        try {
            console.log(`📋 Getting team members for page: ${pageName}`);
            
            const { data, error } = await this.supabase
                .from('team_members')
                .select('*')
                .eq('page_name', pageName)
                .eq('is_active', true)
                .order('sort_order');

            if (error) {
                console.error('Get team members error:', error);
                return { teamMembers: [], error: error.message };
            }

            console.log(`✅ Found ${data?.length || 0} team members`);
            return { teamMembers: data || [], error: null };
        } catch (error) {
            console.error('Get team members error:', error);
            return { teamMembers: [], error: error.message };
        }
    }

    async saveTeamMember(teamMemberData) {
        try {
            console.log('💾 Saving team member:', teamMemberData.name);
            console.log('📋 Full team member data:', teamMemberData);
            
            // Filter out UI-only properties that shouldn't be saved to database
            const { isNew, isPending, hasChanges, ...dbData } = teamMemberData;
            
            // Check if this is a new member with temporary ID
            const isNewMember = !teamMemberData.id || teamMemberData.id.startsWith('temp_');
            
            // For new members, exclude the temporary ID so database can auto-generate proper UUID
            if (isNewMember) {
                delete dbData.id;
            }
            
            // Debug: Log all field lengths
            console.log('📊 Field lengths being saved:');
            Object.keys(dbData).forEach(key => {
                const value = dbData[key];
                if (typeof value === 'string') {
                    const preview = value.length > 50 ? value.substring(0, 50) + '...' : value;
                    console.log(`  ${key}: ${value.length} chars - "${preview}"`);
                } else {
                    console.log(`  ${key}: ${typeof value} - ${value}`);
                }
            });
            
            // Validate field lengths to prevent VARCHAR overflow
            const validationErrors = [];
            if (dbData.name && dbData.name.length > 500) {
                validationErrors.push(`Name too long (${dbData.name.length} chars, max 500)`);
            }
            if (dbData.position && dbData.position.length > 500) {
                validationErrors.push(`Position too long (${dbData.position.length} chars, max 500)`);
            }
            if (dbData.image_filename && dbData.image_filename.length > 500) {
                validationErrors.push(`Image filename too long (${dbData.image_filename.length} chars, max 500)`);
            }
            if (dbData.page_name && dbData.page_name.length > 200) {
                validationErrors.push(`Page name too long (${dbData.page_name.length} chars, max 200)`);
            }
            
            if (validationErrors.length > 0) {
                console.error('❌ Validation errors:', validationErrors);
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }
            
            const memberData = {
                ...dbData,
                updated_at: new Date().toISOString()
            };
            
            console.log('📤 Data being sent to database:', memberData);

            let result;
            if (!isNewMember) {
                // Update existing member
                const { data, error } = await this.supabase
                    .from('team_members')
                    .update(memberData)
                    .eq('id', teamMemberData.id)
                    .select()
                    .single();
                
                result = { data, error };
            } else {
                // Insert new member
                const { data, error } = await this.supabase
                    .from('team_members')
                    .insert(memberData)
                    .select()
                    .single();
                
                result = { data, error };
            }

            if (result.error) {
                console.error('Save team member error:', result.error);
                return { teamMember: null, error: result.error.message };
            }

            console.log('✅ Team member saved successfully');
            return { teamMember: result.data, error: null };
        } catch (error) {
            console.error('Save team member error:', error);
            return { teamMember: null, error: error.message };
        }
    }

    async deleteTeamMember(memberId) {
        try {
            console.log(`🗑️ Deleting team member: ${memberId}`);
            
            const { error } = await this.supabase
                .from('team_members')
                .update({ is_active: false })
                .eq('id', memberId);

            if (error) {
                console.error('Delete team member error:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ Team member deleted successfully');
            return { success: true, error: null };
        } catch (error) {
            console.error('Delete team member error:', error);
            return { success: false, error: error.message };
        }
    }

    async initializeTeamMembersTable() {
        try {
            console.log('🔧 Initializing team_members table...');
            
            // First check if table exists
            const { data: existingMembers, error: checkError } = await this.supabase
                .from('team_members')
                .select('count')
                .limit(1);

            if (checkError) {
                console.log('📋 Team members table does not exist, creating...');
                // Table doesn't exist, we need to create it using direct SQL
                const createTableSQL = `
                    -- Create team_members table
                    CREATE TABLE IF NOT EXISTS team_members (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        position VARCHAR(255) NOT NULL,
                        bio TEXT,
                        bio_paragraph_2 TEXT,
                        image_url TEXT,
                        image_filename VARCHAR(255),
                        linkedin_url TEXT,
                        email TEXT,
                        sort_order INTEGER DEFAULT 0,
                        is_active BOOLEAN DEFAULT true,
                        page_name VARCHAR(100) DEFAULT 'about.html',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    -- Create indexes
                    CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active);
                    CREATE INDEX IF NOT EXISTS idx_team_members_page ON team_members(page_name);
                    CREATE INDEX IF NOT EXISTS idx_team_members_sort ON team_members(sort_order);

                    -- Disable RLS for now
                    ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
                `;

                console.log('⚠️ Please run the following SQL in your Supabase SQL Editor:');
                console.log(createTableSQL);
                
                return { 
                    success: false, 
                    error: 'team_members table needs to be created. Please run the SQL script in Supabase SQL Editor.',
                    sql: createTableSQL
                };
            }

            console.log('✅ Team members table exists');
            
            // Check if we have existing members
            const { data: members } = await this.supabase
                .from('team_members')
                .select('*')
                .eq('page_name', 'about.html')
                .eq('is_active', true);

            if (!members || members.length === 0) {
                console.log('📝 No team members found, inserting default members...');
                
                // Insert default team members
                const defaultMembers = [
                    {
                        name: 'Adam Starr',
                        position: 'Owner, Real Estate Broker & Certified Public Accountant',
                        bio: 'A Georgetown native and Texas A&M University graduate, Adam brings a unique combination of real estate expertise and financial acumen to Wolf Property Management. His background as a CPA and real estate broker provides our clients with comprehensive property management solutions.',
                        bio_paragraph_2: 'Beyond his professional achievements, Adam is an active member of the Georgetown community, fluent in Spanish, and enjoys various sports including ice hockey and skiing.',
                        image_url: 'https://srpspzgemnfxkqalgjmz.supabase.co/storage/v1/object/public/wolf-property-images/images/people/adam_starr.png',
                        image_filename: 'adam_starr.png',
                        linkedin_url: '#',
                        email: '#',
                        sort_order: 1,
                        is_active: true,
                        page_name: 'about.html'
                    },
                    {
                        name: 'Patricia Holmes',
                        position: 'Office Manager',
                        bio: 'With over a decade of experience in Georgetown\'s real estate market, Patricia brings a wealth of knowledge in property management, mortgage lending, and insurance. Her diverse background enables her to provide comprehensive support to both property owners and tenants.',
                        bio_paragraph_2: 'Patricia\'s dedication to excellence and her passion for community engagement make her an invaluable member of our team.',
                        image_url: 'https://srpspzgemnfxkqalgjmz.supabase.co/storage/v1/object/public/wolf-property-images/images/people/patricia_holmes.jpg',
                        image_filename: 'patricia_holmes.jpg',
                        linkedin_url: '#',
                        email: '#',
                        sort_order: 2,
                        is_active: true,
                        page_name: 'about.html'
                    }
                ];

                const { error: insertError } = await this.supabase
                    .from('team_members')
                    .insert(defaultMembers);

                if (insertError) {
                    console.error('Error inserting default team members:', insertError);
                    return { success: false, error: insertError.message };
                }

                console.log('✅ Default team members inserted');
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Initialize team members table error:', error);
            return { success: false, error: error.message };
        }
    }

    // Rental Listings methods
    async getRentalListings() {
        try {
            console.log('🏠 Getting rental listings...');
            
            const { data, error } = await this.supabase
                .from('rental_listings')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');

            if (error) {
                console.error('Get rental listings error:', error);
                return { rentalListings: [], error: error.message };
            }

            console.log(`✅ Found ${data?.length || 0} rental listings`);
            return { rentalListings: data || [], error: null };
        } catch (error) {
            console.error('Get rental listings error:', error);
            return { rentalListings: [], error: error.message };
        }
    }

    async saveRentalListing(rentalListingData) {
        try {
            console.log('💾 Saving rental listing:', rentalListingData.title);
            console.log('📋 Full rental listing data:', rentalListingData);
            
            // Filter out UI-only properties that shouldn't be saved to database
            const { isNew, isPending, hasChanges, ...dbData } = rentalListingData;
            
            // Check if this is a new listing with temporary ID
            const isNewListing = !rentalListingData.id || rentalListingData.id.startsWith('temp_');
            
            // For new listings, exclude the temporary ID so database can auto-generate proper UUID
            if (isNewListing) {
                delete dbData.id;
            }
            
            // Debug: Log all field values
            console.log('📊 Rental listing fields being saved:');
            Object.keys(dbData).forEach(key => {
                const value = dbData[key];
                console.log(`  ${key}: ${typeof value} - ${value}`);
            });
            
            const listingData = {
                ...dbData,
                updated_at: new Date().toISOString()
            };
            
            console.log('📤 Data being sent to database:', listingData);

            let result;
            if (!isNewListing) {
                // Update existing listing
                const { data, error } = await this.supabase
                    .from('rental_listings')
                    .update(listingData)
                    .eq('id', rentalListingData.id)
                    .select()
                    .single();
                
                result = { data, error };
            } else {
                // Insert new listing
                const { data, error } = await this.supabase
                    .from('rental_listings')
                    .insert(listingData)
                    .select()
                    .single();
                
                result = { data, error };
            }

            if (result.error) {
                console.error('Save rental listing error:', result.error);
                return { rentalListing: null, error: result.error.message };
            }

            console.log('✅ Rental listing saved successfully');
            return { rentalListing: result.data, error: null };
        } catch (error) {
            console.error('Save rental listing error:', error);
            return { rentalListing: null, error: error.message };
        }
    }

    async deleteRentalListing(listingId) {
        try {
            console.log(`🗑️ Deleting rental listing: ${listingId}`);
            
            const { error } = await this.supabase
                .from('rental_listings')
                .update({ is_active: false })
                .eq('id', listingId);

            if (error) {
                console.error('Delete rental listing error:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ Rental listing deleted successfully');
            return { success: true, error: null };
        } catch (error) {
            console.error('Delete rental listing error:', error);
            return { success: false, error: error.message };
        }
    }

    async initializeRentalListingsTable() {
        try {
            console.log('🔧 Initializing rental_listings table...');
            
            // First check if table exists
            const { data: existingListings, error: checkError } = await this.supabase
                .from('rental_listings')
                .select('count')
                .limit(1);

            if (checkError) {
                console.log('📋 Rental listings table does not exist, creating...');
                // Table doesn't exist, we need to create it using direct SQL
                const createTableSQL = `
                    -- Create rental_listings table
                    CREATE TABLE IF NOT EXISTS rental_listings (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        title VARCHAR(500) NOT NULL,
                        address VARCHAR(500) NOT NULL,
                        city VARCHAR(200) DEFAULT 'Georgetown',
                        state VARCHAR(50) DEFAULT 'TX',
                        zip_code VARCHAR(20),
                        rent_price DECIMAL(10, 2) NOT NULL,
                        square_feet INTEGER,
                        bedrooms INTEGER,
                        bathrooms DECIMAL(3, 1),
                        property_type VARCHAR(100) DEFAULT 'House',
                        description TEXT,
                        features TEXT,
                        appliances TEXT,
                        pet_policy TEXT,
                        available_date DATE,
                        lease_term VARCHAR(100),
                        deposit_amount DECIMAL(10, 2),
                        utilities_included TEXT,
                        parking_info TEXT,
                        primary_image_url TEXT,
                        primary_image_filename VARCHAR(500),
                        additional_images JSONB,
                        virtual_tour_url TEXT,
                        contact_info JSONB,
                        neighborhood VARCHAR(200),
                        amenities TEXT,
                        restrictions TEXT,
                        sort_order INTEGER DEFAULT 0,
                        is_active BOOLEAN DEFAULT true,
                        is_featured BOOLEAN DEFAULT false,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    -- Create indexes
                    CREATE INDEX IF NOT EXISTS idx_rental_listings_active ON rental_listings(is_active);
                    CREATE INDEX IF NOT EXISTS idx_rental_listings_featured ON rental_listings(is_featured);
                    CREATE INDEX IF NOT EXISTS idx_rental_listings_price ON rental_listings(rent_price);
                    CREATE INDEX IF NOT EXISTS idx_rental_listings_bedrooms ON rental_listings(bedrooms);
                    CREATE INDEX IF NOT EXISTS idx_rental_listings_city ON rental_listings(city);
                    CREATE INDEX IF NOT EXISTS idx_rental_listings_sort ON rental_listings(sort_order);
                    CREATE INDEX IF NOT EXISTS idx_rental_listings_available ON rental_listings(available_date);

                    -- Disable RLS for initial setup
                    ALTER TABLE rental_listings DISABLE ROW LEVEL SECURITY;
                `;

                console.log('⚠️ Please run the following SQL in your Supabase SQL Editor:');
                console.log(createTableSQL);
                
                return { 
                    success: false, 
                    error: 'rental_listings table needs to be created. Please run the SQL script in Supabase SQL Editor.',
                    sql: createTableSQL
                };
            }

            console.log('✅ Rental listings table exists');
            
            // Check if we have existing listings
            const { data: listings } = await this.supabase
                .from('rental_listings')
                .select('*')
                .eq('is_active', true);

            if (!listings || listings.length === 0) {
                console.log('📝 No rental listings found, you can add some via admin panel...');
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Initialize rental listings table error:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility methods
    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getPageContentMapping(pageName) {
        return CONTENT_MAPPING[pageName] || {};
    }
}

// Create and export database service instance
const dbService = new DatabaseService();
export default dbService; 