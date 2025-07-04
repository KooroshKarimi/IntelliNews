import React, { useState } from 'react';
import { Feed } from '../types';
import { generateId } from '../utils/storage';

interface FeedManagerProps {
  feeds: Feed[];
  onFeedsChange: (feeds: Feed[]) => void;
}

export const FeedManager: React.FC<FeedManagerProps> = ({ feeds, onFeedsChange }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newFeed, setNewFeed] = useState<Partial<Feed>>({
    name: '',
    url: '',
    language: 'de'
  });

  const handleAddFeed = () => {
    if (newFeed.name && newFeed.url) {
      const feed: Feed = {
        id: generateId(),
        name: newFeed.name,
        url: newFeed.url,
        language: newFeed.language || 'de'
      };
      onFeedsChange([...feeds, feed]);
      setNewFeed({ name: '', url: '', language: 'de' });
      setIsAdding(false);
    }
  };

  const handleDeleteFeed = (id: string) => {
    onFeedsChange(feeds.filter(feed => feed.id !== id));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">RSS Feeds</h2>
      
      <div className="space-y-3 mb-4">
        {feeds.map(feed => (
          <div key={feed.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold">{feed.name}</h3>
              <p className="text-sm text-gray-600 truncate">{feed.url}</p>
              <span className="text-xs text-gray-500">Sprache: {feed.language}</span>
              {feed.lastError && (
                <div className="mt-1 text-xs text-red-600">
                  <span className="font-semibold">Fehler:</span> {feed.lastError}
                  {feed.lastErrorTime && (
                    <span className="block text-gray-500">
                      Seit: {new Date(feed.lastErrorTime).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
            {feed.lastError && (
              <div className="mx-3 text-red-600" title={`Fehler: ${feed.lastError}`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <button
              onClick={() => handleDeleteFeed(feed.id)}
              className="ml-3 text-red-600 hover:text-red-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {isAdding ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <input
            type="text"
            placeholder="Feed Name"
            value={newFeed.name || ''}
            onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
            className="w-full p-2 mb-2 border rounded"
          />
          <input
            type="url"
            placeholder="Feed URL"
            value={newFeed.url || ''}
            onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
            className="w-full p-2 mb-2 border rounded"
          />
          <select
            value={newFeed.language || 'de'}
            onChange={(e) => setNewFeed({ ...newFeed, language: e.target.value as 'de' | 'en' | 'other' })}
            className="w-full p-2 mb-2 border rounded"
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
            <option value="other">Andere</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleAddFeed}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Hinzufügen
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewFeed({ name: '', url: '', language: 'de' });
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
        >
          + Feed hinzufügen
        </button>
      )}
    </div>
  );
};