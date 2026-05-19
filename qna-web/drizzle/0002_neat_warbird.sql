CREATE TABLE "community_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "featured_rank" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "community_categories_slug_unique" ON "community_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "community_categories_name_idx" ON "community_categories" USING btree ("name");--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_category_id_community_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."community_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "communities_category_id_idx" ON "communities" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "communities_featured_idx" ON "communities" USING btree ("is_featured","featured_rank");