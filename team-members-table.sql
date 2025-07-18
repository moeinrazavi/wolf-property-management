-- Add Team Members Table to Wolf Property Management Database
-- Run this script in your Supabase SQL Editor

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_page ON team_members(page_name);
CREATE INDEX IF NOT EXISTS idx_team_members_sort ON team_members(sort_order);

-- Disable RLS for initial setup (matching other tables)
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;

-- Insert existing team members from about.html
INSERT INTO team_members (name, position, bio, bio_paragraph_2, image_url, image_filename, linkedin_url, email, sort_order, is_active, page_name) VALUES
(
    'Adam Starr',
    'Owner, Real Estate Broker & Certified Public Accountant',
    'A Georgetown native and Texas A&M University graduate, Adam brings a unique combination of real estate expertise and financial acumen to Wolf Property Management. His background as a CPA and real estate broker provides our clients with comprehensive property management solutions.',
    'Beyond his professional achievements, Adam is an active member of the Georgetown community, fluent in Spanish, and enjoys various sports including ice hockey and skiing.',
    'https://srpspzgemnfxkqalgjmz.supabase.co/storage/v1/object/public/wolf-property-images/images/people/adam_starr.png',
    'adam_starr.png',
    '#',
    '#',
    1,
    true,
    'about.html'
),
(
    'Patricia Holmes',
    'Office Manager',
    'With over a decade of experience in Georgetown''s real estate market, Patricia brings a wealth of knowledge in property management, mortgage lending, and insurance. Her diverse background enables her to provide comprehensive support to both property owners and tenants.',
    'Patricia''s dedication to excellence and her passion for community engagement make her an invaluable member of our team.',
    'https://srpspzgemnfxkqalgjmz.supabase.co/storage/v1/object/public/wolf-property-images/images/people/patricia_holmes.jpg',
    'patricia_holmes.jpg',
    '#',
    '#',
    2,
    true,
    'about.html'
);

-- Verify setup
SELECT 'Team members table created successfully!' as status;
SELECT COUNT(*) as team_members_count FROM team_members;
