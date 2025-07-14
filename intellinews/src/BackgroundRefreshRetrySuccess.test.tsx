import * as React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';
import { Article, Feed, AppConfiguration } from './types';

jest.mock('./utils/apiService', () => {
  const initialArticles: Article[] = [
    {
      id: 'a1',
      link: 'http://example.com/a1',
      originalTitle: 'Old',
      originalSummary: 'Old summary',
      sourceFeedName: 'Feed',
      publicationDate: '2020-01-01T00:00:00Z',
      processedDate: '2020-01-01T00:00:00Z',
      topics: [],
      aiEnhanced: false
    }
  ];

  const newArticles: Article[] = [
    {
      id: 'a2',
      link: 'http://example.com/a2',
      originalTitle: 'New',
      originalSummary: 'New summary',
      sourceFeedName: 'Feed',
      publicationDate: '2020-01-02T00:00:00Z',
      processedDate: '2020-01-02T00:00:00Z',
      topics: [],
      aiEnhanced: false
    }
  ];

  let callIndex = 0;
  function getArticles() {
    if (callIndex === 0) {
      callIndex++;
      return Promise.resolve(initialArticles);
    }
    if (callIndex === 1 || callIndex === 2) {
      callIndex++;
      return Promise.reject(new Error('Temporary error'));
    }
    return Promise.resolve(newArticles);
  }

  return {
    apiService: {
      getConfiguration: jest.fn((): Promise<AppConfiguration> => {
        const feeds: Feed[] = [{ id: 'f1', name: 'Feed', url: 'http://feed', language: 'de' }];
        return Promise.resolve({ feeds, topics: [] });
      }),
      saveConfiguration: jest.fn(() => Promise.resolve()),
      getArticles: jest.fn(getArticles),
      addFeed: jest.fn(),
      deleteFeed: jest.fn(),
      addTopic: jest.fn(),
      deleteTopic: jest.fn(),
      parseFeed: jest.fn(),
      healthCheck: jest.fn()
    }
  };
});

describe('Background refresh retries until success', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('eventually updates the article list after temporary failures', async () => {
    render(<App />);

    // old article visible
    await waitFor(() => {
      expect(screen.getByText('Old')).toBeInTheDocument();
    });

    // trigger background refresh at 60s
    await act(async () => {
      jest.advanceTimersByTime(60000);
      await Promise.resolve();
    });

    // advance retries (1s, 2s)
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // after success, new article should appear
    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    // spinner off
    expect(screen.queryByRole('status', { name: 'refreshing' })).not.toBeInTheDocument();
  });
});