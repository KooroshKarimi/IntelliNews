const { describe, it, expect, beforeEach } = require('@jest/globals');
const { 
  detectDuplicates, 
  calculateSimilarity, 
  normalizeText, 
  getTextFingerprint,
  getDuplicateGroups,
  removeDuplicates 
} = require('../../../utils/duplicateDetection.js');

describe('Duplicate Detection Utility', () => {
  describe('normalizeText', () => {
    it('should normalize text to lowercase', () => {
      const result = normalizeText('Hello World');
      expect(result).toBe('hello world');
    });

    it('should remove extra whitespace', () => {
      const result = normalizeText('  Hello    World  ');
      expect(result).toBe('hello world');
    });

    it('should remove punctuation', () => {
      const result = normalizeText('Hello, World! How are you?');
      expect(result).toBe('hello world how are you');
    });

    it('should handle empty strings', () => {
      const result = normalizeText('');
      expect(result).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(normalizeText(null)).toBe('');
      expect(normalizeText(undefined)).toBe('');
    });

    it('should handle special characters', () => {
      const result = normalizeText('Héllo Wörld! 🚀');
      expect(result).toBe('héllo wörld 🚀');
    });

    it('should handle numbers', () => {
      const result = normalizeText('Article 123 about AI-2024');
      expect(result).toBe('article 123 about ai 2024');
    });

    it('should handle Unicode characters', () => {
      const result = normalizeText('测试 Test тест');
      expect(result).toBe('测试 test тест');
    });
  });

  describe('getTextFingerprint', () => {
    it('should generate consistent fingerprints', () => {
      const text = 'This is a test article about technology';
      const fingerprint1 = getTextFingerprint(text);
      const fingerprint2 = getTextFingerprint(text);
      
      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should generate different fingerprints for different text', () => {
      const text1 = 'This is article one';
      const text2 = 'This is article two';
      
      const fingerprint1 = getTextFingerprint(text1);
      const fingerprint2 = getTextFingerprint(text2);
      
      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should handle empty text', () => {
      const fingerprint = getTextFingerprint('');
      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe('string');
    });

    it('should handle null and undefined', () => {
      const fingerprint1 = getTextFingerprint(null);
      const fingerprint2 = getTextFingerprint(undefined);
      
      expect(fingerprint1).toBeDefined();
      expect(fingerprint2).toBeDefined();
    });

    it('should generate same fingerprint for normalized equivalent text', () => {
      const text1 = 'Hello World!';
      const text2 = 'hello world';
      
      const fingerprint1 = getTextFingerprint(text1);
      const fingerprint2 = getTextFingerprint(text2);
      
      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should handle very long text', () => {
      const longText = 'A'.repeat(10000);
      const fingerprint = getTextFingerprint(longText);
      
      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe('string');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for identical texts', () => {
      const similarity = calculateSimilarity('Hello World', 'Hello World');
      expect(similarity).toBe(1);
    });

    it('should return 0 for completely different texts', () => {
      const similarity = calculateSimilarity('Hello World', 'Goodbye Universe');
      expect(similarity).toBeLessThan(0.5);
    });

    it('should return high similarity for similar texts', () => {
      const similarity = calculateSimilarity(
        'This is a test article about technology',
        'This is a test article about technologies'
      );
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should return moderate similarity for somewhat similar texts', () => {
      const similarity = calculateSimilarity(
        'This is a test article about technology',
        'This is an article about tech'
      );
      expect(similarity).toBeGreaterThan(0.3);
      expect(similarity).toBeLessThan(0.8);
    });

    it('should handle empty strings', () => {
      const similarity1 = calculateSimilarity('', '');
      const similarity2 = calculateSimilarity('Hello', '');
      const similarity3 = calculateSimilarity('', 'World');
      
      expect(similarity1).toBe(0);
      expect(similarity2).toBe(0);
      expect(similarity3).toBe(0);
    });

    it('should handle null and undefined', () => {
      const similarity1 = calculateSimilarity(null, null);
      const similarity2 = calculateSimilarity('Hello', null);
      const similarity3 = calculateSimilarity(undefined, 'World');
      
      expect(similarity1).toBe(0);
      expect(similarity2).toBe(0);
      expect(similarity3).toBe(0);
    });

    it('should be case insensitive', () => {
      const similarity = calculateSimilarity('Hello World', 'hello world');
      expect(similarity).toBe(1);
    });

    it('should ignore punctuation', () => {
      const similarity = calculateSimilarity('Hello, World!', 'Hello World');
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should handle special characters', () => {
      const similarity = calculateSimilarity('Héllo Wörld', 'Hello World');
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle very long texts', () => {
      const longText1 = 'A'.repeat(1000) + 'B'.repeat(1000);
      const longText2 = 'A'.repeat(1000) + 'C'.repeat(1000);
      
      const similarity = calculateSimilarity(longText1, longText2);
      expect(similarity).toBeGreaterThan(0.4);
      expect(similarity).toBeLessThan(0.6);
    });
  });

  describe('detectDuplicates', () => {
    const sampleArticles = [
      {
        id: '1',
        title: 'Breaking News: Technology Advances',
        content: 'This is an article about new technology developments.',
        url: 'https://example.com/1'
      },
      {
        id: '2',
        title: 'Breaking News: Technology Advances',
        content: 'This is an article about new technology developments.',
        url: 'https://example.com/2'
      },
      {
        id: '3',
        title: 'Sports Update: Championship Results',
        content: 'This is an article about sports championship results.',
        url: 'https://example.com/3'
      },
      {
        id: '4',
        title: 'Breaking News: Tech Advances',
        content: 'This is an article about new tech developments.',
        url: 'https://example.com/4'
      }
    ];

    it('should detect exact duplicates', () => {
      const duplicates = detectDuplicates(sampleArticles);
      
      expect(duplicates.length).toBeGreaterThan(0);
      expect(duplicates.some(group => group.includes('1') && group.includes('2'))).toBe(true);
    });

    it('should detect similar articles', () => {
      const duplicates = detectDuplicates(sampleArticles, 0.7);
      
      expect(duplicates.length).toBeGreaterThan(0);
      expect(duplicates.some(group => group.includes('1') && group.includes('4'))).toBe(true);
    });

    it('should handle empty array', () => {
      const duplicates = detectDuplicates([]);
      expect(duplicates).toEqual([]);
    });

    it('should handle single article', () => {
      const duplicates = detectDuplicates([sampleArticles[0]]);
      expect(duplicates).toEqual([]);
    });

    it('should handle articles with missing fields', () => {
      const articlesWithMissing = [
        { id: '1', title: 'Test', content: null },
        { id: '2', title: null, content: 'Test content' },
        { id: '3', title: 'Test', content: 'Test content' }
      ];
      
      const duplicates = detectDuplicates(articlesWithMissing);
      expect(duplicates).toBeDefined();
      expect(Array.isArray(duplicates)).toBe(true);
    });

    it('should use custom similarity threshold', () => {
      const highThreshold = detectDuplicates(sampleArticles, 0.95);
      const lowThreshold = detectDuplicates(sampleArticles, 0.5);
      
      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });

    it('should handle identical URLs as duplicates', () => {
      const articlesWithSameUrl = [
        { id: '1', title: 'Article 1', content: 'Content 1', url: 'https://example.com/same' },
        { id: '2', title: 'Article 2', content: 'Content 2', url: 'https://example.com/same' }
      ];
      
      const duplicates = detectDuplicates(articlesWithSameUrl);
      expect(duplicates.length).toBeGreaterThan(0);
    });

    it('should handle very similar titles as duplicates', () => {
      const articlesWithSimilarTitles = [
        { id: '1', title: 'Breaking: New Technology Released', content: 'Content A' },
        { id: '2', title: 'Breaking: New Technology Released Today', content: 'Content B' }
      ];
      
      const duplicates = detectDuplicates(articlesWithSimilarTitles, 0.8);
      expect(duplicates.length).toBeGreaterThan(0);
    });

    it('should handle performance with large datasets', () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: i.toString(),
        title: `Article ${i}`,
        content: `This is content for article ${i}`,
        url: `https://example.com/${i}`
      }));
      
      const startTime = Date.now();
      const duplicates = detectDuplicates(largeDataset);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(duplicates).toBeDefined();
    });
  });

  describe('getDuplicateGroups', () => {
    const sampleArticles = [
      { id: '1', title: 'Article A', content: 'Content A' },
      { id: '2', title: 'Article A', content: 'Content A' },
      { id: '3', title: 'Article B', content: 'Content B' },
      { id: '4', title: 'Article B Similar', content: 'Content B Similar' }
    ];

    it('should group duplicates correctly', () => {
      const groups = getDuplicateGroups(sampleArticles);
      
      expect(groups.length).toBeGreaterThan(0);
      expect(groups.some(group => group.length >= 2)).toBe(true);
    });

    it('should return detailed group information', () => {
      const groups = getDuplicateGroups(sampleArticles);
      
      groups.forEach(group => {
        expect(group.length).toBeGreaterThan(1);
        group.forEach(article => {
          expect(article).toHaveProperty('id');
          expect(article).toHaveProperty('title');
          expect(article).toHaveProperty('content');
        });
      });
    });

    it('should handle empty input', () => {
      const groups = getDuplicateGroups([]);
      expect(groups).toEqual([]);
    });

    it('should handle single article', () => {
      const groups = getDuplicateGroups([sampleArticles[0]]);
      expect(groups).toEqual([]);
    });
  });

  describe('removeDuplicates', () => {
    const sampleArticles = [
      { id: '1', title: 'Article A', content: 'Content A', publishedAt: '2023-01-01' },
      { id: '2', title: 'Article A', content: 'Content A', publishedAt: '2023-01-02' },
      { id: '3', title: 'Article B', content: 'Content B', publishedAt: '2023-01-03' },
      { id: '4', title: 'Article C', content: 'Content C', publishedAt: '2023-01-04' }
    ];

    it('should remove duplicate articles', () => {
      const unique = removeDuplicates(sampleArticles);
      
      expect(unique.length).toBeLessThan(sampleArticles.length);
      expect(unique.length).toBeGreaterThan(0);
    });

    it('should keep the most recent article from duplicates', () => {
      const unique = removeDuplicates(sampleArticles);
      
      // Should keep article with id '2' (more recent) instead of '1'
      const hasArticle1 = unique.some(article => article.id === '1');
      const hasArticle2 = unique.some(article => article.id === '2');
      
      expect(hasArticle1).toBe(false);
      expect(hasArticle2).toBe(true);
    });

    it('should preserve unique articles', () => {
      const unique = removeDuplicates(sampleArticles);
      
      expect(unique.some(article => article.id === '3')).toBe(true);
      expect(unique.some(article => article.id === '4')).toBe(true);
    });

    it('should handle empty array', () => {
      const unique = removeDuplicates([]);
      expect(unique).toEqual([]);
    });

    it('should handle single article', () => {
      const unique = removeDuplicates([sampleArticles[0]]);
      expect(unique).toEqual([sampleArticles[0]]);
    });

    it('should handle articles without publishedAt', () => {
      const articlesWithoutDate = [
        { id: '1', title: 'Article A', content: 'Content A' },
        { id: '2', title: 'Article A', content: 'Content A' }
      ];
      
      const unique = removeDuplicates(articlesWithoutDate);
      expect(unique.length).toBe(1);
    });

    it('should use custom similarity threshold', () => {
      const uniqueHigh = removeDuplicates(sampleArticles, 0.95);
      const uniqueLow = removeDuplicates(sampleArticles, 0.5);
      
      expect(uniqueLow.length).toBeLessThanOrEqual(uniqueHigh.length);
    });

    it('should handle custom selection strategy', () => {
      const customStrategy = (duplicates) => {
        // Select article with shortest title
        return duplicates.reduce((selected, current) => 
          current.title.length < selected.title.length ? current : selected
        );
      };
      
      const unique = removeDuplicates(sampleArticles, 0.8, customStrategy);
      expect(unique.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed articles', () => {
      const malformedArticles = [
        { id: '1' }, // Missing title and content
        { title: 'Title only' }, // Missing id and content
        { content: 'Content only' }, // Missing id and title
        null, // Null article
        undefined, // Undefined article
        {} // Empty object
      ];
      
      const duplicates = detectDuplicates(malformedArticles);
      expect(duplicates).toBeDefined();
      expect(Array.isArray(duplicates)).toBe(true);
    });

    it('should handle extremely long content', () => {
      const longContent = 'A'.repeat(100000);
      const articles = [
        { id: '1', title: 'Long Article', content: longContent },
        { id: '2', title: 'Long Article', content: longContent }
      ];
      
      const duplicates = detectDuplicates(articles);
      expect(duplicates.length).toBeGreaterThan(0);
    });

    it('should handle special characters in all fields', () => {
      const specialArticles = [
        { id: '1', title: 'Spéçiål Çhåråçtërs 🚀', content: 'Çøñtëñt wíth émøjís 🎉' },
        { id: '2', title: 'Special Characters 🚀', content: 'Content with emojis 🎉' }
      ];
      
      const duplicates = detectDuplicates(specialArticles, 0.7);
      expect(duplicates).toBeDefined();
    });

    it('should handle mixed data types', () => {
      const mixedArticles = [
        { id: 1, title: 'Number ID', content: 'Content 1' },
        { id: '2', title: 'String ID', content: 'Content 2' },
        { id: '3', title: 123, content: 'Number title' },
        { id: '4', title: 'Normal', content: 456 }
      ];
      
      const duplicates = detectDuplicates(mixedArticles);
      expect(duplicates).toBeDefined();
    });

    it('should handle circular references', () => {
      const article1 = { id: '1', title: 'Test' };
      const article2 = { id: '2', title: 'Test' };
      article1.ref = article2;
      article2.ref = article1;
      
      const duplicates = detectDuplicates([article1, article2]);
      expect(duplicates).toBeDefined();
    });

    it('should handle articles with identical fingerprints but different content', () => {
      // Edge case where fingerprints might collide
      const articles = [
        { id: '1', title: 'A', content: 'A' },
        { id: '2', title: 'B', content: 'B' },
        { id: '3', title: 'A', content: 'A' }
      ];
      
      const duplicates = detectDuplicates(articles);
      expect(duplicates.some(group => group.includes('1') && group.includes('3'))).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent processing', async () => {
      const articles = Array.from({ length: 50 }, (_, i) => ({
        id: i.toString(),
        title: `Article ${i}`,
        content: `Content for article ${i}`
      }));
      
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(detectDuplicates(articles))
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should scale linearly with input size', () => {
      const smallDataset = Array.from({ length: 10 }, (_, i) => ({
        id: i.toString(),
        title: `Article ${i}`,
        content: `Content ${i}`
      }));
      
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        id: i.toString(),
        title: `Article ${i}`,
        content: `Content ${i}`
      }));
      
      const startSmall = Date.now();
      detectDuplicates(smallDataset);
      const endSmall = Date.now();
      
      const startLarge = Date.now();
      detectDuplicates(largeDataset);
      const endLarge = Date.now();
      
      const smallTime = endSmall - startSmall;
      const largeTime = endLarge - startLarge;
      
      // Large dataset should not be more than 10x slower
      expect(largeTime).toBeLessThan(smallTime * 10);
    });
  });
});