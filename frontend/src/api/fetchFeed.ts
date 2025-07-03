import { v4 as uuidv4 } from 'uuid'

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

/**
 * Fetches and parses RSS feed using a public CORS proxy (allorigins).
 * @param feed Feed descriptor
 */
export async function fetchFeedArticles(feed: Feed): Promise<Article[]> {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
      feed.url,
    )}`
    const res = await fetch(proxyUrl)
    if (!res.ok) throw new Error(`Network response not ok: ${res.status}`)
    const json = (await res.json()) as { contents: string }
    const xmlString: string = json.contents
    const parser = new DOMParser()
    const xml = parser.parseFromString(xmlString, 'application/xml')
    const items = Array.from(xml.querySelectorAll('item'))
    return items.map((item) => {
      const title = item.querySelector('title')?.textContent ?? 'No title'
      const link = item.querySelector('link')?.textContent ?? '#'
      const description =
        item.querySelector('description')?.textContent ?? ''
      const pubDate = item.querySelector('pubDate')?.textContent ?? ''
      return {
        id: link || uuidv4(),
        feedId: feed.id,
        feedName: feed.name,
        link,
        title,
        summary: description,
        publicationDate: pubDate,
      }
    })
  } catch (error) {
    console.error(`Failed to fetch feed ${feed.url}:`, error)
    return []
  }
}