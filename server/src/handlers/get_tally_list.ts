import { db } from '../db';
import { tallyListsTable, tallyItemsTable } from '../db/schema';
import { type TallyListWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export const getTallyList = async (listId: string): Promise<TallyListWithItems | null> => {
  try {
    // First, get the tally list
    const lists = await db.select()
      .from(tallyListsTable)
      .where(eq(tallyListsTable.id, listId))
      .execute();

    if (lists.length === 0) {
      return null;
    }

    const list = lists[0];

    // Get all items for this list
    const items = await db.select()
      .from(tallyItemsTable)
      .where(eq(tallyItemsTable.list_id, listId))
      .execute();

    // Return the tally list with its items
    return {
      id: list.id,
      title: list.title,
      created_at: list.created_at,
      items: items
    };
  } catch (error) {
    console.error('Get tally list failed:', error);
    throw error;
  }
};