-- Simple Database Setup for Wolf Property Management
-- Run this script in your Supabase SQL Editor

-- Step 1: Create Tables

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Website content table
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

-- Version history table
CREATE TABLE IF NOT EXISTS version_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number INTEGER NOT NULL,
    description TEXT,
    changes JSONB NOT NULL,
    page_name VARCHAR(100) NOT NULL,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media content table
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

-- Step 2: Create Indexes for Better Performance

CREATE INDEX IF NOT EXISTS idx_website_content_page_element ON website_content(page_name, element_id);
CREATE INDEX IF NOT EXISTS idx_website_content_active ON website_content(is_active);
CREATE INDEX IF NOT EXISTS idx_version_history_page ON version_history(page_name);
CREATE INDEX IF NOT EXISTS idx_version_history_number ON version_history(version_number);
CREATE INDEX IF NOT EXISTS idx_media_content_page ON media_content(page_name);
CREATE INDEX IF NOT EXISTS idx_media_content_active ON media_content(is_active);

-- Step 3: Temporarily disable RLS for initial setup
-- (We'll enable it later with proper policies)

ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE website_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE version_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE media_content DISABLE ROW LEVEL SECURITY;

-- Step 4: Insert Default Admin User
-- Note: In production, you should hash the password properly

INSERT INTO admin_users (email, password_hash, is_active) 
VALUES ('admin@wolfpm.com', 'admin123', true)
ON CONFLICT (email) DO NOTHING;

-- Step 5: Insert Initial Website Content

-- Index page content
INSERT INTO website_content (page_name, element_id, content_text, content_type, version, is_active) VALUES
('index.html', 'hero-title', 'Stop Looking and Start Living!', 'text', 1, true),
('index.html', 'hero-subtitle', 'GEORGETOWN''S PREMIER PROPERTY MANAGEMENT', 'text', 1, true),
('index.html', 'hero-description', 'Locally owned and operated with multiple generations of real estate expertise', 'text', 1, true),
('index.html', 'find-your-edge-title', 'Find Your Edge', 'text', 1, true),
('index.html', 'find-your-edge-content', 'Wolf Property Management is a full-service, boutique-style property management company providing clients a broad spectrum of residential real estate services, including Property Management, Sales, and Leasing. We are passionate about Georgetown and practicing real estate in this amazing city. Our boutique-style office cultivates a collaborative environment for our team. Shunning the traditional model, our team shares their knowledge and expertise of the Georgetown market, ensuring our clients superior representation and a true competitive edge.', 'text', 1, true),
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
('index.html', 'footer-company', 'Wolf Property Management', 'text', 1, true),
('index.html', 'footer-phone', '512-868-2093', 'text', 1, true),
('index.html', 'footer-email', 'info@wolfpm.com', 'text', 1, true)
ON CONFLICT (page_name, element_id, version) DO NOTHING;

-- About page content
INSERT INTO website_content (page_name, element_id, content_text, content_type, version, is_active) VALUES
('about.html', 'about-hero-title', 'About Wolf Property Management', 'text', 1, true),
('about.html', 'about-hero-subtitle', 'Your Trusted Partner in Georgetown Real Estate', 'text', 1, true),
('about.html', 'about-company-title', 'Our Story', 'text', 1, true),
('about.html', 'about-company-content', 'Wolf Property Management has been serving the Georgetown community for over two decades. We started as a small family business and have grown into Georgetown''s premier property management company, all while maintaining our personal touch and local expertise.', 'text', 1, true),
('about.html', 'team-title', 'Meet Our Team', 'text', 1, true),
('about.html', 'adam-name', 'Adam Starr', 'text', 1, true),
('about.html', 'adam-position', 'Founder & CEO', 'text', 1, true),
('about.html', 'adam-bio', 'Adam brings over 20 years of real estate experience to Wolf Property Management. His deep understanding of the Georgetown market and commitment to client satisfaction has made him a trusted name in property management.', 'text', 1, true),
('about.html', 'patricia-name', 'Patricia Holmes', 'text', 1, true),
('about.html', 'patricia-position', 'Operations Manager', 'text', 1, true),
('about.html', 'patricia-bio', 'Patricia oversees all day-to-day operations and ensures that every property under our management receives the attention it deserves. Her attention to detail and customer service skills are unmatched.', 'text', 1, true),
('about.html', 'stats-properties', '500+', 'text', 1, true),
('about.html', 'stats-satisfaction', '98%', 'text', 1, true),
('about.html', 'stats-experience', '20+ Years', 'text', 1, true),
('about.html', 'cta-title', 'Ready to Get Started?', 'text', 1, true),
('about.html', 'cta-description', 'Contact us today to learn how we can help you maximize your property investment.', 'text', 1, true)
ON CONFLICT (page_name, element_id, version) DO NOTHING;

-- Step 6: Create Initial Version History Entry

INSERT INTO version_history (version_number, description, changes, page_name) VALUES
(1, 'Initial website content setup', '{"hero-title": "Stop Looking and Start Living!", "hero-subtitle": "GEORGETOWN''S PREMIER PROPERTY MANAGEMENT"}', 'index.html')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Database setup completed successfully! RLS is disabled for initial setup.' as status; 