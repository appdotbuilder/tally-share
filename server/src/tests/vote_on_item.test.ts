import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tallyListsTable, tallyItemsTable, tallyVotesTable } from '../db/schema';
import { type VoteInput } from '../schema';
import { voteOnItem } from '../handlers/vote_on_item';
import { eq, and } from 'drizzle-orm';

// Test data
const testListId = 'test-list-id';
const testItemId = 'test-item-id';
const testUserId = 'test-user-session-id';
const anotherUserId = 'another-user-session-id';

describe('voteOnItem', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite data
    await db.insert(tallyListsTable).values({
      id: testListId,
      title: 'Test List'
    }).execute();

    await db.insert(tallyItemsTable).values({
      id: testItemId,
      list_id: testListId,
      name: 'Test Item',
      total_count: 0
    }).execute();
  });

  afterEach(resetDB);

  describe('increment voting', () => {
    it('should create first vote for new user', async () => {
      const input: VoteInput = {
        item_id: testItemId,
        user_session_id: testUserId,
        delta: 1
      };

      const result = await voteOnItem(input);

      expect(result.id).toEqual(testItemId);
      expect(result.name).toEqual('Test Item');
      expect(result.total_count).toEqual(1);

      // Verify vote record was created
      const votes = await db.select()
        .from(tallyVotesTable)
        .where(and(
          eq(tallyVotesTable.item_id, testItemId),
          eq(tallyVotesTable.user_session_id, testUserId)
        ))
        .execute();

      expect(votes).toHaveLength(1);
      expect(votes[0].count).toEqual(1);
      expect(votes[0].item_id).toEqual(testItemId);
      expect(votes[0].user_session_id).toEqual(testUserId);
    });

    it('should increment existing user vote', async () => {
      // Create initial vote
      await db.insert(tallyVotesTable).values({
        id: crypto.randomUUID(),
        item_id: testItemId,
        user_session_id: testUserId,
        count: 2
      }).execute();

      await db.update(tallyItemsTable)
        .set({ total_count: 2 })
        .where(eq(tallyItemsTable.id, testItemId))
        .execute();

      const input: VoteInput = {
        item_id: testItemId,
        user_session_id: testUserId,
        delta: 1
      };

      const result = await voteOnItem(input);

      expect(result.total_count).toEqual(3);

      // Verify vote record was updated
      const votes = await db.select()
        .from(tallyVotesTable)
        .where(and(
          eq(tallyVotesTable.item_id, testItemId),
          eq(tallyVotesTable.user_session_id, testUserId)
        ))
        .execute();

      expect(votes).toHaveLength(1);
      expect(votes[0].count).toEqual(3);
    });

    it('should handle multiple users voting', async () => {
      // First user votes
      const input1: VoteInput = {
        item_id: testItemId,
        user_session_id: testUserId,
        delta: 1
      };

      await voteOnItem(input1);

      // Second user votes
      const input2: VoteInput = {
        item_id: testItemId,
        user_session_id: anotherUserId,
        delta: 1
      };

      const result = await voteOnItem(input2);

      expect(result.total_count).toEqual(2);

      // Verify both vote records exist
      const allVotes = await db.select()
        .from(tallyVotesTable)
        .where(eq(tallyVotesTable.item_id, testItemId))
        .execute();

      expect(allVotes).toHaveLength(2);
      
      const userVotes = allVotes.filter(v => v.user_session_id === testUserId);
      const anotherUserVotes = allVotes.filter(v => v.user_session_id === anotherUserId);
      
      expect(userVotes).toHaveLength(1);
      expect(userVotes[0].count).toEqual(1);
      expect(anotherUserVotes).toHaveLength(1);
      expect(anotherUserVotes[0].count).toEqual(1);
    });
  });

  describe('decrement voting', () => {
    it('should decrement existing user vote', async () => {
      // Create initial vote with count 3
      await db.insert(tallyVotesTable).values({
        id: crypto.randomUUID(),
        item_id: testItemId,
        user_session_id: testUserId,
        count: 3
      }).execute();

      await db.update(tallyItemsTable)
        .set({ total_count: 3 })
        .where(eq(tallyItemsTable.id, testItemId))
        .execute();

      const input: VoteInput = {
        item_id: testItemId,
        user_session_id: testUserId,
        delta: -1
      };

      const result = await voteOnItem(input);

      expect(result.total_count).toEqual(2);

      // Verify vote record was updated
      const votes = await db.select()
        .from(tallyVotesTable)
        .where(and(
          eq(tallyVotesTable.item_id, testItemId),
          eq(tallyVotesTable.user_session_id, testUserId)
        ))
        .execute();

      expect(votes).toHaveLength(1);
      expect(votes[0].count).toEqual(2);
    });

    it('should prevent decrement when user has no votes', async () => {
      const input: VoteInput = {
        item_id: testItemId,
        user_session_id: testUserId,
        delta: -1
      };

      await expect(voteOnItem(input)).rejects.toThrow(/cannot decrement.*no votes/i);

      // Verify no vote record was created
      const votes = await db.select()
        .from(tallyVotesTable)
        .where(eq(tallyVotesTable.item_id, testItemId))
        .execute();

      expect(votes).toHaveLength(0);
    });

    it('should prevent decrement when user count is zero', async () => {
      // Create vote record with zero count
      await db.insert(tallyVotesTable).values({
        id: crypto.randomUUID(),
        item_id: testItemId,
        user_session_id: testUserId,
        count: 0
      }).execute();

      const input: VoteInput = {
        item_id: testItemId,
        user_session_id: testUserId,
        delta: -1
      };

      await expect(voteOnItem(input)).rejects.toThrow(/cannot decrement.*no votes/i);

      // Verify vote count remains zero
      const votes = await db.select()
        .from(tallyVotesTable)
        .where(and(
          eq(tallyVotesTable.item_id, testItemId),
          eq(tallyVotesTable.user_session_id, testUserId)
        ))
        .execute();

      expect(votes).toHaveLength(1);
      expect(votes[0].count).toEqual(0);
    });

    it('should handle mixed user votes correctly', async () => {
      // User 1 has 3 votes
      await db.insert(tallyVotesTable).values({
        id: crypto.randomUUID(),
        item_id: testItemId,
        user_session_id: testUserId,
        count: 3
      }).execute();

      // User 2 has 2 votes
      await db.insert(tallyVotesTable).values({
        id: crypto.randomUUID(),
        item_id: testItemId,
        user_session_id: anotherUserId,
        count: 2
      }).execute();

      await db.update(tallyItemsTable)
        .set({ total_count: 5 })
        .where(eq(tallyItemsTable.id, testItemId))
        .execute();

      // User 1 decrements their vote
      const input: VoteInput = {
        item_id: testItemId,
        user_session_id: testUserId,
        delta: -1
      };

      const result = await voteOnItem(input);

      expect(result.total_count).toEqual(4); // 2 (user1) + 2 (user2)

      // Verify individual vote counts
      const user1Votes = await db.select()
        .from(tallyVotesTable)
        .where(and(
          eq(tallyVotesTable.item_id, testItemId),
          eq(tallyVotesTable.user_session_id, testUserId)
        ))
        .execute();

      const user2Votes = await db.select()
        .from(tallyVotesTable)
        .where(and(
          eq(tallyVotesTable.item_id, testItemId),
          eq(tallyVotesTable.user_session_id, anotherUserId)
        ))
        .execute();

      expect(user1Votes[0].count).toEqual(2);
      expect(user2Votes[0].count).toEqual(2);
    });
  });

  describe('error cases', () => {
    it('should throw error for non-existent item', async () => {
      const input: VoteInput = {
        item_id: 'non-existent-item-id',
        user_session_id: testUserId,
        delta: 1
      };

      await expect(voteOnItem(input)).rejects.toThrow(/item.*not found/i);
    });

    it('should update updated_at timestamp on vote update', async () => {
      // Create initial vote
      const initialTime = new Date('2023-01-01');
      await db.insert(tallyVotesTable).values({
        id: crypto.randomUUID(),
        item_id: testItemId,
        user_session_id: testUserId,
        count: 1,
        created_at: initialTime,
        updated_at: initialTime
      }).execute();

      const input: VoteInput = {
        item_id: testItemId,
        user_session_id: testUserId,
        delta: 1
      };

      await voteOnItem(input);

      // Verify updated_at was changed
      const votes = await db.select()
        .from(tallyVotesTable)
        .where(and(
          eq(tallyVotesTable.item_id, testItemId),
          eq(tallyVotesTable.user_session_id, testUserId)
        ))
        .execute();

      expect(votes[0].updated_at > initialTime).toBe(true);
      expect(votes[0].created_at).toEqual(initialTime); // Should remain unchanged
    });
  });

  describe('total count calculation', () => {
    it('should correctly calculate total when some users have zero votes', async () => {
      // User 1: 3 votes
      await db.insert(tallyVotesTable).values({
        id: crypto.randomUUID(),
        item_id: testItemId,
        user_session_id: testUserId,
        count: 3
      }).execute();

      // User 2: 0 votes (decremented to zero)
      await db.insert(tallyVotesTable).values({
        id: crypto.randomUUID(),
        item_id: testItemId,
        user_session_id: anotherUserId,
        count: 0
      }).execute();

      // User 3 votes for first time
      const input: VoteInput = {
        item_id: testItemId,
        user_session_id: 'third-user',
        delta: 1
      };

      const result = await voteOnItem(input);

      expect(result.total_count).toEqual(4); // 3 + 0 + 1
    });

    it('should handle total count of zero', async () => {
      // Create a vote record with zero count
      await db.insert(tallyVotesTable).values({
        id: crypto.randomUUID(),
        item_id: testItemId,
        user_session_id: testUserId,
        count: 1
      }).execute();

      await db.update(tallyItemsTable)
        .set({ total_count: 1 })
        .where(eq(tallyItemsTable.id, testItemId))
        .execute();

      // Decrement to zero
      const input: VoteInput = {
        item_id: testItemId,
        user_session_id: testUserId,
        delta: -1
      };

      const result = await voteOnItem(input);

      expect(result.total_count).toEqual(0);
    });
  });
});