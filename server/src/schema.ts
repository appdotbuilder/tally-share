import { z } from 'zod';

// List schema
export const listSchema = z.object({
  id: z.string(), // UUID for unique shareable URLs
  title: z.string(),
  created_at: z.coerce.date()
});

export type List = z.infer<typeof listSchema>;

// Item schema
export const itemSchema = z.object({
  id: z.number(),
  list_id: z.string(),
  name: z.string(),
  total_count: z.number().int().nonnegative(),
  created_at: z.coerce.date()
});

export type Item = z.infer<typeof itemSchema>;

// User contribution schema (tracks individual user contributions to items)
export const userContributionSchema = z.object({
  id: z.number(),
  item_id: z.number(),
  user_session_id: z.string(), // Anonymous session ID to track user contributions
  count: z.number().int().nonnegative(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type UserContribution = z.infer<typeof userContributionSchema>;

// Input schema for creating lists
export const createListInputSchema = z.object({
  title: z.string().min(1, "Title is required")
});

export type CreateListInput = z.infer<typeof createListInputSchema>;

// Input schema for creating items
export const createItemInputSchema = z.object({
  list_id: z.string(),
  name: z.string().min(1, "Item name is required")
});

export type CreateItemInput = z.infer<typeof createItemInputSchema>;

// Input schema for incrementing item count
export const incrementItemInputSchema = z.object({
  item_id: z.number(),
  user_session_id: z.string()
});

export type IncrementItemInput = z.infer<typeof incrementItemInputSchema>;

// Input schema for decrementing item count
export const decrementItemInputSchema = z.object({
  item_id: z.number(),
  user_session_id: z.string()
});

export type DecrementItemInput = z.infer<typeof decrementItemInputSchema>;

// Input schema for removing items
export const removeItemInputSchema = z.object({
  item_id: z.number()
});

export type RemoveItemInput = z.infer<typeof removeItemInputSchema>;

// Input schema for getting list data
export const getListInputSchema = z.object({
  list_id: z.string()
});

export type GetListInput = z.infer<typeof getListInputSchema>;

// Combined list with items response schema
export const listWithItemsSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.coerce.date(),
  items: z.array(itemSchema)
});

export type ListWithItems = z.infer<typeof listWithItemsSchema>;