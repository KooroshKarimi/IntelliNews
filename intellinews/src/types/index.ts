// Data models based on the specification

export interface Article {
  id: string; // URL of the article
  link: string;
  originalTitle: string;
  originalSummary: string;
  originalContent?: string;
  translatedTitle?: string;
  translatedSummary?: string;
  originalLanguage?: 'de' | 'en' | 'other';
  sourceFeedName: string;
  publicationDate: string; // ISO 8601
  processedDate: string; // ISO 8601
  topics: string[];
  seriousnessScore?: number; // 1-10
  imageUrl?: string;
  imageGenerated?: boolean;
  aiEnhanced: boolean;
}

export interface Feed {
  id: string; // UUID
  name: string;
  url: string;
  language: 'de' | 'en' | 'other';
  lastError?: string;
  lastErrorTime?: string;
}

export interface Topic {
  id: string; // UUID
  name: string;
  keywords: string[];
  excludeKeywords?: string[];
}

export interface AppConfiguration {
  feeds: Feed[];
  topics: Topic[];
}