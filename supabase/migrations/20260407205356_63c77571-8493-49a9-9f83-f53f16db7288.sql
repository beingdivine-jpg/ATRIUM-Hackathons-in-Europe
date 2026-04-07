
-- Create format_type enum
CREATE TYPE public.competition_format AS ENUM ('hackathon', 'buildathon', 'innovation_challenge');

-- Rename table
ALTER TABLE public.technical_exhibitions RENAME TO competitions;

-- Add format_type column
ALTER TABLE public.competitions ADD COLUMN format_type public.competition_format NOT NULL DEFAULT 'hackathon';

-- Update the realtime publication if it exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'technical_exhibitions') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.technical_exhibitions;
  END IF;
END $$;
