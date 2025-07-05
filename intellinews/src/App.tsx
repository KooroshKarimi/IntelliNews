import React, { useState, useEffect, useCallback } from 'react';
import { Article, AppConfiguration, Feed, Topic } from './types';
import { ArticleCard } from './components/ArticleCard';
import { FeedManager } from './components/FeedManager';
import { TopicManager } from './components/TopicManager';
import { loadConfiguration, saveConfiguration, generateId } from './utils/storage';
import { parseFeed, removeDuplicates, matchTopics } from './utils/feedParser';
import { translateArticle } from './utils/aiService';
import { ToastContainer } from './components/ToastContainer';

function App() {
  const [configuration, setConfiguration] = useState<AppConfiguration>(loadConfiguration());
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'articles' | 'feeds' | 'topics'>('articles');
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const pendingRef = React.useRef(false);

  // Save configuration whenever it changes
  useEffect(() => {
    saveConfiguration(configuration);
  }, [configuration]);

  // Load articles from feeds
  const loadArticles = useCallback(async () => {
    // Verhindern, dass mehrere gleichzeitige Ladevorgänge gestartet werden
    if (loading) {
      pendingRef.current = true;
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const allArticles: Article[] = [];
      const updatedFeeds = [...configuration.feeds];

      for (const feed of configuration.feeds) {
        try {
          let feedArticles = await parseFeed(feed);

          // If feed language is not German, translate title and summary
          if (feed.language !== 'de') {
            feedArticles = await Promise.all(
              feedArticles.map(async (article) => {
                try {
                  const { translatedTitle, translatedSummary } = await translateArticle(article, feed.language);
                  return {
                    ...article,
                    translatedTitle,
                    translatedSummary,
                    aiEnhanced: true,
                  };
                } catch (err) {
                  // Show toast for failed AI enrichment
                  addToast('KI-Anreicherung für einen Artikel fehlgeschlagen.');
                  return article;
                }
              })
            );
          }

          allArticles.push(...feedArticles);
          
          // Clear any previous errors for this feed
          const feedIndex = updatedFeeds.findIndex(f => f.id === feed.id);
          if (feedIndex !== -1) {
            delete updatedFeeds[feedIndex].lastError;
            delete updatedFeeds[feedIndex].lastErrorTime;
          }
        } catch (err: unknown) {
          // Ensure we always have a string message
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Error loading feed ${feed.name}:`, message);

          // Update feed with error information
          const feedIndex = updatedFeeds.findIndex(f => f.id === feed.id);
          if (feedIndex !== -1) {
            updatedFeeds[feedIndex].lastError = message;
            updatedFeeds[feedIndex].lastErrorTime = new Date().toISOString();
          }
        }
      }

      // Update feeds with error status nur wenn sich etwas geändert hat
      const feedsChanged = JSON.stringify(updatedFeeds) !== JSON.stringify(configuration.feeds);
      if (feedsChanged) {
        setConfiguration(prev => ({ ...prev, feeds: updatedFeeds }));
      }

      // Remove duplicates
      const uniqueArticles = removeDuplicates(allArticles);

      // Match topics to articles
      const articlesWithTopics = uniqueArticles.map(article => ({
        ...article,
        topics: matchTopics(article, configuration.topics)
      }));

      // Sort by publication date (newest first)
      articlesWithTopics.sort((a, b) => 
        new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime()
      );

      setArticles(articlesWithTopics);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
      setError(message);
    } finally {
      setLoading(false);
      if (pendingRef.current) {
        pendingRef.current = false;
        // Load again for pending changes
        loadArticles();
      }
    }
  }, [configuration.feeds, configuration.topics, loading]);

  // Load articles on mount and when feeds change
  useEffect(() => {
    if (configuration.feeds.length > 0 && !loading) {
      loadArticles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuration.feeds]);

  // Reload articles when topics change (to update topic matching)
  useEffect(() => {
    if (articles.length > 0 && configuration.feeds.length > 0 && !loading) {
      loadArticles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuration.topics]);

  // Filter articles by selected topic
  const filteredArticles = selectedTopic
    ? articles.filter(article => article.topics.includes(selectedTopic))
    : articles;

  // Helper to add toast messages
  const addToast = (message: string) => {
    const id = generateId();
    setToasts((prev: { id: string; message: string }[]) => [...prev, { id, message }]);
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts((prev: { id: string; message: string }[]) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

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
                  {configuration.topics.map(topic => (
                    <option key={topic.id} value={topic.name}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => loadArticles()}
                disabled={loading}
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
                    : 'Keine Artikel gefunden. Klicken Sie auf "Artikel aktualisieren".'}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'feeds' && (
          <FeedManager
            feeds={configuration.feeds}
            onFeedsChange={(feeds: Feed[]) =>
              setConfiguration({ ...configuration, feeds })
            }
          />
        )}

        {activeTab === 'topics' && (
          <TopicManager
            topics={configuration.topics}
            onTopicsChange={(topics: Topic[]) =>
              setConfiguration({ ...configuration, topics })
            }
          />
        )}
      </main>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;
