import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tallyListsTable, tallyItemsTable, tallyVotesTable } from '../db/schema';
import { type RemoveItemInput } from '../schema';
import { removeTallyItem } from '../handlers/remove_tally_item';
import { eq } from 'drizzle-orm';

describe('removeTallyItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully remove an item with zero total_count', async () => {
    // Create a tally list
    const listResult = await db.insert(tallyListsTable)
      .values({
        id: 'list-1',
        title: 'Test List'
      })
      .returning()
      .execute();

    // Create a tally item with zero count
    const itemResult = await db.insert(tallyItemsTable)
      .values({
        id: 'item-1',
        list_id: 'list-1',
        name: 'Test Item',
        total_count: 0
      })
      .returning()
      .execute();

    // Create some votes for the item (should be removed too)
    await db.insert(tallyVotesTable)
      .values([
        {
          id: 'vote-1',
          item_id: 'item-1',
          user_session_id: 'user-1',
          count: 0
        },
        {
          id: 'vote-2',
          item_id: 'item-1',
          user_session_id: 'user-2',
          count: 0
        }
      ])
      .execute();

    const input: RemoveItemInput = {
      item_id: 'item-1'
    };

    const result = await removeTallyItem(input);

    expect(result.success).toBe(true);

    // Verify the item was deleted
    const remainingItems = await db.select()
      .from(tallyItemsTable)
      .where(eq(tallyItemsTable.id, 'item-1'))
      .execute();

    expect(remainingItems).toHaveLength(0);

    // Verify associated votes were deleted
    const remainingVotes = await db.select()
      .from(tallyVotesTable)
      .where(eq(tallyVotesTable.item_id, 'item-1'))
      .execute();

    expect(remainingVotes).toHaveLength(0);
  });

  it('should not remove an item with non-zero total_count', async () => {
    // Create a tally list
    await db.insert(tallyListsTable)
      .values({
        id: 'list-1',
        title: 'Test List'
      })
      .execute();

    // Create a tally item with non-zero count
    await db.insert(tallyItemsTable)
      .values({
        id: 'item-1',
        list_id: 'list-1',
        name: 'Test Item',
        total_count: 5
      })
      .execute();

    // Create some votes for the item
    await db.insert(tallyVotesTable)
      .values([
        {
          id: 'vote-1',
          item_id: 'item-1',
          user_session_id: 'user-1',
          count: 3
        },
        {
          id: 'vote-2',
          item_id: 'item-1',
          user_session_id: 'user-2',
          count: 2
        }
      ])
      .execute();

    const input: RemoveItemInput = {
      item_id: 'item-1'
    };

    const result = await removeTallyItem(input);

    expect(result.success).toBe(false);

    // Verify the item still exists
    const remainingItems = await db.select()
      .from(tallyItemsTable)
      .where(eq(tallyItemsTable.id, 'item-1'))
      .execute();

    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].total_count).toBe(5);

    // Verify votes are still there
    const remainingVotes = await db.select()
      .from(tallyVotesTable)
      .where(eq(tallyVotesTable.item_id, 'item-1'))
      .execute();

    expect(remainingVotes).toHaveLength(2);
  });

  it('should return false when trying to remove non-existent item', async () => {
    const input: RemoveItemInput = {
      item_id: 'non-existent-item'
    };

    const result = await removeTallyItem(input);

    expect(result.success).toBe(false);
  });

  it('should handle negative total_count correctly', async () => {
    // Create a tally list
    await db.insert(tallyListsTable)
      .values({
        id: 'list-1',
        title: 'Test List'
      })
      .execute();

    // Create a tally item with negative count (edge case)
    await db.insert(tallyItemsTable)
      .values({
        id: 'item-1',
        list_id: 'list-1',
        name: 'Test Item',
        total_count: -1
      })
      .execute();

    const input: RemoveItemInput = {
      item_id: 'item-1'
    };

    const result = await removeTallyItem(input);

    // Should not remove item with negative count
    expect(result.success).toBe(false);

    // Verify the item still exists
    const remainingItems = await db.select()
      .from(tallyItemsTable)
      .where(eq(tallyItemsTable.id, 'item-1'))
      .execute();

    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].total_count).toBe(-1);
  });

  it('should only remove the specified item, not others', async () => {
    // Create a tally list
    await db.insert(tallyListsTable)
      .values({
        id: 'list-1',
        title: 'Test List'
      })
      .execute();

    // Create multiple tally items
    await db.insert(tallyItemsTable)
      .values([
        {
          id: 'item-1',
          list_id: 'list-1',
          name: 'Item to Remove',
          total_count: 0
        },
        {
          id: 'item-2',
          list_id: 'list-1',
          name: 'Item to Keep',
          total_count: 3
        },
        {
          id: 'item-3',
          list_id: 'list-1',
          name: 'Another Item to Keep',
          total_count: 0
        }
      ])
      .execute();

    // Create votes for different items
    await db.insert(tallyVotesTable)
      .values([
        {
          id: 'vote-1',
          item_id: 'item-1',
          user_session_id: 'user-1',
          count: 0
        },
        {
          id: 'vote-2',
          item_id: 'item-2',
          user_session_id: 'user-1',
          count: 3
        },
        {
          id: 'vote-3',
          item_id: 'item-3',
          user_session_id: 'user-2',
          count: 0
        }
      ])
      .execute();

    const input: RemoveItemInput = {
      item_id: 'item-1'
    };

    const result = await removeTallyItem(input);

    expect(result.success).toBe(true);

    // Verify only the specified item was removed
    const remainingItems = await db.select()
      .from(tallyItemsTable)
      .execute();

    expect(remainingItems).toHaveLength(2);
    expect(remainingItems.find(item => item.id === 'item-1')).toBeUndefined();
    expect(remainingItems.find(item => item.id === 'item-2')).toBeDefined();
    expect(remainingItems.find(item => item.id === 'item-3')).toBeDefined();

    // Verify only votes for the removed item were deleted
    const remainingVotes = await db.select()
      .from(tallyVotesTable)
      .execute();

    expect(remainingVotes).toHaveLength(2);
    expect(remainingVotes.find(vote => vote.item_id === 'item-1')).toBeUndefined();
    expect(remainingVotes.find(vote => vote.item_id === 'item-2')).toBeDefined();
    expect(remainingVotes.find(vote => vote.item_id === 'item-3')).toBeDefined();
  });
});