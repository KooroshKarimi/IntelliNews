import * as React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';
import { Article, Feed, AppConfiguration } from './types';

// Mock apiService module
jest.mock('./utils/apiService', () => {
  // Prepare mock data that will be mutated inside tests
  const initialArticles: Article[] = [
    {
      id: 'a1',
      link: 'http://example.com/a1',
      originalTitle: 'Title 1',
      originalSummary: 'Summary 1',
      sourceFeedName: 'Feed',
      publicationDate: '2020-01-01T00:00:00Z',
      processedDate: '2020-01-01T00:00:00Z',
      topics: [],
      aiEnhanced: false
    }
  ];

  const nextArticles: Article[] = [
    {
      id: 'a2',
      link: 'http://example.com/a2',
      originalTitle: 'Title 2',
      originalSummary: 'Summary 2',
      sourceFeedName: 'Feed',
      publicationDate: '2020-01-02T00:00:00Z',
      processedDate: '2020-01-02T00:00:00Z',
      topics: [],
      aiEnhanced: false
    }
  ];

  // Mock implementations
  let callCounter = 0;
  return {
    apiService: {
      getConfiguration: jest.fn((): Promise<AppConfiguration> => {
        const feeds: Feed[] = [
          {
            id: 'f1',
            name: 'Feed',
            url: 'http://feed',
            language: 'de'
          }
        ];
        return Promise.resolve({ feeds, topics: [] });
      }),
      saveConfiguration: jest.fn(() => Promise.resolve()),
      getArticles: jest.fn((): Promise<Article[]> => {
        // Return initial articles on first call, next articles afterwards
        const data = callCounter === 0 ? initialArticles : nextArticles;
        callCounter += 1;
        return Promise.resolve(data);
      }),
      // Provide empty mocks for unrelated endpoints
      addFeed: jest.fn(),
      deleteFeed: jest.fn(),
      addTopic: jest.fn(),
      deleteTopic: jest.fn(),
      parseFeed: jest.fn(),
      healthCheck: jest.fn()
    }
  };
});

describe('Background refresh behaviour', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('updates article list after periodic background refresh without blocking UI', async () => {
    render(<App />);

    // Initial load should show first article
    await waitFor(() => {
      expect(screen.getByText('Title 1')).toBeInTheDocument();
    });

    // No second article yet
    expect(screen.queryByText('Title 2')).not.toBeInTheDocument();

    // Advance timers to trigger background refresh (60 000 ms)
    await act(async () => {
      jest.advanceTimersByTime(60000);
      // Wait for any pending promises to resolve
      await Promise.resolve();
    });

    // Spinner should appear during refresh
    expect(screen.getByRole('status', { name: 'refreshing' })).toBeInTheDocument();

    // Wait for refresh to finish and article list to update
    await waitFor(() => {
      expect(screen.getByText('Title 2')).toBeInTheDocument();
    });

    // Spinner should disappear after refresh completes
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'refreshing' })).not.toBeInTheDocument();
    });
  });
});
