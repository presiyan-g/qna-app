DROP INDEX "questions_community_schedule_idx";--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "scheduled_for" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "closes_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "questions_active_community_schedule_idx" ON "questions" USING btree ("community_id","scheduled_for") WHERE "questions"."deleted_at" is null;