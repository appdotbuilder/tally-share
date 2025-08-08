import { db } from '../db';
import { tallyItemsTable, tallyListsTable } from '../db/schema';
import { type CreateTallyItemInput, type TallyItem } from '../schema';
import { eq } from 'drizzle-orm';

export async function createTallyItem(input: CreateTallyItemInput): Promise<TallyItem> {
  try {
    // First, validate that the list exists
    const existingList = await db.select()
      .from(tallyListsTable)
      .where(eq(tallyListsTable.id, input.list_id))
      .execute();

    if (existingList.length === 0) {
      throw new Error(`Tally list with id ${input.list_id} not found`);
    }

    // Generate unique ID for the new item
    const itemId = crypto.randomUUID();

    // Insert the new tally item
    const result = await db.insert(tallyItemsTable)
      .values({
        id: itemId,
        list_id: input.list_id,
        name: input.name,
        total_count: 0 // New items start with total_count of 0
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Tally item creation failed:', error);
    throw error;
  }
}