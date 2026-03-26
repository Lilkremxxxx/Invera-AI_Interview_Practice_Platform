DO $$
DECLARE
    existing_constraint text;
BEGIN
    IF to_regclass('public.answers') IS NULL THEN
        RETURN;
    END IF;

    FOR existing_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.answers'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%score%'
    LOOP
        EXECUTE format('ALTER TABLE public.answers DROP CONSTRAINT %I', existing_constraint);
    END LOOP;

    ALTER TABLE public.answers
        ALTER COLUMN score TYPE NUMERIC(3,1)
        USING CASE
            WHEN score IS NULL THEN NULL
            WHEN score > 10 THEN ROUND((score::numeric / 10.0), 1)
            ELSE ROUND(score::numeric, 1)
        END;

    ALTER TABLE public.answers
        ALTER COLUMN score SET DEFAULT 0;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.answers'::regclass
          AND conname = 'answers_score_range_check'
    ) THEN
        ALTER TABLE public.answers
            ADD CONSTRAINT answers_score_range_check CHECK (score >= 0 AND score <= 10);
    END IF;
END $$;
