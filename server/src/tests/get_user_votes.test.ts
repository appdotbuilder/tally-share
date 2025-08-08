import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tallyListsTable, tallyItemsTable, tallyVotesTable } from '../db/schema';
import { getUserVotes } from '../handlers/get_user_votes';

describe('getUserVotes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user vote counts for items in specified list', async () => {
    // Create test tally list
    await db.insert(tallyListsTable).values({
      id: 'list-1',
      title: 'Test List'
    }).execute();

    // Create test tally items
    await db.insert(tallyItemsTable).values([
      {
        id: 'item-1',
        list_id: 'list-1',
        name: 'Item 1',
        total_count: 5
      },
      {
        id: 'item-2',
        list_id: 'list-1',
        name: 'Item 2',
        total_count: 3
      }
    ]).execute();

    // Create test votes for user session
    await db.insert(tallyVotesTable).values([
      {
        id: 'vote-1',
        item_id: 'item-1',
        user_session_id: 'user-123',
        count: 2
      },
      {
        id: 'vote-2',
        item_id: 'item-2',
        user_session_id: 'user-123',
        count: 1
      }
    ]).execute();

    const result = await getUserVotes('list-1', 'user-123');

    expect(result).toHaveLength(2);
    
    // Sort by item_id for consistent testing
    const sortedResult = result.sort((a, b) => a.item_id.localeCompare(b.item_id));
    
    expect(sortedResult[0]).toEqual({
      item_id: 'item-1',
      user_count: 2
    });
    expect(sortedResult[1]).toEqual({
      item_id: 'item-2',
      user_count: 1
    });
  });

  it('should return empty array when user has no votes in list', async () => {
    // Create test tally list
    await db.insert(tallyListsTable).values({
      id: 'list-1',
      title: 'Test List'
    }).execute();

    // Create test tally item
    await db.insert(tallyItemsTable).values({
      id: 'item-1',
      list_id: 'list-1',
      name: 'Item 1',
      total_count: 0
    }).execute();

    const result = await getUserVotes('list-1', 'user-123');

    expect(result).toHaveLength(0);
  });

  it('should only return votes for items in specified list', async () => {
    // Create two test tally lists
    await db.insert(tallyListsTable).values([
      {
        id: 'list-1',
        title: 'Test List 1'
      },
      {
        id: 'list-2',
        title: 'Test List 2'
      }
    ]).execute();

    // Create items in both lists
    await db.insert(tallyItemsTable).values([
      {
        id: 'item-1',
        list_id: 'list-1',
        name: 'Item in List 1',
        total_count: 2
      },
      {
        id: 'item-2',
        list_id: 'list-2',
        name: 'Item in List 2',
        total_count: 3
      }
    ]).execute();

    // Create votes for same user in both lists
    await db.insert(tallyVotesTable).values([
      {
        id: 'vote-1',
        item_id: 'item-1',
        user_session_id: 'user-123',
        count: 2
      },
      {
        id: 'vote-2',
        item_id: 'item-2',
        user_session_id: 'user-123',
        count: 3
      }
    ]).execute();

    // Should only return votes for list-1
    const result = await getUserVotes('list-1', 'user-123');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      item_id: 'item-1',
      user_count: 2
    });
  });

  it('should only return votes for specified user session', async () => {
    // Create test tally list
    await db.insert(tallyListsTable).values({
      id: 'list-1',
      title: 'Test List'
    }).execute();

    // Create test tally item
    await db.insert(tallyItemsTable).values({
      id: 'item-1',
      list_id: 'list-1',
      name: 'Item 1',
      total_count: 5
    }).execute();

    // Create votes for different users
    await db.insert(tallyVotesTable).values([
      {
        id: 'vote-1',
        item_id: 'item-1',
        user_session_id: 'user-123',
        count: 2
      },
      {
        id: 'vote-2',
        item_id: 'item-1',
        user_session_id: 'user-456',
        count: 3
      }
    ]).execute();

    const result = await getUserVotes('list-1', 'user-123');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      item_id: 'item-1',
      user_count: 2
    });
  });

  it('should handle votes with zero count', async () => {
    // Create test tally list
    await db.insert(tallyListsTable).values({
      id: 'list-1',
      title: 'Test List'
    }).execute();

    // Create test tally item
    await db.insert(tallyItemsTable).values({
      id: 'item-1',
      list_id: 'list-1',
      name: 'Item 1',
      total_count: 0
    }).execute();

    // Create vote with zero count (user decremented back to zero)
    await db.insert(tallyVotesTable).values({
      id: 'vote-1',
      item_id: 'item-1',
      user_session_id: 'user-123',
      count: 0
    }).execute();

    const result = await getUserVotes('list-1', 'user-123');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      item_id: 'item-1',
      user_count: 0
    });
  });

  it('should handle negative vote counts', async () => {
    // Create test tally list
    await db.insert(tallyListsTable).values({
      id: 'list-1',
      title: 'Test List'
    }).execute();

    // Create test tally item
    await db.insert(tallyItemsTable).values({
      id: 'item-1',
      list_id: 'list-1',
      name: 'Item 1',
      total_count: 0
    }).execute();

    // Create vote with negative count (edge case)
    await db.insert(tallyVotesTable).values({
      id: 'vote-1',
      item_id: 'item-1',
      user_session_id: 'user-123',
      count: -1
    }).execute();

    const result = await getUserVotes('list-1', 'user-123');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      item_id: 'item-1',
      user_count: -1
    });
  });
});