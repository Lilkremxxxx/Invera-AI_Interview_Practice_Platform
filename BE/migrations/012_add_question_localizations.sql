ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS text_en TEXT;

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS text_vi TEXT;

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS category_en TEXT;

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS category_vi TEXT;

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS ideal_answer_en TEXT;

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS ideal_answer_vi TEXT;

UPDATE questions
SET text_en = COALESCE(NULLIF(BTRIM(text_en), ''), text),
    text_vi = COALESCE(NULLIF(BTRIM(text_vi), ''), text),
    category_en = COALESCE(NULLIF(BTRIM(category_en), ''), category),
    category_vi = COALESCE(NULLIF(BTRIM(category_vi), ''), category),
    ideal_answer_en = COALESCE(NULLIF(BTRIM(ideal_answer_en), ''), ideal_answer),
    ideal_answer_vi = COALESCE(NULLIF(BTRIM(ideal_answer_vi), ''), ideal_answer);
