import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tallyListsTable, tallyItemsTable } from '../db/schema';
import { type CreateTallyItemInput } from '../schema';
import { createTallyItem } from '../handlers/create_tally_item';
import { eq } from 'drizzle-orm';

describe('createTallyItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a tally item in an existing list', async () => {
    // First create a tally list
    const listId = crypto.randomUUID();
    await db.insert(tallyListsTable)
      .values({
        id: listId,
        title: 'Test List'
      })
      .execute();

    const testInput: CreateTallyItemInput = {
      list_id: listId,
      name: 'Test Item'
    };

    const result = await createTallyItem(testInput);

    // Verify the returned item
    expect(result.name).toEqual('Test Item');
    expect(result.list_id).toEqual(listId);
    expect(result.total_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save the item to database correctly', async () => {
    // Create prerequisite tally list
    const listId = crypto.randomUUID();
    await db.insert(tallyListsTable)
      .values({
        id: listId,
        title: 'Database Test List'
      })
      .execute();

    const testInput: CreateTallyItemInput = {
      list_id: listId,
      name: 'Database Test Item'
    };

    const result = await createTallyItem(testInput);

    // Query the database to verify the item was saved
    const items = await db.select()
      .from(tallyItemsTable)
      .where(eq(tallyItemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toEqual('Database Test Item');
    expect(items[0].list_id).toEqual(listId);
    expect(items[0].total_count).toEqual(0);
    expect(items[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when list does not exist', async () => {
    const nonExistentListId = crypto.randomUUID();

    const testInput: CreateTallyItemInput = {
      list_id: nonExistentListId,
      name: 'Item for Non-existent List'
    };

    await expect(createTallyItem(testInput)).rejects.toThrow(
      /Tally list with id .+ not found/i
    );
  });

  it('should create multiple items in the same list', async () => {
    // Create a tally list
    const listId = crypto.randomUUID();
    await db.insert(tallyListsTable)
      .values({
        id: listId,
        title: 'Multi-Item Test List'
      })
      .execute();

    // Create first item
    const firstItem = await createTallyItem({
      list_id: listId,
      name: 'First Item'
    });

    // Create second item
    const secondItem = await createTallyItem({
      list_id: listId,
      name: 'Second Item'
    });

    // Verify both items exist
    expect(firstItem.id).not.toEqual(secondItem.id);
    expect(firstItem.list_id).toEqual(listId);
    expect(secondItem.list_id).toEqual(listId);

    // Verify both items are in the database
    const allItems = await db.select()
      .from(tallyItemsTable)
      .where(eq(tallyItemsTable.list_id, listId))
      .execute();

    expect(allItems).toHaveLength(2);
    expect(allItems.map(item => item.name)).toContain('First Item');
    expect(allItems.map(item => item.name)).toContain('Second Item');
  });

  it('should generate unique IDs for each item', async () => {
    // Create a tally list
    const listId = crypto.randomUUID();
    await db.insert(tallyListsTable)
      .values({
        id: listId,
        title: 'Unique ID Test List'
      })
      .execute();

    const testInput: CreateTallyItemInput = {
      list_id: listId,
      name: 'ID Test Item'
    };

    // Create multiple items with the same input
    const item1 = await createTallyItem(testInput);
    const item2 = await createTallyItem(testInput);
    const item3 = await createTallyItem(testInput);

    // All IDs should be unique
    const ids = [item1.id, item2.id, item3.id];
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toEqual(3);

    // All should be valid UUIDs (basic format check)
    ids.forEach(id => {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });
});