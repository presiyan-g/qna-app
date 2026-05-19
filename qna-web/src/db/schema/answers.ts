import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { questionChoices, questions } from './questions';
import { users } from './users';

export const answers = pgTable(
  'answers',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    selectedChoiceId: uuid('selected_choice_id')
      .notNull()
      .references(() => questionChoices.id, { onDelete: 'restrict' }),
    isCorrect: boolean('is_correct').notNull(),
    isLate: boolean('is_late').notNull().default(false),
    pointsAwarded: integer('points_awarded').notNull().default(0),
    answeredAt: timestamp('answered_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('answers_question_user_unique').on(
      table.questionId,
      table.userId,
    ),
    index('answers_user_id_idx').on(table.userId),
    index('answers_question_id_idx').on(table.questionId),
    index('answers_selected_choice_id_idx').on(table.selectedChoiceId),
  ],
);

export type Answer = typeof answers.$inferSelect;
export type NewAnswer = typeof answers.$inferInsert;
