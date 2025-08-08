import { db } from '../db';
import { tallyItemsTable, tallyVotesTable } from '../db/schema';
import { type VoteInput, type TallyItem } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export async function voteOnItem(input: VoteInput): Promise<TallyItem> {
  try {
    // First verify the item exists
    const item = await db.select()
      .from(tallyItemsTable)
      .where(eq(tallyItemsTable.id, input.item_id))
      .execute();
    
    if (item.length === 0) {
      throw new Error(`Item with id ${input.item_id} not found`);
    }

    // Find existing vote record for this user + item combination
    const existingVote = await db.select()
      .from(tallyVotesTable)
      .where(and(
        eq(tallyVotesTable.item_id, input.item_id),
        eq(tallyVotesTable.user_session_id, input.user_session_id)
      ))
      .execute();

    let userVoteCount = 0;
    
    if (existingVote.length > 0) {
      userVoteCount = existingVote[0].count;
    }

    // For decrement, check if user has positive count
    if (input.delta === -1 && userVoteCount <= 0) {
      throw new Error('Cannot decrement: user has no votes on this item');
    }

    const newUserCount = userVoteCount + input.delta;

    // Update or insert the vote record
    if (existingVote.length > 0) {
      // Update existing vote
      await db.update(tallyVotesTable)
        .set({ 
          count: newUserCount,
          updated_at: new Date()
        })
        .where(eq(tallyVotesTable.id, existingVote[0].id))
        .execute();
    } else {
      // Create new vote record (only if delta is positive)
      await db.insert(tallyVotesTable)
        .values({
          id: crypto.randomUUID(),
          item_id: input.item_id,
          user_session_id: input.user_session_id,
          count: newUserCount
        })
        .execute();
    }

    // Calculate the new total count by summing all user votes for this item
    const totalCountResult = await db.select({
      total: sql<number>`COALESCE(SUM(${tallyVotesTable.count}), 0)`
    })
      .from(tallyVotesTable)
      .where(eq(tallyVotesTable.item_id, input.item_id))
      .execute();

    const newTotalCount = Number(totalCountResult[0].total);

    // Update the item's total_count
    await db.update(tallyItemsTable)
      .set({ total_count: newTotalCount })
      .where(eq(tallyItemsTable.id, input.item_id))
      .execute();

    // Return the updated item
    const updatedItem = await db.select()
      .from(tallyItemsTable)
      .where(eq(tallyItemsTable.id, input.item_id))
      .execute();

    return updatedItem[0];
  } catch (error) {
    console.error('Vote operation failed:', error);
    throw error;
  }
}