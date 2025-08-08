import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { TallyListWithItems, TallyItem, UserVoteCount } from '../../../server/src/schema';

interface SimpleTallyViewProps {
  listId: string;
  userSessionId: string;
  onGoHome: () => void;
}

export function SimpleTallyView({ listId, userSessionId, onGoHome }: SimpleTallyViewProps) {
  const [tallyList, setTallyList] = useState<TallyListWithItems | null>(null);
  const [userVotes, setUserVotes] = useState<UserVoteCount[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Load tally list data
  const loadTallyList = useCallback(async () => {
    try {
      const list = await trpc.getTallyList.query({ listId });
      if (!list) {
        setError('Tally list not found');
        return;
      }
      setTallyList(list);
    } catch (error) {
      console.error('Failed to load tally list:', error);
      setError('Failed to load tally list');
    }
  }, [listId]);

  // Load user's vote counts
  const loadUserVotes = useCallback(async () => {
    try {
      const votes = await trpc.getUserVotes.query({ listId, userSessionId });
      setUserVotes(votes);
    } catch (error) {
      console.error('Failed to load user votes:', error);
    }
  }, [listId, userSessionId]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadTallyList(), loadUserVotes()]);
      setIsLoading(false);
    };
    loadData();
  }, [loadTallyList, loadUserVotes]);

  // Get user's vote count for a specific item
  const getUserVoteCount = (itemId: string): number => {
    const userVote = userVotes.find((vote: UserVoteCount) => vote.item_id === itemId);
    return userVote ? userVote.user_count : 0;
  };

  // Add new item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      await trpc.createTallyItem.mutate({
        list_id: listId,
        name: newItemName.trim()
      });
      setNewItemName('');
      await loadTallyList();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('❌ Failed to add item. Please try again.');
    }
  };

  // Vote on item (increment or decrement)
  const handleVote = async (itemId: string, delta: 1 | -1) => {
    try {
      await trpc.voteOnItem.mutate({
        item_id: itemId,
        user_session_id: userSessionId,
        delta
      });
      await Promise.all([loadTallyList(), loadUserVotes()]);
    } catch (error) {
      console.error('Failed to vote:', error);
      alert('❌ Failed to vote. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-2xl">⏳ Loading tally list...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <Card className="text-center">
            <CardContent className="pt-8">
              <div className="text-2xl mb-4">❌ {error}</div>
              <Button onClick={onGoHome}>🏠 Go Home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!tallyList) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pt-4">
        {/* Header */}
        <div className="mb-6">
          <Button variant="outline" onClick={onGoHome} className="mb-4">
            🏠 Go Home
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{tallyList.title}</h1>
          <p className="text-gray-600">
            Created {tallyList.created_at.toLocaleDateString()} • {tallyList.items.length} items
          </p>
        </div>

        {/* Add new item form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>➕ Add New Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddItem} className="flex gap-2">
              <Input
                placeholder="Enter item name..."
                value={newItemName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setNewItemName(e.target.value)
                }
                className="flex-1"
                required
              />
              <Button type="submit">Add</Button>
            </form>
          </CardContent>
        </Card>

        {/* Items list */}
        <div className="space-y-4">
          {tallyList.items.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  No items yet. Add the first item above!
                </p>
              </CardContent>
            </Card>
          ) : (
            tallyList.items.map((item: TallyItem) => {
              const userCount = getUserVoteCount(item.id);
              const canDecrement = userCount > 0;

              return (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">
                            Total: {item.total_count}
                          </Badge>
                          {userCount > 0 && (
                            <Badge variant="outline">
                              Your votes: {userCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => handleVote(item.id, -1)}
                          disabled={!canDecrement}
                          variant="outline"
                          size="sm"
                        >
                          ➖
                        </Button>
                        <Button
                          onClick={() => handleVote(item.id, 1)}
                          variant="default"
                          size="sm"
                        >
                          ➕
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}