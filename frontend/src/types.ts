export interface Feed {
  id: string
  name: string
  url: string
}

export interface Article {
  id: string
  feedId: string
  feedName: string
  link: string
  title: string
  summary: string
  publicationDate: string
}

export interface Topic {
  id: string
  name: string
  keywords: string[]
  excludeKeywords?: string[]
}