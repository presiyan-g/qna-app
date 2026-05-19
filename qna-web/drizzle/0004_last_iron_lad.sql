UPDATE "questions" SET "published_at" = "scheduled_for" WHERE "published_at" IS NULL;--> statement-breakpoint
DROP INDEX "questions_community_status_idx";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "status";
