-- News Articles Table
-- This migration creates the news_articles table for dynamic news content

-- Create news_articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'News',
  author VARCHAR(255) NOT NULL DEFAULT 'Dark Point Team',
  type VARCHAR(50) NOT NULL DEFAULT 'image', -- image, video, audio, gallery
  image_url VARCHAR(500),
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create article_comments table
CREATE TABLE IF NOT EXISTS article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  parent_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_news_articles_slug ON news_articles(slug);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id);

-- Enable RLS
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news_articles
DROP POLICY IF EXISTS "Anyone can view published articles" ON news_articles;
CREATE POLICY "Anyone can view published articles" ON news_articles
  FOR SELECT USING (is_published = true);

-- RLS Policies for article_comments
DROP POLICY IF EXISTS "Anyone can view approved comments" ON article_comments;
CREATE POLICY "Anyone can view approved comments" ON article_comments
  FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Authenticated users can add comments" ON article_comments;
CREATE POLICY "Authenticated users can add comments" ON article_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Function to increment article views
CREATE OR REPLACE FUNCTION increment_article_views(p_article_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE news_articles 
  SET views = views + 1, updated_at = NOW()
  WHERE id = p_article_id;
END;
$$;

-- Function to get article comment count
CREATE OR REPLACE FUNCTION get_article_comment_count(p_article_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM article_comments
  WHERE article_id = p_article_id AND is_approved = true;
  
  RETURN v_count;
END;
$$;

-- Insert 3 sample articles
INSERT INTO news_articles (slug, title, excerpt, content, category, author, type, image_url, views, likes, tags, published_at)
VALUES 
  (
    'next-gen-gaming-keyboards-2025',
    'Next-Gen Gaming Keyboards: RGB, Speed & Innovation',
    'Discover the latest mechanical keyboards designed for competitive gaming. From optical switches to customizable RGB, these keyboards are built for victory.',
    '<p>The gaming keyboard market has evolved dramatically over the past year, with manufacturers pushing the boundaries of speed, customization, and aesthetics.</p>

<h3>Optical vs Mechanical Switches</h3>
<p>Optical switches have gained significant traction among competitive gamers due to their faster actuation times. Unlike traditional mechanical switches that rely on metal contact points, optical switches use light-based actuation, resulting in response times as low as 0.2ms.</p>

<blockquote>
  <p>"The difference between winning and losing often comes down to milliseconds. Optical switches give us that edge."</p>
  <footer>Pro Gamer, FPS Championship Winner</footer>
</blockquote>

<h3>Customization is King</h3>
<p>Modern gaming keyboards offer unprecedented levels of customization. From per-key RGB lighting with millions of colors to hot-swappable switches that let you change your typing feel without soldering, the options are endless.</p>

<p>Key features to look for in 2025:</p>
<ul>
  <li>Hot-swappable PCB for easy switch changes</li>
  <li>PBT keycaps for durability</li>
  <li>USB-C connectivity with passthrough</li>
  <li>Magnetic wrist rests</li>
  <li>Dedicated macro keys</li>
</ul>

<h3>Our Top Picks</h3>
<p>After testing over 20 keyboards, here are our recommendations for different gaming styles and budgets. Whether you''re a casual gamer or aspiring esports pro, there''s a perfect keyboard waiting for you.</p>',
    'Reviews',
    'Dark Point Tech Team',
    'image',
    '/images/news/gaming-keyboard.jpg',
    2847,
    156,
    ARRAY['Gaming', 'Keyboards', 'RGB', 'Mechanical', 'Reviews'],
    NOW() - INTERVAL '2 days'
  ),
  (
    'playstation-exclusive-games-2025',
    'PlayStation Exclusive Games Coming in 2025',
    'Sony has announced an incredible lineup of exclusive titles for PlayStation 5. From highly anticipated sequels to brand new IPs, 2025 is shaping up to be a legendary year for PlayStation gamers.',
    '<p>PlayStation fans have plenty to be excited about as Sony reveals their 2025 exclusive game lineup. The Japanese gaming giant continues to invest heavily in first-party development, promising experiences you won''t find anywhere else.</p>

<h3>Returning Franchises</h3>
<p>Several beloved franchises are making their triumphant return. Fans have been eagerly awaiting these sequels, and early previews suggest they''ll exceed expectations.</p>

<blockquote>
  <p>"We''ve listened to our community and poured our hearts into creating the most immersive gaming experiences possible."</p>
  <footer>PlayStation Studios Director</footer>
</blockquote>

<h3>New IPs to Watch</h3>
<p>Sony is also betting big on fresh ideas. Three new intellectual properties from renowned studios are set to debut, each promising innovative gameplay mechanics and compelling narratives.</p>

<h3>VR Integration</h3>
<p>With PlayStation VR2 now established in the market, several upcoming titles will feature dedicated VR modes or full VR experiences. The line between reality and gaming continues to blur.</p>

<p>Key dates to mark on your calendar:</p>
<ul>
  <li>Q1 2025: Major action RPG release</li>
  <li>Q2 2025: Anticipated sequel launch</li>
  <li>Q3 2025: New IP debut</li>
  <li>Q4 2025: Holiday blockbuster</li>
</ul>

<p>Stay tuned to Dark Point for in-depth coverage, reviews, and exclusive interviews as these titles approach their release dates.</p>',
    'Gaming',
    'Gaming Editorial Team',
    'image',
    '/images/news/playstation-games.jpg',
    4521,
    289,
    ARRAY['PlayStation', 'PS5', 'Exclusive Games', 'Sony', '2025'],
    NOW() - INTERVAL '5 days'
  ),
  (
    'best-gaming-headsets-under-r2000',
    'Best Gaming Headsets Under R2000 in South Africa',
    'Looking for quality gaming audio without breaking the bank? We''ve tested the top gaming headsets available in South Africa under R2000 to find the best value for your money.',
    '<p>Great gaming audio doesn''t have to cost a fortune. We''ve spent the last month testing every gaming headset under R2000 available in the South African market to bring you this comprehensive guide.</p>

<h3>What We Tested</h3>
<p>Our evaluation criteria included:</p>
<ul>
  <li>Sound quality (bass, mids, highs, soundstage)</li>
  <li>Microphone clarity for team communication</li>
  <li>Comfort during extended gaming sessions</li>
  <li>Build quality and durability</li>
  <li>Value for money</li>
</ul>

<h3>The Verdict</h3>
<p>After hundreds of hours of testing across various games—from competitive FPS titles to immersive RPGs—we''ve identified clear winners in different categories.</p>

<blockquote>
  <p>"You don''t need to spend R5000 to get excellent gaming audio. These budget options deliver surprisingly good performance."</p>
  <footer>Dark Point Audio Specialist</footer>
</blockquote>

<h3>Our Top Recommendations</h3>
<p>Whether you prioritize wireless freedom, surround sound immersion, or crystal-clear communication with teammates, there''s a headset in this price range that will exceed your expectations.</p>

<h3>Where to Buy</h3>
<p>All headsets featured in this roundup are available at major South African retailers. We''ve included current prices and links to help you find the best deals.</p>

<p>Remember to check our store for competitive pricing on all featured products!</p>',
    'Reviews',
    'Dark Point Reviews',
    'image',
    '/images/news/gaming-headsets.jpg',
    3156,
    198,
    ARRAY['Gaming', 'Headsets', 'Audio', 'Reviews', 'Budget', 'South Africa'],
    NOW() - INTERVAL '1 week'
  )
ON CONFLICT (slug) DO NOTHING;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_article_views(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_article_comment_count(UUID) TO authenticated, anon;

