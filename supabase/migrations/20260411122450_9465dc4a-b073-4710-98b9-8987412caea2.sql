
ALTER TABLE public.competitions ADD COLUMN slug text UNIQUE;

-- Generate slugs for all existing competitions
UPDATE public.competitions
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      CONCAT(title, '-', EXTRACT(YEAR FROM exhibition_date::date)::text),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
);

-- Make slug NOT NULL after populating
ALTER TABLE public.competitions ALTER COLUMN slug SET NOT NULL;
