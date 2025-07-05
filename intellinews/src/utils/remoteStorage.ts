import { AppConfiguration } from '../types';

const REMOTE_URL_KEY = 'intellinews-remote-url';
const API_BASE = 'https://jsonblob.com/api/jsonBlob';

/**
 * Extracts a shared blob ID from the current browser URL.
 * We support two formats: ?share=<id> or #share=<id>
 */
function getShareIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const shareParam = params.get('share');
  if (shareParam) return shareParam;

  const hash = window.location.hash;
  if (hash.startsWith('#share=')) {
    return hash.replace('#share=', '').trim();
  }
  return null;
}

function blobUrlFromId(id: string): string {
  if (id.startsWith('http')) return id; // already full URL
  return `${API_BASE}/${id}`;
}

/**
 * Load configuration from remote JSONBlob storage (if available).
 * Returns null if no remote configuration is available.
 */
export async function loadRemoteConfiguration(): Promise<AppConfiguration | null> {
  try {
    const shareId = getShareIdFromLocation();
    const savedUrl = localStorage.getItem(REMOTE_URL_KEY);
    const blobUrl = shareId ? blobUrlFromId(shareId) : savedUrl;

    if (!blobUrl) return null;

    const resp = await fetch(blobUrl);
    if (!resp.ok) throw new Error('Failed to fetch remote configuration');

    const json = await resp.json();
    // Basic validation
    if (json && json.feeds && json.topics) {
      // Persist blob URL for future saves
      if (blobUrl && !savedUrl) {
        localStorage.setItem(REMOTE_URL_KEY, blobUrl);
      }
      return json as AppConfiguration;
    }
  } catch (err) {
    console.error('Could not load remote configuration:', err);
  }
  return null;
}

/**
 * Save configuration to remote JSONBlob. Creates a new blob if necessary.
 * Always stores the blob URL in localStorage and updates the browser URL
 * so it can be shared across devices.
 */
export async function saveRemoteConfiguration(config: AppConfiguration): Promise<void> {
  try {
    let blobUrl = localStorage.getItem(REMOTE_URL_KEY);

    if (!blobUrl) {
      // Create new blob
      const createResp = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!createResp.ok) throw new Error('Failed to create remote configuration');
      blobUrl = createResp.headers.get('location') || '';
      if (!blobUrl) throw new Error('No location header returned');
      localStorage.setItem(REMOTE_URL_KEY, blobUrl);

      // Update URL so user can share it
      if (typeof window !== 'undefined') {
        const newUrl = `${window.location.origin}${window.location.pathname}?share=${blobUrl.split('/').pop()}`;
        window.history.replaceState(null, '', newUrl);
      }
    } else {
      // Update existing blob
      await fetch(blobUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    }
  } catch (err) {
    console.error('Could not save remote configuration:', err);
  }
}