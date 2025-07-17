-- Wolf Property Management Database Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create tables (if they don't exist)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

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

CREATE TABLE IF NOT EXISTS version_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number INTEGER NOT NULL,
    description TEXT,
    changes JSONB NOT NULL,
    page_name VARCHAR(100) NOT NULL,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- 2. Disable RLS temporarily for testing
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE website_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE version_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE media_content DISABLE ROW LEVEL SECURITY;

-- 3. Insert default admin user
INSERT INTO admin_users (email, password_hash, is_active) 
VALUES ('admin@wolfpm.com', 'admin123', true)
ON CONFLICT (email) DO NOTHING;

-- 4. Insert some sample website content for index.html
INSERT INTO website_content (page_name, element_id, content_text, content_type, version, is_active) VALUES
('index.html', 'hero-title', 'Stop Looking and Start Living!', 'text', 1, true),
('index.html', 'hero-subtitle', 'GEORGETOWN''S PREMIER PROPERTY MANAGEMENT', 'text', 1, true),
('index.html', 'hero-description', 'Locally owned and operated with multiple generations of real estate expertise', 'text', 1, true),
('index.html', 'find-your-edge-title', 'Find Your Edge', 'text', 1, true),
('index.html', 'find-your-edge-content', 'Wolf Property Management is a full-service, boutique-style property management company providing clients a broad spectrum of residential real estate services, including Property Management, Sales, and Leasing. We are passionate about Georgetown and practicing real estate in this amazing city.', 'text', 1, true),
('index.html', 'neighborhood-title', 'GEORGETOWN NEIGHBORHOOD SPOTLIGHTS', 'text', 1, true),
('index.html', 'downtown-title', 'Downtown', 'text', 1, true),
('index.html', 'downtown-subtitle', 'THE HEART OF GEORGETOWN', 'text', 1, true),
('index.html', 'south-title', 'South Georgetown', 'text', 1, true),
('index.html', 'south-subtitle', 'NOT YOUR TYPICAL SUBURB', 'text', 1, true),
('index.html', 'west-title', 'West Georgetown', 'text', 1, true),
('index.html', 'west-subtitle', 'A LUXURIOUS LANDSCAPE', 'text', 1, true),
('index.html', 'services-title', 'What are you looking for?', 'text', 1, true),
('index.html', 'residential-title', 'Residential Management', 'text', 1, true),
('index.html', 'residential-description', 'Expert care for your home with comprehensive property management services.', 'text', 1, true),
('index.html', 'commercial-title', 'Commercial Properties', 'text', 1, true),
('index.html', 'commercial-description', 'Maximizing your investment with professional commercial property management.', 'text', 1, true),
('index.html', 'hoa-title', 'HOA Management', 'text', 1, true),
('index.html', 'hoa-description', 'Community-focused solutions for homeowners associations.', 'text', 1, true),
('index.html', 'categories-title', 'Our Management Services', 'text', 1, true),
('index.html', 'residential-category-title', 'Residential', 'text', 1, true),
('index.html', 'commercial-category-title', 'Commercial', 'text', 1, true),
('index.html', 'associations-category-title', 'Associations', 'text', 1, true),
('index.html', 'footer-company', 'Wolf Property Management', 'text', 1, true),
('index.html', 'footer-phone', '512-868-2093', 'text', 1, true),
('index.html', 'footer-email', 'info@wolfpm.com', 'text', 1, true),
('index.html', 'footer-copyright', '© 2024 Wolf Property Management. All rights reserved.', 'text', 1, true)
ON CONFLICT (page_name, element_id, version) DO NOTHING;

-- 5. Insert sample media content
INSERT INTO media_content (page_name, element_id, file_name, file_url, file_type, alt_text, is_active) VALUES
('index.html', 'wolf-logo', 'wolf-logo.png', 'https://srpspzgemnfxkqalgjmz.supabase.co/storage/v1/object/public/wolf-property-images/images/wolf-logo.png', 'image/png', 'Wolf Property Management Logo', true),
('index.html', 'hero-background', 'hero-bg.jpg', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80', 'image/jpeg', 'Hero background image', true)
ON CONFLICT (page_name, element_id) DO NOTHING;

-- 6. Create initial version history
INSERT INTO version_history (version_number, description, changes, page_name) VALUES
(1, 'Initial version - Website setup', '{}', 'index.html')
ON CONFLICT DO NOTHING;

-- 7. Verify setup
SELECT 'Database setup complete!' as status;

-- Check admin users
SELECT 'Admin users:' as info, email, is_active FROM admin_users;

-- Check content count
SELECT 'Content items:' as info, COUNT(*) as count FROM website_content;

-- Check version history
SELECT 'Version history:' as info, COUNT(*) as count FROM version_history; 