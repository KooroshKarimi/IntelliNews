import * as React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';
import { Article, Feed, AppConfiguration } from './types';

// Mock apiService for error scenario
jest.mock('./utils/apiService', () => {
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

  let callCounter = 0;

  return {
    apiService: {
      getConfiguration: jest.fn<Promise<AppConfiguration>, []>(() => {
        const feeds: Feed[] = [
          { id: 'f1', name: 'Feed', url: 'http://feed', language: 'de' }
        ];
        return Promise.resolve({ feeds, topics: [] });
      }),
      saveConfiguration: jest.fn(() => Promise.resolve()),
      getArticles: jest.fn<Promise<Article[]>, []>(() => {
        if (callCounter === 0) {
          callCounter += 1;
          return Promise.resolve(initialArticles);
        }
        return Promise.reject(new Error('Network error'));
      }),
      addFeed: jest.fn(),
      deleteFeed: jest.fn(),
      addTopic: jest.fn(),
      deleteTopic: jest.fn(),
      parseFeed: jest.fn(),
      healthCheck: jest.fn()
    }
  };
});

describe('Background refresh error handling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('shows toast and hides spinner when background refresh fails', async () => {
    render(<App />);

    // Wait for initial article
    await waitFor(() => {
      expect(screen.getByText('Title 1')).toBeInTheDocument();
    });

    // Trigger background refresh
    await act(async () => {
      jest.advanceTimersByTime(60000);
      await Promise.resolve();
    });

    // Spinner should appear briefly
    expect(screen.getByRole('status', { name: 'refreshing' })).toBeInTheDocument();

    // Wait for spinner to disappear after error handled
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'refreshing' })).not.toBeInTheDocument();
    });

    // Toast with error message should appear
    await waitFor(() => {
      expect(screen.getByText('Artikel konnten nicht geladen werden')).toBeInTheDocument();
    });
  });
});