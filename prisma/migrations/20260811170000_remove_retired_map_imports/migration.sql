-- Retire map-derived candidate data completely. These rows were never a
-- public source of truth and must not remain staged, reviewable, or publishable.
WITH retired_candidates AS (
  SELECT "id"
  FROM "ContentImportCandidate"
  WHERE lower("sourceUrl") LIKE '%openstreetmap%'
    OR lower("sourceUrl") LIKE '%overpass%'
    OR lower("sourceUrl") LIKE '%photon.komoot%'
    OR lower(COALESCE("kosherSourceUrl", '')) LIKE '%openstreetmap%'
    OR lower(COALESCE("kosherSourceUrl", '')) LIKE '%overpass%'
    OR lower(COALESCE("kosherSourceUrl", '')) LIKE '%photon.komoot%'
    OR lower("sourceName") LIKE '%openstreetmap%'
    OR lower("sourceName") LIKE '%overpass%'
    OR lower("sourceName") LIKE '%photon%'
    OR lower("attribution") LIKE '%openstreetmap%'
    OR lower(COALESCE("sourceEvidence"::text, '')) LIKE '%openstreetmap%'
    OR lower(COALESCE("sourceEvidence"::text, '')) LIKE '%overpass%'
    OR lower("sourceUrl") LIKE '%maps.googleapis.com%'
    OR lower("sourceUrl") LIKE '%places.googleapis.com%'
    OR lower("sourceName") LIKE '%google maps%'
    OR lower("sourceName") LIKE '%google places%'
)
DELETE FROM "TrelloCandidateReviewCard"
WHERE "candidateId" IN (SELECT "id" FROM retired_candidates);

DELETE FROM "ContentImportCandidate"
WHERE lower("sourceUrl") LIKE '%openstreetmap%'
  OR lower("sourceUrl") LIKE '%overpass%'
  OR lower("sourceUrl") LIKE '%photon.komoot%'
  OR lower(COALESCE("kosherSourceUrl", '')) LIKE '%openstreetmap%'
  OR lower(COALESCE("kosherSourceUrl", '')) LIKE '%overpass%'
  OR lower(COALESCE("kosherSourceUrl", '')) LIKE '%photon.komoot%'
  OR lower("sourceName") LIKE '%openstreetmap%'
  OR lower("sourceName") LIKE '%overpass%'
  OR lower("sourceName") LIKE '%photon%'
  OR lower("attribution") LIKE '%openstreetmap%'
  OR lower(COALESCE("sourceEvidence"::text, '')) LIKE '%openstreetmap%'
  OR lower(COALESCE("sourceEvidence"::text, '')) LIKE '%overpass%'
  OR lower("sourceUrl") LIKE '%maps.googleapis.com%'
  OR lower("sourceUrl") LIKE '%places.googleapis.com%'
  OR lower("sourceName") LIKE '%google maps%'
  OR lower("sourceName") LIKE '%google places%';

DELETE FROM "ContentImportBatch"
WHERE lower("sourceUrl") LIKE '%openstreetmap%'
   OR lower("sourceUrl") LIKE '%overpass%'
   OR lower("sourceUrl") LIKE '%photon.komoot%'
   OR lower("sourceName") LIKE '%openstreetmap%'
   OR lower("sourceName") LIKE '%overpass%'
   OR lower("sourceName") LIKE '%photon%'
   OR lower("attribution") LIKE '%openstreetmap%'
   OR lower("sourceUrl") LIKE '%maps.googleapis.com%'
   OR lower("sourceUrl") LIKE '%places.googleapis.com%'
   OR lower("sourceName") LIKE '%google maps%'
   OR lower("sourceName") LIKE '%google places%';
