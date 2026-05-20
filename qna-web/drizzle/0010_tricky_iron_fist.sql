CREATE TYPE "public"."user_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."community_cadence" AS ENUM('daily', 'weekly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."community_member_role" AS ENUM('member', 'creator');--> statement-breakpoint
CREATE TYPE "public"."community_status" AS ENUM('active', 'archived');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'member'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."user_status";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DATA TYPE "public"."user_status" USING "status"::"public"."user_status";--> statement-breakpoint
ALTER TABLE "communities" ALTER COLUMN "cadence" SET DEFAULT 'daily'::"public"."community_cadence";--> statement-breakpoint
ALTER TABLE "communities" ALTER COLUMN "cadence" SET DATA TYPE "public"."community_cadence" USING "cadence"::"public"."community_cadence";--> statement-breakpoint
ALTER TABLE "communities" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."community_status";--> statement-breakpoint
ALTER TABLE "communities" ALTER COLUMN "status" SET DATA TYPE "public"."community_status" USING "status"::"public"."community_status";--> statement-breakpoint
ALTER TABLE "community_members" ALTER COLUMN "role" SET DEFAULT 'member'::"public"."community_member_role";--> statement-breakpoint
ALTER TABLE "community_members" ALTER COLUMN "role" SET DATA TYPE "public"."community_member_role" USING "role"::"public"."community_member_role";