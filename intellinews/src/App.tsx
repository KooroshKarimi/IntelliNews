import React, { useState, useEffect } from 'react';
import { Article, Feed, Topic, AppConfiguration } from './types';
import { ArticleCard } from './components/ArticleCard';
import { FeedManager } from './components/FeedManager';
import { TopicManager } from './components/TopicManager';
import { loadConfiguration, saveConfiguration } from './utils/storage';
import { parseFeed, removeDuplicates, matchTopics } from './utils/feedParser';

function App() {
  const [configuration, setConfiguration] = useState<AppConfiguration>(loadConfiguration());
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'articles' | 'feeds' | 'topics'>('articles');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Save configuration whenever it changes
  useEffect(() => {
    saveConfiguration(configuration);
  }, [configuration]);

  // Load articles from feeds
  const loadArticles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allArticles: Article[] = [];
      const updatedFeeds = [...configuration.feeds];

      for (const feed of configuration.feeds) {
        try {
          const feedArticles = await parseFeed(feed);
          allArticles.push(...feedArticles);
          
          // Clear any previous errors for this feed
          const feedIndex = updatedFeeds.findIndex(f => f.id === feed.id);
          if (feedIndex !== -1) {
            delete updatedFeeds[feedIndex].lastError;
            delete updatedFeeds[feedIndex].lastErrorTime;
          }
        } catch (err) {
          console.error(`Error loading feed ${feed.name}:`, err);
          
          // Update feed with error information
          const feedIndex = updatedFeeds.findIndex(f => f.id === feed.id);
          if (feedIndex !== -1) {
            updatedFeeds[feedIndex].lastError = err instanceof Error ? err.message : 'Unknown error';
            updatedFeeds[feedIndex].lastErrorTime = new Date().toISOString();
          }
        }
      }

      // Update feeds with error status
      setConfiguration(prev => ({ ...prev, feeds: updatedFeeds }));

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  // Load articles on mount and when feeds change
  useEffect(() => {
    if (configuration.feeds.length > 0) {
      loadArticles();
    }
  }, [configuration.feeds]);

  // Filter articles by selected topic
  const filteredArticles = selectedTopic
    ? articles.filter(article => article.topics.includes(selectedTopic))
    : articles;

  return (
    <div className="min-h-screen bg-gray-100">
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
                  onChange={(e) => setSelectedTopic(e.target.value || null)}
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
                onClick={loadArticles}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Lädt...' : 'Artikel aktualisieren'}
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {loading ? (
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
            onFeedsChange={(feeds) => setConfiguration({ ...configuration, feeds })}
          />
        )}

        {activeTab === 'topics' && (
          <TopicManager
            topics={configuration.topics}
            onTopicsChange={(topics) => setConfiguration({ ...configuration, topics })}
          />
        )}
      </main>
    </div>
  );
}

export default App;
