import { db } from '../db';
import { tallyVotesTable, tallyItemsTable } from '../db/schema';
import { type UserVoteCount } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getUserVotes(listId: string, userSessionId: string): Promise<UserVoteCount[]> {
  try {
    // Join tally_votes with tally_items to filter by list_id
    // This ensures we only get votes for items in the specified list
    const results = await db.select({
      item_id: tallyVotesTable.item_id,
      user_count: tallyVotesTable.count
    })
    .from(tallyVotesTable)
    .innerJoin(tallyItemsTable, eq(tallyVotesTable.item_id, tallyItemsTable.id))
    .where(
      and(
        eq(tallyItemsTable.list_id, listId),
        eq(tallyVotesTable.user_session_id, userSessionId)
      )
    )
    .execute();

    return results.map(result => ({
      item_id: result.item_id,
      user_count: result.user_count
    }));
  } catch (error) {
    console.error('Failed to get user votes:', error);
    throw error;
  }
}