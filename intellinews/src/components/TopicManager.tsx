import React, { useState } from 'react';
import { Topic } from '../types';
import { generateId } from '../utils/storage';

interface TopicManagerProps {
  topics: Topic[];
  onTopicsChange: (topics: Topic[]) => void;
}

export const TopicManager: React.FC<TopicManagerProps> = ({ topics, onTopicsChange }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTopic, setNewTopic] = useState<Partial<Topic>>({
    name: '',
    keywords: [],
    excludeKeywords: []
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [excludeKeywordInput, setExcludeKeywordInput] = useState('');

  const handleAddTopic = () => {
    if (newTopic.name && newTopic.keywords && newTopic.keywords.length > 0) {
      const topic: Topic = {
        id: generateId(),
        name: newTopic.name,
        keywords: newTopic.keywords,
        excludeKeywords: newTopic.excludeKeywords || []
      };
      onTopicsChange([...topics, topic]);
      setNewTopic({ name: '', keywords: [], excludeKeywords: [] });
      setIsAdding(false);
    }
  };

  const handleDeleteTopic = (id: string) => {
    onTopicsChange(topics.filter(topic => topic.id !== id));
  };

  const handleAddKeyword = (isExclude: boolean = false) => {
    const input = isExclude ? excludeKeywordInput : keywordInput;
    if (input.trim()) {
      if (isExclude) {
        setNewTopic({
          ...newTopic,
          excludeKeywords: [...(newTopic.excludeKeywords || []), input.trim()]
        });
        setExcludeKeywordInput('');
      } else {
        setNewTopic({
          ...newTopic,
          keywords: [...(newTopic.keywords || []), input.trim()]
        });
        setKeywordInput('');
      }
    }
  };

  const handleRemoveKeyword = (keyword: string, isExclude: boolean = false) => {
    if (isExclude) {
      setNewTopic({
        ...newTopic,
        excludeKeywords: newTopic.excludeKeywords?.filter(k => k !== keyword) || []
      });
    } else {
      setNewTopic({
        ...newTopic,
        keywords: newTopic.keywords?.filter(k => k !== keyword) || []
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Themen</h2>
      
      <div className="space-y-3 mb-4">
        {topics.map(topic => (
          <div key={topic.id} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold mb-2">{topic.name}</h3>
                <div className="mb-2">
                  <span className="text-sm text-gray-600">Schlüsselwörter: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {topic.keywords.map((keyword, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                {topic.excludeKeywords && topic.excludeKeywords.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">Ausschluss-Schlüsselwörter: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {topic.excludeKeywords.map((keyword, index) => (
                        <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDeleteTopic(topic.id)}
                className="ml-3 text-red-600 hover:text-red-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAdding ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <input
            type="text"
            placeholder="Themenname"
            value={newTopic.name || ''}
            onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
            className="w-full p-2 mb-3 border rounded"
          />
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Schlüsselwörter</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Schlüsselwort hinzufügen"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={() => handleAddKeyword()}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {newTopic.keywords?.map((keyword, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded flex items-center">
                  {keyword}
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ausschluss-Schlüsselwörter (optional)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Ausschluss-Schlüsselwort hinzufügen"
                value={excludeKeywordInput}
                onChange={(e) => setExcludeKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword(true)}
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={() => handleAddKeyword(true)}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {newTopic.excludeKeywords?.map((keyword, index) => (
                <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded flex items-center">
                  {keyword}
                  <button
                    onClick={() => handleRemoveKeyword(keyword, true)}
                    className="ml-1 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddTopic}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={!newTopic.name || !newTopic.keywords || newTopic.keywords.length === 0}
            >
              Hinzufügen
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewTopic({ name: '', keywords: [], excludeKeywords: [] });
                setKeywordInput('');
                setExcludeKeywordInput('');
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
          + Thema hinzufügen
        </button>
      )}
    </div>
  );
};