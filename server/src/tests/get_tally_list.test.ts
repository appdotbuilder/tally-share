import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tallyListsTable, tallyItemsTable } from '../db/schema';
import { getTallyList } from '../handlers/get_tally_list';

describe('getTallyList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when list does not exist', async () => {
    const result = await getTallyList('non-existent-id');
    expect(result).toBeNull();
  });

  it('should return tally list with empty items array when no items exist', async () => {
    // Create a tally list without items
    await db.insert(tallyListsTable)
      .values({
        id: 'list-1',
        title: 'Empty List',
      })
      .execute();

    const result = await getTallyList('list-1');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('list-1');
    expect(result!.title).toEqual('Empty List');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.items).toEqual([]);
  });

  it('should return tally list with all its items', async () => {
    // Create a tally list
    await db.insert(tallyListsTable)
      .values({
        id: 'list-2',
        title: 'Shopping List',
      })
      .execute();

    // Create multiple items for this list
    await db.insert(tallyItemsTable)
      .values([
        {
          id: 'item-1',
          list_id: 'list-2',
          name: 'Apples',
          total_count: 5,
        },
        {
          id: 'item-2',
          list_id: 'list-2',
          name: 'Bananas',
          total_count: 3,
        },
        {
          id: 'item-3',
          list_id: 'list-2',
          name: 'Oranges',
          total_count: 0,
        },
      ])
      .execute();

    const result = await getTallyList('list-2');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('list-2');
    expect(result!.title).toEqual('Shopping List');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.items).toHaveLength(3);

    // Check first item
    const apples = result!.items.find(item => item.name === 'Apples');
    expect(apples).toBeDefined();
    expect(apples!.id).toEqual('item-1');
    expect(apples!.list_id).toEqual('list-2');
    expect(apples!.total_count).toEqual(5);
    expect(apples!.created_at).toBeInstanceOf(Date);

    // Check second item
    const bananas = result!.items.find(item => item.name === 'Bananas');
    expect(bananas).toBeDefined();
    expect(bananas!.id).toEqual('item-2');
    expect(bananas!.total_count).toEqual(3);

    // Check third item with zero count
    const oranges = result!.items.find(item => item.name === 'Oranges');
    expect(oranges).toBeDefined();
    expect(oranges!.id).toEqual('item-3');
    expect(oranges!.total_count).toEqual(0);
  });

  it('should not return items from other lists', async () => {
    // Create two tally lists
    await db.insert(tallyListsTable)
      .values([
        {
          id: 'list-3',
          title: 'List A',
        },
        {
          id: 'list-4',
          title: 'List B',
        },
      ])
      .execute();

    // Create items for both lists
    await db.insert(tallyItemsTable)
      .values([
        {
          id: 'item-a1',
          list_id: 'list-3',
          name: 'Item A1',
          total_count: 1,
        },
        {
          id: 'item-a2',
          list_id: 'list-3',
          name: 'Item A2',
          total_count: 2,
        },
        {
          id: 'item-b1',
          list_id: 'list-4',
          name: 'Item B1',
          total_count: 10,
        },
      ])
      .execute();

    const resultA = await getTallyList('list-3');
    const resultB = await getTallyList('list-4');

    // List A should only contain items A1 and A2
    expect(resultA).not.toBeNull();
    expect(resultA!.items).toHaveLength(2);
    expect(resultA!.items.some(item => item.name === 'Item A1')).toBe(true);
    expect(resultA!.items.some(item => item.name === 'Item A2')).toBe(true);
    expect(resultA!.items.some(item => item.name === 'Item B1')).toBe(false);

    // List B should only contain item B1
    expect(resultB).not.toBeNull();
    expect(resultB!.items).toHaveLength(1);
    expect(resultB!.items.some(item => item.name === 'Item B1')).toBe(true);
    expect(resultB!.items.some(item => item.name.startsWith('Item A'))).toBe(false);
  });

  it('should handle items with various total_count values correctly', async () => {
    // Create a tally list
    await db.insert(tallyListsTable)
      .values({
        id: 'list-5',
        title: 'Count Test List',
      })
      .execute();

    // Create items with different count values
    await db.insert(tallyItemsTable)
      .values([
        {
          id: 'item-zero',
          list_id: 'list-5',
          name: 'Zero Count',
          total_count: 0,
        },
        {
          id: 'item-positive',
          list_id: 'list-5',
          name: 'Positive Count',
          total_count: 42,
        },
        {
          id: 'item-large',
          list_id: 'list-5',
          name: 'Large Count',
          total_count: 1000,
        },
      ])
      .execute();

    const result = await getTallyList('list-5');

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(3);

    // Verify all count values are preserved correctly
    const zeroItem = result!.items.find(item => item.name === 'Zero Count');
    expect(zeroItem!.total_count).toEqual(0);
    expect(typeof zeroItem!.total_count).toBe('number');

    const positiveItem = result!.items.find(item => item.name === 'Positive Count');
    expect(positiveItem!.total_count).toEqual(42);
    expect(typeof positiveItem!.total_count).toBe('number');

    const largeItem = result!.items.find(item => item.name === 'Large Count');
    expect(largeItem!.total_count).toEqual(1000);
    expect(typeof largeItem!.total_count).toBe('number');
  });
});