import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const questions = pgTable(
  'questions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    prompt: text('prompt').notNull(),
    explanation: text('explanation').notNull(),
    imageUrl: text('image_url'),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    closesAt: timestamp('closes_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    timeZone: text('time_zone').notNull().default('GMT'),
    points: integer('points').notNull().default(10),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('questions_active_community_schedule_idx')
      .on(table.communityId, table.scheduledFor)
      .where(sql`${table.deletedAt} is null`),
    index('questions_creator_user_id_idx').on(table.creatorUserId),
  ],
);

export const questionChoices = pgTable(
  'question_choices',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    imageUrl: text('image_url'),
    isCorrect: boolean('is_correct').notNull().default(false),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('question_choices_question_position_unique').on(
      table.questionId,
      table.position,
    ),
    index('question_choices_question_id_idx').on(table.questionId),
  ],
);

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type QuestionChoice = typeof questionChoices.$inferSelect;
export type NewQuestionChoice = typeof questionChoices.$inferInsert;
