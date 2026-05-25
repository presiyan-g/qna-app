ALTER TABLE "communities" ADD COLUMN "directory_rank" integer;--> statement-breakpoint
CREATE INDEX "communities_directory_rank_idx" ON "communities" USING btree ("directory_rank");