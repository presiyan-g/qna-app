CREATE TABLE "question_choices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"label" text NOT NULL,
	"image_url" text,
	"is_correct" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"explanation" text NOT NULL,
	"image_url" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"closes_at" timestamp with time zone NOT NULL,
	"time_zone" text DEFAULT 'GMT' NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_choices" ADD CONSTRAINT "question_choices_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_choices_question_position_unique" ON "question_choices" USING btree ("question_id","position");--> statement-breakpoint
CREATE INDEX "question_choices_question_id_idx" ON "question_choices" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "questions_community_schedule_idx" ON "questions" USING btree ("community_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "questions_community_status_idx" ON "questions" USING btree ("community_id","status");--> statement-breakpoint
CREATE INDEX "questions_creator_user_id_idx" ON "questions" USING btree ("creator_user_id");