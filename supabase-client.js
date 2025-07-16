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