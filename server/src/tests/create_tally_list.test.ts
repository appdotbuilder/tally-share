import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tallyListsTable } from '../db/schema';
import { type CreateTallyListInput } from '../schema';
import { createTallyList } from '../handlers/create_tally_list';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateTallyListInput = {
  title: 'My Test Tally List'
};

describe('createTallyList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a tally list with unique ID', async () => {
    const result = await createTallyList(testInput);

    // Basic field validation
    expect(result.title).toEqual('My Test Tally List');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should generate unique UUIDs for different lists', async () => {
    const result1 = await createTallyList({ title: 'List 1' });
    const result2 = await createTallyList({ title: 'List 2' });

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
  });

  it('should save tally list to database', async () => {
    const result = await createTallyList(testInput);

    // Query using proper drizzle syntax
    const tallyLists = await db.select()
      .from(tallyListsTable)
      .where(eq(tallyListsTable.id, result.id))
      .execute();

    expect(tallyLists).toHaveLength(1);
    expect(tallyLists[0].title).toEqual('My Test Tally List');
    expect(tallyLists[0].id).toEqual(result.id);
    expect(tallyLists[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle special characters in title', async () => {
    const specialInput: CreateTallyListInput = {
      title: 'Test List with émojis 🎯 & special chars!'
    };

    const result = await createTallyList(specialInput);

    expect(result.title).toEqual('Test List with émojis 🎯 & special chars!');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify it was saved correctly to database
    const savedList = await db.select()
      .from(tallyListsTable)
      .where(eq(tallyListsTable.id, result.id))
      .execute();

    expect(savedList[0].title).toEqual('Test List with émojis 🎯 & special chars!');
  });

  it('should handle long titles', async () => {
    const longTitle = 'A'.repeat(1000); // Very long title
    const longInput: CreateTallyListInput = {
      title: longTitle
    };

    const result = await createTallyList(longInput);

    expect(result.title).toEqual(longTitle);
    expect(result.title.length).toEqual(1000);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create multiple lists with same title but different IDs', async () => {
    const sameTitle = 'Duplicate Title List';
    
    const result1 = await createTallyList({ title: sameTitle });
    const result2 = await createTallyList({ title: sameTitle });

    expect(result1.title).toEqual(sameTitle);
    expect(result2.title).toEqual(sameTitle);
    expect(result1.id).not.toEqual(result2.id);

    // Verify both are saved in database
    const allLists = await db.select()
      .from(tallyListsTable)
      .execute();

    const matchingLists = allLists.filter(list => list.title === sameTitle);
    expect(matchingLists).toHaveLength(2);
  });
});