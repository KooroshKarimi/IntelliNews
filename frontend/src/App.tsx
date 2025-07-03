import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useLocalStorage } from './hooks/useLocalStorage'
import { matchesTopics, deduplicateArticles } from './utils/articles'
import { fetchFeedArticles } from './api/fetchFeed'
import type { Feed as FeedType, Article as ArticleType } from './api/fetchFeed'
import type { Topic } from './utils/articles'

function App() {
  const [feeds, setFeeds] = useLocalStorage<FeedType[]>('feeds', [])
  const [topics, setTopics] = useLocalStorage<Topic[]>('topics', [])
  const [articles, setArticles] = useState<ArticleType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // local state for forms
  const [newFeedName, setNewFeedName] = useState('')
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicKeywords, setNewTopicKeywords] = useState('')
  const [newTopicExclude, setNewTopicExclude] = useState('')

  const fetchAll = async () => {
    if (feeds.length === 0) return
    setLoading(true)
    const all: ArticleType[] = []
    for (const feed of feeds) {
      try {
        const feedArticles = await fetchFeedArticles(feed)
        all.push(...feedArticles)
      } catch (err) {
        console.error(err)
        setError(`Failed to load feed "${feed.name}"`)
      }
    }
    const deduped = deduplicateArticles(all, 0.9)
    const filtered = deduped.filter((a) => matchesTopics(a, topics))
    filtered.sort(
      (a, b) =>
        new Date(b.publicationDate).getTime() -
        new Date(a.publicationDate).getTime(),
    )
    setArticles(filtered)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeds, topics])

  const addFeed = () => {
    if (!newFeedUrl.trim()) return
    const exists = feeds.some((f) => f.url === newFeedUrl.trim())
    if (exists) {
      setError('Feed already exists')
      return
    }
    setFeeds([
      ...feeds,
      { id: uuidv4(), name: newFeedName || newFeedUrl, url: newFeedUrl },
    ])
    setNewFeedName('')
    setNewFeedUrl('')
  }

  const removeFeed = (id: string) => {
    setFeeds(feeds.filter((f) => f.id !== id))
  }

  const addTopic = () => {
    if (!newTopicName.trim() || !newTopicKeywords.trim()) return
    const keywords = newTopicKeywords.split(',').map((k) => k.trim())
    const excludeKeywords = newTopicExclude
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    setTopics([
      ...topics,
      { id: uuidv4(), name: newTopicName, keywords, excludeKeywords },
    ])
    setNewTopicName('')
    setNewTopicKeywords('')
    setNewTopicExclude('')
  }

  const removeTopic = (id: string) => {
    setTopics(topics.filter((t) => t.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-4">
      {error && (
        <div className="mb-4 rounded bg-red-100 text-red-800 p-2 flex justify-between items-start">
          <span>{error}</span>
          <button className="ml-4" onClick={() => setError(null)}>✕</button>
        </div>
      )}
      <h1 className="text-3xl font-bold mb-4">IntelliNews — Feed Reader (0.3)</h1>

      {/* Feed management */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Feeds</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="border p-2 flex-1"
            placeholder="Feed name (optional)"
            value={newFeedName}
            onChange={(e) => setNewFeedName(e.target.value)}
          />
          <input
            type="url"
            className="border p-2 flex-1"
            placeholder="Feed URL"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={addFeed}
          >
            Add
          </button>
        </div>
        <ul className="list-disc list-inside">
          {feeds.map((f) => (
            <li key={f.id} className="flex items-center gap-2">
              <span className="flex-1 truncate">{f.name}</span>
              <button
                className="text-red-600"
                onClick={() => removeFeed(f.id)}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Topic management */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Topics (Keyword Filter)</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="border p-2 flex-1"
            placeholder="Topic name"
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
          />
          <input
            type="text"
            className="border p-2 flex-1"
            placeholder="Keywords (comma separated)"
            value={newTopicKeywords}
            onChange={(e) => setNewTopicKeywords(e.target.value)}
          />
          <input
            type="text"
            className="border p-2 flex-1"
            placeholder="Exclude keywords (optional)"
            value={newTopicExclude}
            onChange={(e) => setNewTopicExclude(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={addTopic}
          >
            Add
          </button>
        </div>
        <ul className="list-disc list-inside">
          {topics.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <span className="flex-1 truncate">{t.name}</span>
              <button
                className="text-red-600"
                onClick={() => removeTopic(t.id)}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Articles */}
      <section>
        <div className="flex items-center mb-2 gap-2">
          <h2 className="text-xl font-semibold flex-1">Articles</h2>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={fetchAll}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <div data-testid="loading" className="text-gray-600">Loading…</div>
        ) : articles.length === 0 ? (
          <p>No articles found.</p>
        ) : (
          <ul className="space-y-4">
            {articles.map((a) => (
              <li key={a.id} className="bg-white p-4 rounded shadow">
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-blue-700 hover:underline"
                >
                  {a.title}
                </a>
                <p className="text-sm text-gray-500">
                  {a.feedName} – {new Date(a.publicationDate).toLocaleString()}
                </p>
                {a.summary && (
                  <p className="mt-2 text-gray-700 line-clamp-3">
                    {a.summary.replace(/<[^>]+>/g, '') /* strip html */}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
