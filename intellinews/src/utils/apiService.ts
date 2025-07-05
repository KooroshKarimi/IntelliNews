import { AppConfiguration, Feed, Topic, Article } from '../types';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8080/api' : '/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // Configuration endpoints
  async getConfiguration(): Promise<AppConfiguration> {
    try {
      return await this.request<AppConfiguration>('/config');
    } catch (error) {
      console.error('Failed to load configuration from API, using defaults:', error);
      return this.getDefaultConfiguration();
    }
  }

  async saveConfiguration(config: AppConfiguration): Promise<void> {
    await this.request('/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // Feed endpoints
  async getFeeds(): Promise<Feed[]> {
    return await this.request<Feed[]>('/feeds');
  }

  async addFeed(feed: Omit<Feed, 'id'>): Promise<Feed> {
    return await this.request<Feed>('/feeds', {
      method: 'POST',
      body: JSON.stringify(feed),
    });
  }

  async deleteFeed(id: string): Promise<void> {
    await this.request(`/feeds/${id}`, {
      method: 'DELETE',
    });
  }

  // Topic endpoints
  async getTopics(): Promise<Topic[]> {
    return await this.request<Topic[]>('/topics');
  }

  async addTopic(topic: Omit<Topic, 'id'>): Promise<Topic> {
    return await this.request<Topic>('/topics', {
      method: 'POST',
      body: JSON.stringify(topic),
    });
  }

  async deleteTopic(id: string): Promise<void> {
    await this.request(`/topics/${id}`, {
      method: 'DELETE',
    });
  }

  // Article endpoints
  async getArticles(topic?: string, limit?: number): Promise<Article[]> {
    const params = new URLSearchParams();
    if (topic) params.append('topic', topic);
    if (limit) params.append('limit', limit.toString());
    
    const queryString = params.toString();
    const endpoint = `/articles${queryString ? `?${queryString}` : ''}`;
    
    return await this.request<Article[]>(endpoint);
  }

  // Legacy RSS feed endpoint (still used for immediate parsing)
  async parseFeed(url: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/feed?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error(`Feed parsing failed: ${response.status}`);
    }
    return await response.json();
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; version: string; aiProvider: string }> {
    return await this.request<{ status: string; timestamp: string; version: string; aiProvider: string }>('/health');
  }

  // Default configuration (fallback)
  private getDefaultConfiguration(): AppConfiguration {
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
}

export const apiService = new ApiService();
export default apiService;