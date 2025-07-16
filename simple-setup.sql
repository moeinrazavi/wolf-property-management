-- Simple Database Setup for Wolf Property Management
-- Copy and paste this entire script into Supabase SQL Editor and run it

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS version_history;
DROP TABLE IF EXISTS website_content;
DROP TABLE IF EXISTS media_content;
DROP TABLE IF EXISTS admin_users;

-- Create admin_users table
CREATE TABLE admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create website_content table
CREATE TABLE website_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_name TEXT NOT NULL,
    element_id TEXT NOT NULL,
    content_text TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create version_history table
CREATE TABLE version_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number INTEGER NOT NULL,
    description TEXT,
    changes JSONB,
    page_name TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create media_content table
CREATE TABLE media_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_name TEXT NOT NULL,
    element_id TEXT NOT NULL,
    file_name TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT,
    alt_text TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Disable RLS (Row Level Security) for all tables
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE website_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE version_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE media_content DISABLE ROW LEVEL SECURITY;

-- Insert admin user
INSERT INTO admin_users (email, password_hash, is_active) 
VALUES ('admin@wolfpm.com', 'admin123', true);

-- Insert initial website content
INSERT INTO website_content (page_name, element_id, content_text, version, is_active) VALUES
-- Hero section
('index.html', 'hero-title', 'Stop Looking and Start Living!', 1, true),
('index.html', 'hero-subtitle', 'GEORGETOWN''S PREMIER PROPERTY MANAGEMENT', 1, true),
('index.html', 'hero-description', 'Locally owned and operated with multiple generations of real estate expertise', 1, true),

-- Find Your Edge section
('index.html', 'find-your-edge-title', 'Find Your Edge', 1, true),
('index.html', 'find-your-edge-content', 'Wolf Property Management is a full-service, boutique-style property management company providing clients a broad spectrum of residential real estate services, including Property Management, Sales, and Leasing. We are passionate about Georgetown and practicing real estate in this amazing city.', 1, true),

-- Neighborhood spotlights
('index.html', 'neighborhood-title', 'GEORGETOWN NEIGHBORHOOD SPOTLIGHTS', 1, true),
('index.html', 'downtown-title', 'Downtown', 1, true),
('index.html', 'downtown-subtitle', 'THE HEART OF GEORGETOWN', 1, true),
('index.html', 'south-title', 'South Georgetown', 1, true),
('index.html', 'south-subtitle', 'NOT YOUR TYPICAL SUBURB', 1, true),
('index.html', 'west-title', 'West Georgetown', 1, true),
('index.html', 'west-subtitle', 'A LUXURIOUS LANDSCAPE', 1, true),

-- Services section
('index.html', 'services-title', 'What are you looking for?', 1, true),
('index.html', 'residential-title', 'Residential Management', 1, true),
('index.html', 'residential-description', 'Expert care for your home with comprehensive property management services.', 1, true),
('index.html', 'commercial-title', 'Commercial Properties', 1, true),
('index.html', 'commercial-description', 'Maximizing your investment with professional commercial property management.', 1, true),
('index.html', 'hoa-title', 'HOA Management', 1, true),
('index.html', 'hoa-description', 'Community-focused solutions for homeowners associations.', 1, true),

-- Service categories
('index.html', 'categories-title', 'Our Management Services', 1, true),

-- Footer
('index.html', 'footer-company', 'Wolf Property Management', 1, true),
('index.html', 'footer-phone', '512-868-2093', 1, true),
('index.html', 'footer-email', 'info@wolfpm.com', 1, true),
('index.html', 'footer-copyright', '© 2024 Wolf Property Management. All rights reserved.', 1, true);

-- Insert initial version history
INSERT INTO version_history (version_number, description, changes, page_name) VALUES
(1, 'Initial setup - Website content loaded from database', '{}', 'index.html');

-- Verify the setup
SELECT 'Setup Complete!' as status;
SELECT 'Admin Users:' as table_name, count(*) as count FROM admin_users;
SELECT 'Content Items:' as table_name, count(*) as count FROM website_content;
SELECT 'Versions:' as table_name, count(*) as count FROM version_history; 