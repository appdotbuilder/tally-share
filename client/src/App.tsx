import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import { SimpleTallyView } from '@/components/SimpleTallyView';
import type { TallyList } from '../../server/src/schema';

// Generate or retrieve user session ID for tracking individual contributions
function getUserSessionId(): string {
  try {
    const existing = localStorage.getItem('tally-user-session');
    if (existing) return existing;
    
    // Fallback UUID generation if crypto.randomUUID is not available
    const newSession = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'user-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
    
    localStorage.setItem('tally-user-session', newSession);
    return newSession;
  } catch (error) {
    console.error('Failed to generate user session ID:', error);
    // Return a fallback session ID
    return 'user-fallback-' + Date.now();
  }
}

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'list'>('home');
  const [currentListId, setCurrentListId] = useState<string>('');
  const [newListTitle, setNewListTitle] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [userSessionId] = useState<string>(getUserSessionId());

  // Handle URL routing
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/list/')) {
      const listId = path.split('/list/')[1];
      if (listId) {
        setCurrentListId(listId);
        setCurrentView('list');
      }
    }
  }, []);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    setIsCreatingList(true);
    try {
      const newList: TallyList = await trpc.createTallyList.mutate({
        title: newListTitle.trim()
      });
      
      // Update URL and navigate to the new list
      const newUrl = `/list/${newList.id}`;
      window.history.pushState({}, '', newUrl);
      setCurrentListId(newList.id);
      setCurrentView('list');
      setNewListTitle('');
    } catch (error) {
      console.error('Failed to create tally list:', error);
      alert('❌ Failed to create tally list. Please try again.');
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleGoHome = () => {
    window.history.pushState({}, '', '/');
    setCurrentView('home');
    setCurrentListId('');
  };

  // Show tally list view if we're on a list page
  if (currentView === 'list' && currentListId) {
    return (
      <SimpleTallyView 
        listId={currentListId} 
        userSessionId={userSessionId}
        onGoHome={handleGoHome}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">📊 Tally Together</h1>
          <p className="text-lg text-gray-600">
            Create shareable tally lists for collaborative counting
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Session ID: {userSessionId}
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ➕ Create New Tally List
            </CardTitle>
            <CardDescription>
              Start a new tally list that you can share with others to count things together
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateList} className="space-y-4">
              <Input
                placeholder="Enter list title (e.g., 'Party RSVP', 'Feature Requests')"
                value={newListTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setNewListTitle(e.target.value)
                }
                maxLength={100}
                required
                className="text-lg"
              />
              <Button 
                type="submit" 
                disabled={isCreatingList || !newListTitle.trim()}
                className="w-full text-lg py-6"
              >
                {isCreatingList ? '✨ Creating...' : '🚀 Create & Share List'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 space-y-6">
          <div className="text-center text-gray-500">
            <p className="text-sm">
              💡 Once created, you'll get a unique shareable URL that anyone can use to view and contribute to your tally list
            </p>
          </div>
          
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🌟 Perfect for...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  🎉 <span>Event planning & RSVPs</span>
                </div>
                <div className="flex items-center gap-2">
                  📊 <span>Feature voting & feedback</span>
                </div>
                <div className="flex items-center gap-2">
                  🍕 <span>Group food orders</span>
                </div>
                <div className="flex items-center gap-2">
                  📝 <span>Collaborative task lists</span>
                </div>
                <div className="flex items-center gap-2">
                  🎯 <span>Poll responses & surveys</span>
                </div>
                <div className="flex items-center gap-2">
                  📚 <span>Book club preferences</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;