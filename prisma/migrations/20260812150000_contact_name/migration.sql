-- Whose number it is.
--
-- A shomer's name had nowhere to live but the contact's label, and the label is
-- what an edit matches on: correcting the number of a shomer whose name was
-- spelled differently added a second contact instead of replacing the first.
-- Nullable, because most contacts are an office rather than a person.
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "name" TEXT;
