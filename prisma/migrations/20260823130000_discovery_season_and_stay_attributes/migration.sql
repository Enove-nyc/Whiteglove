-- Discovery: seasonal feature flags on VacationDestination, and kosher/Shabbos
-- tri-state accommodation attributes on KosherStay.
--
-- Every new boolean/tri-state field is additive and defaults safe:
-- seasonActive defaults true (existing rows keep behaving as before),
-- seasonFeatured defaults false (nothing promoted until an admin opts in),
-- and every KosherStay attribute defaults to the string "unknown" — never
-- inferred, never shown to customers until an admin sets it to "yes".

ALTER TABLE "VacationDestination"
  ADD COLUMN IF NOT EXISTS "seasonFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "seasonActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "KosherStay"
  ADD COLUMN IF NOT EXISTS "onSiteKosherFood" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "kosherBreakfast" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "shabbosMeals" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "nearbyKosherFood" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "nearbyShulOrMinyan" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "eruv" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "shabbosAccessInfo" TEXT,
  ADD COLUMN IF NOT EXISTS "shabbosElevator" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "kitchenSelfCatering" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "kosherKitchen" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "walkingDistanceToJewishArea" TEXT NOT NULL DEFAULT 'unknown';
