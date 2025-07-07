import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Article, AppConfiguration, Feed, Topic } from './types';
import { ArticleCard } from './components/ArticleCard';
import { FeedManager } from './components/FeedManager';
import { TopicManager } from './components/TopicManager';
import { generateId } from './utils/storage';
import { apiService } from './utils/apiService';
import { ToastContainer, Toast } from './components/ToastContainer';

function App() {
  const [configuration, setConfiguration] = useState<AppConfiguration>({ feeds: [], topics: [] });
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  // Separate state for background refreshes so the main UI remains usable
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'articles' | 'feeds' | 'topics'>('articles');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Load configuration from API
  const loadConfiguration = useCallback(async () => {
    try {
      const config = await apiService.getConfiguration();
      setConfiguration(config);
    } catch (err) {
      console.error('Failed to load configuration:', err);
      addToast('Konfiguration konnte nicht geladen werden');
    }
  }, []);

  // Save configuration to API
  const saveConfiguration = useCallback(async (config: AppConfiguration) => {
    try {
      await apiService.saveConfiguration(config);
      setConfiguration(config);
    } catch (err) {
      console.error('Failed to save configuration:', err);
      addToast('Konfiguration konnte nicht gespeichert werden');
    }
  }, []);

  // Reusable loader that can run in foreground (initial/manual) or background (periodic) mode
  const loadArticles = useCallback(async (background: boolean = false) => {
    if (loading || refreshing) return;

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const articleData = await apiService.getArticles(selectedTopic || undefined, 100);
      setArticles(articleData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
      setError(message);
      addToast('Artikel konnten nicht geladen werden');
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [loading, refreshing, selectedTopic]);

  // Initial load
  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  // Load articles when configuration changes or on mount
  useEffect(() => {
    if (configuration.feeds.length > 0) {
      loadArticles();
    }
  }, [configuration.feeds, loadArticles]);

  // Periodic background refresh (e.g., every 60 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadArticles(true);
    }, 60000); // 1 Minute

    return () => clearInterval(intervalId);
  }, [loadArticles]);

  // Reload articles when selected topic changes
  useEffect(() => {
    if (configuration.feeds.length > 0) {
      loadArticles();
    }
  }, [selectedTopic, configuration.feeds, loadArticles]);

  // Helper to add toast messages
  const addToast = (message: string) => {
    const id = generateId();
    setToasts((prev: Toast[]) => [...prev, { id, message }]);
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts((prev: Toast[]) => prev.filter((t: Toast) => t.id !== id));
    }, 3000);
  };

  // Handle feed management
  const handleFeedsChange = async (feeds: Feed[]) => {
    await saveConfiguration({ ...configuration, feeds });
  };

  // Handle topic management
  const handleTopicsChange = async (topics: Topic[]) => {
    await saveConfiguration({ ...configuration, topics });
  };

  // Manual refresh function
  const handleRefresh = () => {
    loadArticles();
  };

  // Filter articles by selected topic (client-side for immediate response)
  const filteredArticles = selectedTopic
    ? articles.filter((article: Article) => article.topics.includes(selectedTopic))
    : articles;

  return (
    <div className="min-h-screen bg-yellow-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">IntelliNews</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('articles')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'articles' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Artikel
              </button>
              <button
                onClick={() => setActiveTab('feeds')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'feeds' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Feeds
              </button>
              <button
                onClick={() => setActiveTab('topics')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'topics' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Themen
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'articles' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-gray-700">Filter nach Thema:</label>
                <select
                  value={selectedTopic || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSelectedTopic(e.target.value || null)
                  }
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Alle Themen</option>
                  {configuration.topics.map((topic: Topic) => (
                    <option key={topic.id} value={topic.name}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Lädt...' : 'Artikel aktualisieren'}
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {loading && articles.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {configuration.feeds.length === 0 
                  ? 'Keine Feeds konfiguriert. Fügen Sie RSS-Feeds hinzu, um Artikel zu sehen.'
                  : selectedTopic 
                    ? `Keine Artikel für das Thema "${selectedTopic}" gefunden.`
                    : 'Keine Artikel gefunden. Das Backend verarbeitet möglicherweise noch die Feeds.'}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.map((article: Article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'feeds' && (
          <FeedManager
            feeds={configuration.feeds}
            onFeedsChange={handleFeedsChange}
          />
        )}

        {activeTab === 'topics' && (
          <TopicManager
            topics={configuration.topics}
            onTopicsChange={handleTopicsChange}
          />
        )}
      </main>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />

      {/* Small spinner that indicates background refresh without blocking UI */}
      {refreshing && (
        <div className="fixed top-4 right-4 z-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}

export default App;
