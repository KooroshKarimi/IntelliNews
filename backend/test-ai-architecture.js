#!/usr/bin/env node

/**
 * Test script for the pluggable AI architecture
 * This script tests the AI provider system without starting the full server
 */

import { AiProviderFactory } from './ai/AiProviderFactory.js';
import { AiService } from './services/AiService.js';

const testArticle = {
  id: 'test-article-123',
  originalTitle: 'Breaking News: Major Economic Changes Announced',
  originalContent: 'The government announced significant economic reforms today that will impact millions of citizens. The new policies include tax changes, infrastructure investments, and job creation programs.',
  originalSummary: 'Government announces major economic reforms with tax changes and job programs.',
  sourceFeedName: 'Test News Source',
  publicationDate: new Date().toISOString()
};

async function testAiProviderFactory() {
  console.log('=== Testing AI Provider Factory ===');
  
  try {
    // Test mock provider
    process.env.AI_PROVIDER = 'mock';
    const mockProvider = await AiProviderFactory.createProvider();
    console.log('✓ Mock provider created:', mockProvider.constructor.name);
    
    const isAvailable = await mockProvider.isAvailable();
    console.log('✓ Mock provider available:', isAvailable);
    
    // Test supported providers
    const supportedProviders = AiProviderFactory.getSupportedProviders();
    console.log('✓ Supported providers:', supportedProviders);
    
    // Test individual AI operations
    const translation = await mockProvider.translate('Hello world', 'en');
    console.log('✓ Translation test:', translation);
    
    const summary = await mockProvider.summarize(testArticle.originalContent, 'en');
    console.log('✓ Summary test:', summary.substring(0, 100) + '...');
    
    const seriousness = await mockProvider.rateSeriousness(testArticle.originalTitle, testArticle.originalContent, 'en');
    console.log('✓ Seriousness rating:', seriousness);
    
    const imageUrl = await mockProvider.generateImage(testArticle.originalTitle, testArticle.originalSummary, 'en');
    console.log('✓ Image generation:', imageUrl);
    
    console.log('✓ All AI Provider Factory tests passed!\n');
    
  } catch (error) {
    console.error('✗ AI Provider Factory test failed:', error);
  }
}

async function testAiService() {
  console.log('=== Testing AI Service ===');
  
  try {
    const aiService = new AiService();
    await aiService.initialize();
    
    console.log('✓ AI Service initialized');
    
    const providerInfo = await aiService.getProviderInfo();
    console.log('✓ Provider info:', providerInfo);
    
    const enhancedArticle = await aiService.enhanceArticle(testArticle);
    console.log('✓ Article enhanced');
    console.log('  - Original title:', enhancedArticle.originalTitle);
    console.log('  - Translated title:', enhancedArticle.translatedTitle);
    console.log('  - Seriousness score:', enhancedArticle.seriousnessScore);
    console.log('  - AI enhanced:', enhancedArticle.aiEnhanced);
    console.log('  - Image URL:', enhancedArticle.imageUrl);
    console.log('  - Image generated:', enhancedArticle.imageGenerated);
    
    console.log('✓ All AI Service tests passed!\n');
    
  } catch (error) {
    console.error('✗ AI Service test failed:', error);
  }
}

async function testProviderSwitching() {
  console.log('=== Testing Provider Switching ===');
  
  try {
    // Test switching to mock provider
    process.env.AI_PROVIDER = 'mock';
    const mockProvider = await AiProviderFactory.createProvider();
    console.log('✓ Switched to mock provider:', mockProvider.constructor.name);
    
    // Test switching to gemini provider (without API key - should fallback)
    process.env.AI_PROVIDER = 'gemini';
    delete process.env.GEMINI_API_KEY; // Ensure no API key
    const geminiProvider = await AiProviderFactory.createProvider();
    console.log('✓ Created gemini provider:', geminiProvider.constructor.name);
    
    const geminiAvailable = await geminiProvider.isAvailable();
    console.log('✓ Gemini provider available (without API key):', geminiAvailable);
    
    // Test with invalid provider name
    process.env.AI_PROVIDER = 'invalid_provider';
    const fallbackProvider = await AiProviderFactory.createProvider();
    console.log('✓ Invalid provider fell back to:', fallbackProvider.constructor.name);
    
    console.log('✓ All Provider Switching tests passed!\n');
    
  } catch (error) {
    console.error('✗ Provider Switching test failed:', error);
  }
}

async function runAllTests() {
  console.log('🧪 Starting IntelliNews AI Architecture Tests\n');
  
  await testAiProviderFactory();
  await testAiService();
  await testProviderSwitching();
  
  console.log('🎉 All tests completed!');
  console.log('\nTo test with real Gemini API:');
  console.log('1. Set AI_PROVIDER=gemini');
  console.log('2. Set GEMINI_API_KEY=your_api_key');
  console.log('3. Run this script again\n');
}

// Run tests
runAllTests().catch(console.error);