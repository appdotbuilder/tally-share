import { z } from 'zod';

// Tally List schema
export const tallyListSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.coerce.date(),
});

export type TallyList = z.infer<typeof tallyListSchema>;

// Input schema for creating tally lists
export const createTallyListInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

export type CreateTallyListInput = z.infer<typeof createTallyListInputSchema>;

// Tally Item schema
export const tallyItemSchema = z.object({
  id: z.string(),
  list_id: z.string(),
  name: z.string(),
  total_count: z.number().int().nonnegative(),
  created_at: z.coerce.date(),
});

export type TallyItem = z.infer<typeof tallyItemSchema>;

// Input schema for creating tally items
export const createTallyItemInputSchema = z.object({
  list_id: z.string(),
  name: z.string().min(1, 'Item name is required'),
});

export type CreateTallyItemInput = z.infer<typeof createTallyItemInputSchema>;

// Tally Vote schema - tracks individual user contributions
export const tallyVoteSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  user_session_id: z.string(),
  count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type TallyVote = z.infer<typeof tallyVoteSchema>;

// Input schema for voting (increment/decrement)
export const voteInputSchema = z.object({
  item_id: z.string(),
  user_session_id: z.string(),
  delta: z.number().int().min(-1).max(1), // Can only increment by 1 or decrement by 1
});

export type VoteInput = z.infer<typeof voteInputSchema>;

// Input schema for removing items
export const removeItemInputSchema = z.object({
  item_id: z.string(),
});

export type RemoveItemInput = z.infer<typeof removeItemInputSchema>;

// Response schema for tally list with items
export const tallyListWithItemsSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.coerce.date(),
  items: z.array(tallyItemSchema),
});

export type TallyListWithItems = z.infer<typeof tallyListWithItemsSchema>;

// Response schema for user's vote counts per item
export const userVoteCountSchema = z.object({
  item_id: z.string(),
  user_count: z.number().int(),
});

export type UserVoteCount = z.infer<typeof userVoteCountSchema>;