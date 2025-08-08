import { text, pgTable, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tally Lists table
export const tallyListsTable = pgTable('tally_lists', {
  id: text('id').primaryKey(), // UUID string
  title: text('title').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Tally Items table
export const tallyItemsTable = pgTable('tally_items', {
  id: text('id').primaryKey(), // UUID string
  list_id: text('list_id').notNull(),
  name: text('name').notNull(),
  total_count: integer('total_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Tally Votes table - tracks individual user contributions
export const tallyVotesTable = pgTable('tally_votes', {
  id: text('id').primaryKey(), // UUID string
  item_id: text('item_id').notNull(),
  user_session_id: text('user_session_id').notNull(), // Browser-based session ID
  count: integer('count').notNull().default(0), // User's total contribution to this item
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const tallyListsRelations = relations(tallyListsTable, ({ many }) => ({
  items: many(tallyItemsTable),
}));

export const tallyItemsRelations = relations(tallyItemsTable, ({ one, many }) => ({
  list: one(tallyListsTable, {
    fields: [tallyItemsTable.list_id],
    references: [tallyListsTable.id],
  }),
  votes: many(tallyVotesTable),
}));

export const tallyVotesRelations = relations(tallyVotesTable, ({ one }) => ({
  item: one(tallyItemsTable, {
    fields: [tallyVotesTable.item_id],
    references: [tallyItemsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type TallyList = typeof tallyListsTable.$inferSelect;
export type NewTallyList = typeof tallyListsTable.$inferInsert;
export type TallyItem = typeof tallyItemsTable.$inferSelect;
export type NewTallyItem = typeof tallyItemsTable.$inferInsert;
export type TallyVote = typeof tallyVotesTable.$inferSelect;
export type NewTallyVote = typeof tallyVotesTable.$inferInsert;

// Important: Export all tables and relations for proper query building
export const tables = { 
  tallyLists: tallyListsTable, 
  tallyItems: tallyItemsTable, 
  tallyVotes: tallyVotesTable 
};