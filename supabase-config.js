// Supabase Configuration
const SUPABASE_CONFIG = {
    // Your actual Supabase URL and keys
    url: 'https://srpspzgemnfxkqalgjmz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNycHNwemdlbW5meGtxYWxnam16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODU3ODcsImV4cCI6MjA2ODI2MTc4N30.C6HQUJNn3wY41dPwMOh3-A8NnC4HkibNWgAweJZl0Ok',
    serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNycHNwemdlbW5meGtxYWxnam16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY4NTc4NywiZXhwIjoyMDY4MjYxNzg3fQ.gs0HWCRjDlp81mvx28DKfRN0MFK2JjJbIf4aBJThl2M'
    
    // Note: Database connection URLs removed for security
    // The Supabase client handles all database connections automatically
    // No direct PostgreSQL connection needed for frontend operations
};

// Database table schemas
const DATABASE_SCHEMAS = {
    // Admin users table
    adminUsers: `
        CREATE TABLE IF NOT EXISTS admin_users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_login TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT true
        );
    `,
    
    // Website content table
    websiteContent: `
        CREATE TABLE IF NOT EXISTS website_content (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            page_name VARCHAR(100) NOT NULL,
            element_id VARCHAR(255) NOT NULL,
            content_text TEXT NOT NULL,
            content_type VARCHAR(50) DEFAULT 'text',
            version INTEGER DEFAULT 1,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(page_name, element_id, version)
        );
    `,
    
    // Version history table
    versionHistory: `
        CREATE TABLE IF NOT EXISTS version_history (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            version_number INTEGER NOT NULL,
            description TEXT,
            changes JSONB NOT NULL,
            page_name VARCHAR(100) NOT NULL,
            created_by UUID REFERENCES admin_users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `,
    
    // Images and media table
    mediaContent: `
        CREATE TABLE IF NOT EXISTS media_content (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            page_name VARCHAR(100) NOT NULL,
            element_id VARCHAR(255) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_url TEXT NOT NULL,
            file_type VARCHAR(50) NOT NULL,
            alt_text TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `
};

// Row Level Security (RLS) policies
const RLS_POLICIES = {
    adminUsers: `
        -- Enable RLS
        ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
        
        -- Only admins can read admin users
        CREATE POLICY "Admin users can read admin_users" ON admin_users
            FOR SELECT USING (auth.role() = 'authenticated');
            
        -- Only admins can insert admin users
        CREATE POLICY "Admin users can insert admin_users" ON admin_users
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    `,
    
    websiteContent: `
        -- Enable RLS
        ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;
        
        -- Anyone can read active content
        CREATE POLICY "Anyone can read active website content" ON website_content
            FOR SELECT USING (is_active = true);
            
        -- Only admins can modify content
        CREATE POLICY "Admins can modify website content" ON website_content
            FOR ALL USING (auth.role() = 'authenticated');
    `,
    
    versionHistory: `
        -- Enable RLS
        ALTER TABLE version_history ENABLE ROW LEVEL SECURITY;
        
        -- Only admins can access version history
        CREATE POLICY "Admins can access version history" ON version_history
            FOR ALL USING (auth.role() = 'authenticated');
    `,
    
    mediaContent: `
        -- Enable RLS
        ALTER TABLE media_content ENABLE ROW LEVEL SECURITY;
        
        -- Anyone can read active media
        CREATE POLICY "Anyone can read active media content" ON media_content
            FOR SELECT USING (is_active = true);
            
        -- Only admins can modify media
        CREATE POLICY "Admins can modify media content" ON media_content
            FOR ALL USING (auth.role() = 'authenticated');
    `
};

// Default admin user (you should change this password)
const DEFAULT_ADMIN = {
    email: 'admin@wolfpm.com',
    password: 'admin123', // This will be hashed before storage
    isActive: true
};

// Content mapping for the website
const CONTENT_MAPPING = {
    'index.html': {
        // Hero Section
        'hero-title': { selector: '.hero h1', type: 'text' },
        'hero-subtitle': { selector: '.hero h2', type: 'text' },
        'hero-description': { selector: '.hero p', type: 'text' },
        
        // Find Your Edge Section
        'find-your-edge-title': { selector: '.find-your-edge h2', type: 'text' },
        'find-your-edge-content': { selector: '.find-your-edge p', type: 'text' },
        
        // Neighborhood Spotlights
        'neighborhood-title': { selector: '.neighborhood-spotlights h2', type: 'text' },
        'downtown-title': { selector: '.spotlight:nth-child(1) h3', type: 'text' },
        'downtown-subtitle': { selector: '.spotlight:nth-child(1) h4', type: 'text' },
        'south-title': { selector: '.spotlight:nth-child(2) h3', type: 'text' },
        'south-subtitle': { selector: '.spotlight:nth-child(2) h4', type: 'text' },
        'west-title': { selector: '.spotlight:nth-child(3) h3', type: 'text' },
        'west-subtitle': { selector: '.spotlight:nth-child(3) h4', type: 'text' },
        
        // Services Section
        'services-title': { selector: '.services h2', type: 'text' },
        'residential-title': { selector: '.service-card:nth-child(1) h3', type: 'text' },
        'residential-description': { selector: '.service-card:nth-child(1) p', type: 'text' },
        'commercial-title': { selector: '.service-card:nth-child(2) h3', type: 'text' },
        'commercial-description': { selector: '.service-card:nth-child(2) p', type: 'text' },
        'hoa-title': { selector: '.service-card:nth-child(3) h3', type: 'text' },
        'hoa-description': { selector: '.service-card:nth-child(3) p', type: 'text' },
        
        // Service Categories
        'categories-title': { selector: '.service-categories h2', type: 'text' },
        'residential-category-title': { selector: '.category-card:nth-child(1) h3', type: 'text' },
        'residential-feature-1': { selector: '.category-card:nth-child(1) .category-features li:nth-child(1)', type: 'text' },
        'residential-feature-2': { selector: '.category-card:nth-child(1) .category-features li:nth-child(2)', type: 'text' },
        'residential-feature-3': { selector: '.category-card:nth-child(1) .category-features li:nth-child(3)', type: 'text' },
        'residential-feature-4': { selector: '.category-card:nth-child(1) .category-features li:nth-child(4)', type: 'text' },
        'residential-feature-5': { selector: '.category-card:nth-child(1) .category-features li:nth-child(5)', type: 'text' },
        'residential-feature-6': { selector: '.category-card:nth-child(1) .category-features li:nth-child(6)', type: 'text' },
        
        'commercial-category-title': { selector: '.category-card:nth-child(2) h3', type: 'text' },
        'commercial-feature-1': { selector: '.category-card:nth-child(2) .category-features li:nth-child(1)', type: 'text' },
        'commercial-feature-2': { selector: '.category-card:nth-child(2) .category-features li:nth-child(2)', type: 'text' },
        'commercial-feature-3': { selector: '.category-card:nth-child(2) .category-features li:nth-child(3)', type: 'text' },
        'commercial-feature-4': { selector: '.category-card:nth-child(2) .category-features li:nth-child(4)', type: 'text' },
        'commercial-feature-5': { selector: '.category-card:nth-child(2) .category-features li:nth-child(5)', type: 'text' },
        'commercial-feature-6': { selector: '.category-card:nth-child(2) .category-features li:nth-child(6)', type: 'text' },
        
        'associations-category-title': { selector: '.category-card:nth-child(3) h3', type: 'text' },
        'associations-feature-1': { selector: '.category-card:nth-child(3) .category-features li:nth-child(1)', type: 'text' },
        'associations-feature-2': { selector: '.category-card:nth-child(3) .category-features li:nth-child(2)', type: 'text' },
        'associations-feature-3': { selector: '.category-card:nth-child(3) .category-features li:nth-child(3)', type: 'text' },
        'associations-feature-4': { selector: '.category-card:nth-child(3) .category-features li:nth-child(4)', type: 'text' },
        'associations-feature-5': { selector: '.category-card:nth-child(3) .category-features li:nth-child(5)', type: 'text' },
        'associations-feature-6': { selector: '.category-card:nth-child(3) .category-features li:nth-child(6)', type: 'text' },
        
        // Footer
        'footer-company': { selector: '.footer-info h3', type: 'text' },
        'footer-phone': { selector: '.footer-info p:nth-child(2)', type: 'text' },
        'footer-email': { selector: '.footer-info p:nth-child(3)', type: 'text' },
        'footer-copyright': { selector: '.copyright', type: 'text' }
    },
    'about.html': {
        // Hero Section
        'about-hero-title': { selector: '.about-hero h1', type: 'text' },
        'about-hero-subtitle': { selector: '.about-hero .hero-subtitle', type: 'text' },
        
        // Company Story
        'about-company-title': { selector: '.about-company h2', type: 'text' },
        'about-company-content': { selector: '.about-content p', type: 'text' },
        
        // Team Section
        'team-title': { selector: '.team-members h2', type: 'text' },
        'adam-name': { selector: '.team-member:nth-child(1) h3', type: 'text' },
        'adam-position': { selector: '.team-member:nth-child(1) .position', type: 'text' },
        'adam-bio': { selector: '.team-member:nth-child(1) .team-member-bio p', type: 'text' },
        'patricia-name': { selector: '.team-member:nth-child(2) h3', type: 'text' },
        'patricia-position': { selector: '.team-member:nth-child(2) .position', type: 'text' },
        'patricia-bio': { selector: '.team-member:nth-child(2) .team-member-bio p', type: 'text' },
        
        // Statistics
        'stats-properties': { selector: '.stats-section .stat-item:nth-child(1) h3', type: 'text' },
        'stats-properties-label': { selector: '.stats-section .stat-item:nth-child(1) p', type: 'text' },
        'stats-satisfaction': { selector: '.stats-section .stat-item:nth-child(2) h3', type: 'text' },
        'stats-satisfaction-label': { selector: '.stats-section .stat-item:nth-child(2) p', type: 'text' },
        'stats-experience': { selector: '.stats-section .stat-item:nth-child(3) h3', type: 'text' },
        'stats-experience-label': { selector: '.stats-section .stat-item:nth-child(3) p', type: 'text' },
        
        // Call to Action
        'cta-title': { selector: '.cta-section h2', type: 'text' },
        'cta-description': { selector: '.cta-section p', type: 'text' },
        
        // Footer
        'footer-company': { selector: '.footer-info h3', type: 'text' },
        'footer-phone': { selector: '.footer-info p:nth-child(2)', type: 'text' },
        'footer-email': { selector: '.footer-info p:nth-child(3)', type: 'text' },
        'footer-copyright': { selector: '.copyright', type: 'text' }
    }
};

export { SUPABASE_CONFIG, DATABASE_SCHEMAS, RLS_POLICIES, DEFAULT_ADMIN, CONTENT_MAPPING }; 