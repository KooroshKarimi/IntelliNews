import { AppConfiguration } from '../types';

const STORAGE_KEY = 'intellinews-config';

// Load configuration from localStorage
export function loadConfiguration(): AppConfiguration {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Return default configuration
  return {
    feeds: [
      {
        id: '1',
        name: 'Heise Online',
        url: 'https://www.heise.de/rss/heise-atom.xml',
        language: 'de'
      },
      {
        id: '2', 
        name: 'BBC Technology',
        url: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
        language: 'en'
      }
    ],
    topics: [
      {
        id: '1',
        name: 'Künstliche Intelligenz',
        keywords: ['KI', 'AI', 'künstliche intelligenz', 'artificial intelligence', 'machine learning', 'deep learning'],
        excludeKeywords: []
      },
      {
        id: '2',
        name: 'Cybersecurity',
        keywords: ['security', 'hack', 'cyber', 'datenschutz', 'privacy', 'breach'],
        excludeKeywords: []
      }
    ]
  };
}

// Save configuration to localStorage
export function saveConfiguration(config: AppConfiguration): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// Generate a simple UUID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}