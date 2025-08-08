import { db } from '../db';
import { tallyListsTable } from '../db/schema';
import { type CreateTallyListInput, type TallyList } from '../schema';

export const createTallyList = async (input: CreateTallyListInput): Promise<TallyList> => {
  try {
    const listId = crypto.randomUUID(); // Generate unique ID for shareable URL
    
    // Insert tally list record
    const result = await db.insert(tallyListsTable)
      .values({
        id: listId,
        title: input.title
      })
      .returning()
      .execute();

    const tallyList = result[0];
    return {
      ...tallyList,
      created_at: new Date(tallyList.created_at)
    };
  } catch (error) {
    console.error('Tally list creation failed:', error);
    throw error;
  }
};