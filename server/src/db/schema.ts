import { serial, text, pgTable, timestamp, integer, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Lists table - each list has a unique UUID for sharing
export const listsTable = pgTable('lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Items table - belongs to a list
export const itemsTable = pgTable('items', {
  id: serial('id').primaryKey(),
  list_id: uuid('list_id').notNull().references(() => listsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  total_count: integer('total_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// User contributions table - tracks individual user contributions to items
export const userContributionsTable = pgTable('user_contributions', {
  id: serial('id').primaryKey(),
  item_id: integer('item_id').notNull().references(() => itemsTable.id, { onDelete: 'cascade' }),
  user_session_id: text('user_session_id').notNull(), // Anonymous session ID
  count: integer('count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const listsRelations = relations(listsTable, ({ many }) => ({
  items: many(itemsTable),
}));

export const itemsRelations = relations(itemsTable, ({ one, many }) => ({
  list: one(listsTable, {
    fields: [itemsTable.list_id],
    references: [listsTable.id],
  }),
  userContributions: many(userContributionsTable),
}));

export const userContributionsRelations = relations(userContributionsTable, ({ one }) => ({
  item: one(itemsTable, {
    fields: [userContributionsTable.item_id],
    references: [itemsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type List = typeof listsTable.$inferSelect;
export type NewList = typeof listsTable.$inferInsert;
export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;
export type UserContribution = typeof userContributionsTable.$inferSelect;
export type NewUserContribution = typeof userContributionsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  lists: listsTable, 
  items: itemsTable, 
  userContributions: userContributionsTable 
};