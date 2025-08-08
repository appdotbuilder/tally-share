import { db } from '../db';
import { tallyItemsTable, tallyVotesTable } from '../db/schema';
import { type RemoveItemInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function removeTallyItem(input: RemoveItemInput): Promise<{ success: boolean }> {
  try {
    // First, check if the item exists and get its total_count
    const items = await db.select()
      .from(tallyItemsTable)
      .where(eq(tallyItemsTable.id, input.item_id))
      .execute();

    // Item doesn't exist
    if (items.length === 0) {
      return { success: false };
    }

    const item = items[0];

    // Item has non-zero count - cannot remove
    if (item.total_count !== 0) {
      return { success: false };
    }

    // Item can be removed - delete associated votes first, then the item
    await db.delete(tallyVotesTable)
      .where(eq(tallyVotesTable.item_id, input.item_id))
      .execute();

    await db.delete(tallyItemsTable)
      .where(eq(tallyItemsTable.id, input.item_id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Remove tally item failed:', error);
    throw error;
  }
}