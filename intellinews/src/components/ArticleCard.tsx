import * as React from 'react';
import { Article } from '../types';

interface ArticleCardProps {
  article: Article;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      {article.imageUrl && (
        <img
          src={article.imageUrl}
          alt={article.originalTitle}
          className="w-full h-48 object-cover rounded-lg mb-4"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      
      <h3 className="text-xl font-semibold mb-2 text-gray-800">
        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-600 transition-colors"
        >
          {article.translatedTitle || article.originalTitle}
        </a>
      </h3>
      
      <div className="flex items-center text-sm text-gray-600 mb-3 space-x-4">
        <span>{article.sourceFeedName}</span>
        <span>{formatDate(article.publicationDate)}</span>
      </div>
      
      <p className="text-gray-700 mb-4 line-clamp-3">
        {article.translatedSummary || article.originalSummary}
      </p>
      
      {article.topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {article.topics.map((topic, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
      
      {article.seriousnessScore && (
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-600">Seriosität:</span>
          <div className="flex items-center">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${(article.seriousnessScore / 10) * 100}%` }}
              />
            </div>
            <span className="ml-2 text-gray-700">{article.seriousnessScore}/10</span>
          </div>
        </div>
      )}
      
      {article.aiEnhanced && (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          KI-verbessert
        </div>
      )}
    </div>
  );
};