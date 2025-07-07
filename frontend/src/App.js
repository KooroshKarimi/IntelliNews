import React, { useState, useEffect, useCallback, useRef } from 'react';

// Loading Spinner Component
const LoadingSpinner = ({ size = 20, inline = false }) => (
  <div style={{
    display: inline ? 'inline-flex' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: inline ? '10px' : '0'
  }}>
    <div style={{
      width: size,
      height: size,
      border: '2px solid #e3f2fd',
      borderTop: '2px solid #2196f3',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

// Article Card Component
const ArticleCard = ({ article, onMarkAsRead, onToggleFavorite }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
    opacity: article.isRead ? 0.7 : 1,
    transition: 'all 0.3s ease'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px'
    }}>
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        lineHeight: '1.3'
      }}>
        {article.title}
      </h3>
      <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
        <button
          onClick={() => onToggleFavorite(article.id, !article.isFavorite)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: article.isFavorite ? '#ff6b6b' : '#ccc'
          }}
        >
          ♥
        </button>
        <button
          onClick={() => onMarkAsRead(article.id, !article.isRead)}
          style={{
            background: article.isRead ? '#4caf50' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {article.isRead ? 'Gelesen' : 'Als gelesen markieren'}
        </button>
      </div>
    </div>
    
    <p style={{
      margin: '0 0 12px 0',
      color: '#666',
      lineHeight: '1.4',
      fontSize: '14px'
    }}>
      {article.summary}
    </p>
    
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '12px',
      color: '#888'
    }}>
      <span>{article.sourceName}</span>
      <div style={{ display: 'flex', gap: '16px' }}>
        <span>Thema: {article.topic}</span>
        <span>Relevanz: {article.seriousnessScore}/10</span>
        <span>{new Date(article.publishedAt).toLocaleDateString('de-DE')}</span>
      </div>
    </div>
    
    {article.url && (
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          marginTop: '12px',
          color: '#2196f3',
          textDecoration: 'none',
          fontSize: '14px'
        }}
      >
        Vollständigen Artikel lesen →
      </a>
    )}
  </div>
);

// Filter Component
const FilterBar = ({ filters, onFilterChange, onRefresh, isRefreshing }) => (
  <div style={{
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap'
  }}>
    <select
      value={filters.topic || ''}
      onChange={(e) => onFilterChange({ topic: e.target.value || undefined })}
      style={{
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        fontSize: '14px'
      }}
    >
      <option value="">Alle Themen</option>
      <option value="Politik">Politik</option>
      <option value="Wirtschaft">Wirtschaft</option>
      <option value="Technologie">Technologie</option>
      <option value="Sport">Sport</option>
      <option value="Wissenschaft">Wissenschaft</option>
    </select>
    
    <select
      value={filters.isRead || ''}
      onChange={(e) => onFilterChange({ isRead: e.target.value || undefined })}
      style={{
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        fontSize: '14px'
      }}
    >
      <option value="">Alle Artikel</option>
      <option value="false">Ungelesen</option>
      <option value="true">Gelesen</option>
    </select>
    
    <input
      type="range"
      min="1"
      max="10"
      value={filters.seriousnessMin || 1}
      onChange={(e) => onFilterChange({ seriousnessMin: e.target.value })}
      style={{ marginLeft: '8px' }}
    />
    <span style={{ fontSize: '14px', color: '#666' }}>
      Min. Relevanz: {filters.seriousnessMin || 1}
    </span>
    
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      style={{
        marginLeft: 'auto',
        padding: '8px 16px',
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: isRefreshing ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        opacity: isRefreshing ? 0.7 : 1
      }}
    >
      Aktualisieren
      {isRefreshing && <LoadingSpinner size={16} inline />}
    </button>
  </div>
);

// Main App Component
function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    limit: 20,
    offset: 0,
    seriousnessMin: 1
  });
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState(null);
  
  const refreshIntervalRef = useRef();

  // Fetch articles from API
  const fetchArticles = useCallback(async (newFilters = {}, append = false) => {
    try {
      const queryParams = new URLSearchParams({
        ...filters,
        ...newFilters,
        offset: append ? articles.length : 0
      });
      
      const response = await fetch(`/api/articles?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch articles');
      
      const data = await response.json();
      
      if (append) {
        setArticles(prev => [...prev, ...data]);
        setHasMore(data.length === (newFilters.limit || filters.limit));
      } else {
        setArticles(data);
        setHasMore(data.length === (newFilters.limit || filters.limit));
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching articles:', err);
    }
  }, [filters, articles.length]);

  // Trigger feed processing
  const triggerProcessing = useCallback(async () => {
    try {
      setProcessing(true);
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to trigger processing');
      
      // Wait a bit and then refresh articles
      setTimeout(() => {
        fetchArticles({}, false);
        setProcessing(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  }, [fetchArticles]);

  // Fetch system stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // Mark article as read
  const markAsRead = useCallback(async (articleId, isRead) => {
    try {
      const response = await fetch(`/api/articles/${articleId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead })
      });
      
      if (response.ok) {
        setArticles(prev => prev.map(article => 
          article.id === articleId ? { ...article, isRead } : article
        ));
      }
    } catch (err) {
      console.error('Error updating article:', err);
    }
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (articleId, isFavorite) => {
    try {
      const response = await fetch(`/api/articles/${articleId}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite })
      });
      
      if (response.ok) {
        setArticles(prev => prev.map(article => 
          article.id === articleId ? { ...article, isFavorite } : article
        ));
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    const updatedFilters = { ...filters, ...newFilters, offset: 0 };
    setFilters(updatedFilters);
    setLoading(true);
    fetchArticles(updatedFilters, false).finally(() => setLoading(false));
  }, [filters, fetchArticles]);

  // Refresh articles
  const refreshArticles = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchArticles({}, false),
      fetchStats()
    ]).finally(() => setRefreshing(false));
  }, [fetchArticles, fetchStats]);

  // Load more articles
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchArticles({}, true);
    }
  }, [loading, hasMore, fetchArticles]);

  // Initial load
  useEffect(() => {
    Promise.all([
      fetchArticles(),
      fetchStats()
    ]).finally(() => setLoading(false));
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      if (!loading && !refreshing) {
        fetchArticles({}, false);
        fetchStats();
      }
    }, 5 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [loading, refreshing, fetchArticles, fetchStats]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#2196f3',
        color: 'white',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '28px' }}>📰 IntelliNews</h1>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {stats && (
              <div style={{ fontSize: '14px', textAlign: 'right' }}>
                <div>{stats.totalArticles} Artikel</div>
                <div>{stats.totalFeeds} Feeds aktiv</div>
              </div>
            )}
            
            <button
              onClick={triggerProcessing}
              disabled={processing}
              style={{
                padding: '10px 20px',
                backgroundColor: processing ? '#666' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: processing ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              Neue Nachrichten suchen
              {processing && <LoadingSpinner size={16} inline />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onRefresh={refreshArticles}
          isRefreshing={refreshing}
        />

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #ef5350'
          }}>
            Fehler: {error}
          </div>
        )}

        {/* Loading State */}
        {loading && !refreshing && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <LoadingSpinner size={40} />
            <p style={{ marginTop: '16px', color: '#666' }}>
              Nachrichten werden geladen...
            </p>
          </div>
        )}

        {/* Articles List */}
        {!loading && articles.length > 0 && (
          <>
            <div>
              {articles.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onMarkAsRead={markAsRead}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  onClick={loadMore}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#2196f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Weitere Artikel laden
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && articles.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '18px', color: '#666', margin: 0 }}>
              Keine Artikel gefunden. Versuchen Sie, neue Nachrichten zu suchen oder die Filter zu ändern.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;