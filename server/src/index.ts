import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createListInputSchema,
  getListInputSchema,
  createItemInputSchema,
  incrementItemInputSchema,
  decrementItemInputSchema,
  removeItemInputSchema
} from './schema';

// Import handlers
import { createList } from './handlers/create_list';
import { getList } from './handlers/get_list';
import { createItem } from './handlers/create_item';
import { incrementItem } from './handlers/increment_item';
import { decrementItem } from './handlers/decrement_item';
import { removeItem } from './handlers/remove_item';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // List operations
  createList: publicProcedure
    .input(createListInputSchema)
    .mutation(({ input }) => createList(input)),

  getList: publicProcedure
    .input(getListInputSchema)
    .query(({ input }) => getList(input)),

  // Item operations
  createItem: publicProcedure
    .input(createItemInputSchema)
    .mutation(({ input }) => createItem(input)),

  incrementItem: publicProcedure
    .input(incrementItemInputSchema)
    .mutation(({ input }) => incrementItem(input)),

  decrementItem: publicProcedure
    .input(decrementItemInputSchema)
    .mutation(({ input }) => decrementItem(input)),

  removeItem: publicProcedure
    .input(removeItemInputSchema)
    .mutation(({ input }) => removeItem(input)),
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