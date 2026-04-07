
ALTER TABLE public.competitions
ADD COLUMN IF NOT EXISTS source_signal text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS is_remote boolean DEFAULT false;
