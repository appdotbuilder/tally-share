import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createTallyListInputSchema, 
  createTallyItemInputSchema, 
  voteInputSchema, 
  removeItemInputSchema 
} from './schema';

// Import handlers
import { createTallyList } from './handlers/create_tally_list';
import { getTallyList } from './handlers/get_tally_list';
import { createTallyItem } from './handlers/create_tally_item';
import { voteOnItem } from './handlers/vote_on_item';
import { removeTallyItem } from './handlers/remove_tally_item';
import { getUserVotes } from './handlers/get_user_votes';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Create a new tally list
  createTallyList: publicProcedure
    .input(createTallyListInputSchema)
    .mutation(({ input }) => createTallyList(input)),

  // Get a tally list by ID with all its items
  getTallyList: publicProcedure
    .input(z.object({ listId: z.string() }))
    .query(({ input }) => getTallyList(input.listId)),

  // Add a new item to a tally list
  createTallyItem: publicProcedure
    .input(createTallyItemInputSchema)
    .mutation(({ input }) => createTallyItem(input)),

  // Vote on an item (increment or decrement)
  voteOnItem: publicProcedure
    .input(voteInputSchema)
    .mutation(({ input }) => voteOnItem(input)),

  // Remove an item (only if total count is 0)
  removeTallyItem: publicProcedure
    .input(removeItemInputSchema)
    .mutation(({ input }) => removeTallyItem(input)),

  // Get user's vote counts for all items in a list
  getUserVotes: publicProcedure
    .input(z.object({ 
      listId: z.string(), 
      userSessionId: z.string() 
    }))
    .query(({ input }) => getUserVotes(input.listId, input.userSessionId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();