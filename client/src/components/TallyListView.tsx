import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { TallyListWithItems, TallyItem, UserVoteCount } from '../../../server/src/schema';

interface TallyListViewProps {
  listId: string;
  userSessionId: string;
  onGoHome: () => void;
}

export function TallyListView({ listId, userSessionId, onGoHome }: TallyListViewProps) {
  const [tallyList, setTallyList] = useState<TallyListWithItems | null>(null);
  const [userVotes, setUserVotes] = useState<UserVoteCount[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [votingItems, setVotingItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Load tally list data
  const loadTallyList = useCallback(async () => {
    try {
      const list = await trpc.getTallyList.query({ listId });
      if (!list) {
        setError('Tally list not found');
        return;
      }
      setTallyList(list);
      setLastUpdateTime(new Date());
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

  // Initial load and periodic refresh for real-time updates
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadTallyList(), loadUserVotes()]);
      setIsLoading(false);
    };
    loadData();

    // Set up polling for real-time updates (every 3 seconds)
    const interval = setInterval(async () => {
      // Only refresh if not currently adding an item
      if (!isAddingItem) {
        await Promise.all([loadTallyList(), loadUserVotes()]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [loadTallyList, loadUserVotes, isAddingItem]);

  // Get user's vote count for a specific item
  const getUserVoteCount = (itemId: string): number => {
    const userVote = userVotes.find((vote: UserVoteCount) => vote.item_id === itemId);
    return userVote ? userVote.user_count : 0;
  };

  // Add new item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsAddingItem(true);
    try {
      await trpc.createTallyItem.mutate({
        list_id: listId,
        name: newItemName.trim()
      });
      setNewItemName('');
      // Reload data to show the new item
      await loadTallyList();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('❌ Failed to add item. Please try again.');
    } finally {
      setIsAddingItem(false);
    }
  };

  // Vote on item (increment or decrement)
  const handleVote = async (itemId: string, delta: 1 | -1) => {
    setVotingItems((prev: Set<string>) => new Set([...prev, itemId]));
    try {
      await trpc.voteOnItem.mutate({
        item_id: itemId,
        user_session_id: userSessionId,
        delta
      });
      // Reload data to show updated counts
      await Promise.all([loadTallyList(), loadUserVotes()]);
    } catch (error) {
      console.error('Failed to vote:', error);
      alert('❌ Failed to vote. Please try again.');
    } finally {
      setVotingItems((prev: Set<string>) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // Remove item (only if total count is 0)
  const handleRemoveItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      try {
        await trpc.removeTallyItem.mutate({ item_id: itemId });
        await loadTallyList();
      } catch (error) {
        console.error('Failed to remove item:', error);
        alert('❌ Failed to remove item. Please try again.');
      }
    }
  };

  // Copy shareable URL to clipboard
  const handleCopyUrl = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      alert('✅ Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      alert('Failed to copy link');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="text-center">
            <div className="text-2xl">⏳ Loading tally list...</div>
          </div>
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
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" onClick={onGoHome} className="flex items-center gap-2">
              🏠 Home
            </Button>
            <Button onClick={handleCopyUrl} className="flex items-center gap-2">
              🔗 Share List
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{tallyList.title}</h1>
          <div className="flex items-center gap-4 text-gray-600">
            <span>Created {tallyList.created_at.toLocaleDateString()}</span>
            <span>•</span>
            <span>{tallyList.items.length} items</span>
            <span>•</span>
            <span className="text-sm flex items-center gap-1">
              🔄 Last updated: {lastUpdateTime.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Add new item form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ➕ Add New Item
            </CardTitle>
            <CardDescription>
              Add a new item that everyone can vote on
            </CardDescription>
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
                maxLength={100}
                required
              />
              <Button 
                type="submit" 
                disabled={isAddingItem || !newItemName.trim()}
              >
                {isAddingItem ? '⏳' : '➕'} Add
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Items list */}
        <div className="space-y-4">
          {tallyList.items.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-500 text-lg">
                  No items yet. Add the first item above to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            tallyList.items.map((item: TallyItem) => {
              const userCount = getUserVoteCount(item.id);
              const canDecrement = userCount > 0;
              const canRemove = item.total_count === 0;
              const isVoting = votingItems.has(item.id);

              return (
                <Card key={item.id} className={`transition-all duration-200 hover:shadow-md ${canRemove ? 'border-red-200 bg-red-50/30' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {item.name}
                          </h3>
                          {canRemove && (
                            <Badge variant="destructive" className="text-xs">
                              Can be removed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            📊 Total: {item.total_count}
                          </Badge>
                          {userCount > 0 && (
                            <Badge variant="outline" className="text-sm">
                              👤 Your votes: {userCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => handleVote(item.id, -1)}
                          disabled={!canDecrement || isVoting}
                          variant="outline"
                          size="sm"
                          className="text-lg px-3 hover-lift"
                          title={canDecrement ? 'Remove one of your votes' : 'You have no votes to remove'}
                        >
                          {isVoting ? '⏳' : '➖'}
                        </Button>
                        <Button
                          onClick={() => handleVote(item.id, 1)}
                          disabled={isVoting}
                          variant="default"
                          size="sm"
                          className="text-lg px-3 hover-lift"
                          title="Add your vote to this item"
                        >
                          {isVoting ? '⏳' : '➕'}
                        </Button>
                        {canRemove && (
                          <>
                            <Separator orientation="vertical" className="h-6 mx-1" />
                            <Button
                              onClick={() => handleRemoveItem(item.id)}
                              variant="destructive"
                              size="sm"
                              className="text-sm px-3 hover-lift"
                              title="Remove this item (only available when total count is 0)"
                            >
                              🗑️
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center text-gray-500 border-t pt-6">
          <p className="text-sm">
            💡 <strong>How it works:</strong> Click ➕ to add your vote, ➖ to remove only your own votes. 
            Items with zero total votes can be removed by anyone.
          </p>
        </div>
      </div>
    </div>
  );
}