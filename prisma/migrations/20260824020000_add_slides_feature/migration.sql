INSERT INTO "features" ("id", "key", "name", "description", "category", "price", "createdAt")
SELECT gen_random_uuid(), 'SLIDES', 'Slides Carousel', 'Enable homepage slides carousel', 'MODULE', 0, now()
WHERE NOT EXISTS (SELECT 1 FROM "features" WHERE "key" = 'SLIDES');
