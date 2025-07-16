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

    async saveContent(pageName, changes, versionDescription = '') {
        try {
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

            // Save each change
            const contentPromises = Object.keys(changes).map(elementId => {
                return this.supabase
                    .from('website_content')
                    .upsert({
                        page_name: pageName,
                        element_id: elementId,
                        content_text: changes[elementId],
                        content_type: 'text',
                        version: nextVersion,
                        is_active: true,
                        updated_at: new Date().toISOString()
                    });
            });

            const contentResults = await Promise.all(contentPromises);
            
            // Check for content save errors
            for (const result of contentResults) {
                if (result.error) {
                    console.error('Content save error:', result.error);
                    return { version: null, error: 'Could not save content' };
                }
            }

            // Save version history
            const { error: versionError } = await this.supabase
                .from('version_history')
                .insert({
                    version_number: nextVersion,
                    description: versionDescription || `Version ${nextVersion} - ${new Date().toLocaleString()}`,
                    changes: changes,
                    page_name: pageName,
                    created_by: this.currentUser?.id
                });

            if (versionError) {
                console.error('Version history save error:', versionError);
                return { version: null, error: 'Could not save version history' };
            }

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
            const { data, error } = await this.supabase
                .from('version_history')
                .select('changes')
                .eq('page_name', pageName)
                .eq('version_number', versionNumber)
                .single();

            if (error) throw error;

            // Apply the restored changes
            const changes = data.changes;
            const contentPromises = Object.keys(changes).map(elementId => {
                return this.supabase
                    .from('website_content')
                    .upsert({
                        page_name: pageName,
                        element_id: elementId,
                        content_text: changes[elementId],
                        content_type: 'text',
                        version: versionNumber,
                        is_active: true,
                        updated_at: new Date().toISOString()
                    });
            });

            await Promise.all(contentPromises);

            return { success: true, error: null };
        } catch (error) {
            console.error('Restore version error:', error);
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