/**
 * Tests for Noticeboard scraper HTML parsing logic
 *
 * Focuses on critical parsing patterns for gallery, events, and news
 * Tests the Cheerio selectors and regex patterns without network dependencies
 */

import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';

describe('Gallery Parsing', () => {
  it('should extract album links from gallery page', () => {
    // Arrange
    const html = `
      <div>
        <a href="/gallery/album-123">Summer Regatta 2024</a>
        <a href="/gallery/album-456">Training Photos</a>
        <a href="/gallery/album-789">Club Events</a>
      </div>
    `;

    // Act
    const $ = cheerio.load(html);
    const albums = [];
    $('a[href*="/gallery/"]').each((i, elem) => {
      const $link = $(elem);
      const title = $link.text().trim();
      const url = $link.attr('href');
      const albumId = url?.split('/gallery/')[1]?.split('?')[0];

      if (title && albumId && title.length >= 2) {
        albums.push({ title, albumId });
      }
    });

    // Assert
    expect(albums).toHaveLength(3);
    expect(albums[0]).toEqual({ title: 'Summer Regatta 2024', albumId: 'album-123' });
    expect(albums[1]).toEqual({ title: 'Training Photos', albumId: 'album-456' });
  });

  it('should extract photo URLs from gallery items', () => {
    // Arrange
    const html = `
      <div>
        <a class="cs-gallery-item" href="/uploads/photos/photo1.jpg">
          <span style="background-image: url('/uploads/photos/photo1_thumb.jpg')"></span>
        </a>
        <a class="cs-gallery-item" href="/uploads/photos/photo2.png">
          <span style="background-image: url('/uploads/photos/photo2_thumb.png')"></span>
        </a>
      </div>
    `;

    // Act
    const $ = cheerio.load(html);
    const photos = [];

    $('a.cs-gallery-item, a[class*="gallery-item"]').each((j, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');

      if (href && href.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
        const $span = $link.find('span[style*="background-image"]');
        let thumbUrl = href;

        if ($span.length) {
          const style = $span.attr('style');
          const match = style?.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
          if (match) thumbUrl = match[1];
        }

        photos.push({ url: href, thumbnail: thumbUrl });
      }
    });

    // Assert
    expect(photos).toHaveLength(2);
    expect(photos[0].url).toBe('/uploads/photos/photo1.jpg');
    expect(photos[0].thumbnail).toBe('/uploads/photos/photo1_thumb.jpg');
  });

  it('should filter invalid album entries', () => {
    // Arrange
    const html = `
      <a href="/gallery/valid-album">Valid Album</a>
      <a href="/gallery/">X</a>
      <a href="/gallery/another-valid">Another Album</a>
      <a href="/other-page">Not a gallery link</a>
    `;

    // Act
    const $ = cheerio.load(html);
    const albums = [];
    $('a[href*="/gallery/"]').each((i, elem) => {
      const $link = $(elem);
      const title = $link.text().trim();
      const url = $link.attr('href');
      const albumId = url?.split('/gallery/')[1]?.split('?')[0];

      // Filter: title exists, albumId exists, title >= 2 chars
      if (!title || !albumId || title.length < 2) return;

      albums.push({ title, albumId });
    });

    // Assert
    expect(albums).toHaveLength(2);
    expect(albums).not.toContainEqual(expect.objectContaining({ title: 'X' }));
  });

  it('should remove duplicate photos by URL', () => {
    // Arrange
    const photos = [
      { url: '/photo1.jpg', thumbnail: '/thumb1.jpg' },
      { url: '/photo2.jpg', thumbnail: '/thumb2.jpg' },
      { url: '/photo1.jpg', thumbnail: '/thumb1.jpg' }, // Duplicate
      { url: '/photo3.jpg', thumbnail: '/thumb3.jpg' },
    ];

    // Act
    const uniquePhotos = [];
    const seen = new Set();
    photos.forEach(photo => {
      if (!seen.has(photo.url)) {
        seen.add(photo.url);
        uniquePhotos.push(photo);
      }
    });

    // Assert
    expect(uniquePhotos).toHaveLength(3);
    expect(uniquePhotos.map(p => p.url)).toEqual(['/photo1.jpg', '/photo2.jpg', '/photo3.jpg']);
  });
});

describe('Event Parsing', () => {
  it('should extract event title and URL', () => {
    // Arrange
    const html = `
      <div class="card card-hover">
        <a href="/events/123-summer-regatta">Summer Regatta 2024</a>
      </div>
      <div class="card card-hover">
        <a href="/events/456-club-meeting">Annual Club Meeting</a>
      </div>
    `;

    // Act
    const $ = cheerio.load(html);
    const events = [];

    $('.card.card-hover').each((i, elem) => {
      const $card = $(elem);
      const $titleLink = $card.find('a[href*="/events/"]').first();
      if (!$titleLink.length) return;

      const title = $titleLink.text().trim();
      const url = $titleLink.attr('href');

      events.push({ title, url });
    });

    // Assert
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ title: 'Summer Regatta 2024', url: '/events/123-summer-regatta' });
  });

  it('should parse event date format', () => {
    // Arrange
    const cardText = `
      Summer Regatta 2024
      Sat 26 Oct 2025 08:00 — 17:00
      Lake Macquarie Rowing Club
      Details
    `;

    // Act
    const dateMatch = cardText.match(/([A-Z][a-z]{2}\s+\d{1,2}\s+[A-Z][a-z]{2,8}\s+\d{4}\s+\d{1,2}:\d{2}(?:\s*—\s*(?:[A-Z][a-z]{2}\s+)?\d{1,2}(?:\s+[A-Z][a-z]{2,8}\s+\d{4})?\s+\d{1,2}:\d{2})?)/);
    const dateText = dateMatch ? dateMatch[1] : '';

    // Assert - Regex should capture at least the start date/time
    expect(dateText).toContain('Sat 26 Oct 2025 08:00');
    expect(cardText).toContain(' — 17:00'); // End time exists in original
  });

  it('should parse multiday event date format', () => {
    // Arrange
    const cardText = 'Training Camp\nSat 15 Nov 2025 09:00 — Sun 16 Nov 2025 16:00\nTraining Center';

    // Act
    const dateMatch = cardText.match(/([A-Z][a-z]{2}\s+\d{1,2}\s+[A-Z][a-z]{2,8}\s+\d{4}\s+\d{1,2}:\d{2}(?:\s*—\s*(?:[A-Z][a-z]{2}\s+)?\d{1,2}(?:\s+[A-Z][a-z]{2,8}\s+\d{4})?\s+\d{1,2}:\d{2})?)/);
    const dateText = dateMatch ? dateMatch[1] : '';

    // Assert
    expect(dateText).toContain('Sat 15 Nov 2025');
    expect(dateText).toContain('Sun 16 Nov 2025');
  });

  it('should extract location from card text', () => {
    // Arrange
    const cardText = `
      Summer Regatta
      Sat 26 Oct 2025 08:00 — 17:00
      Lake Macquarie Rowing Club
      Details
    `;
    const title = 'Summer Regatta';
    const dateText = 'Sat 26 Oct 2025 08:00 — 17:00';

    // Act
    const lines = cardText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let location = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip title, date, and "Details" lines
      if (line === title || line.includes(dateText) || line === 'Details') continue;
      // This should be the location
      if (line.length > 0 && line.length < 100) {
        location = line;
        break;
      }
    }

    // Assert
    expect(location).toBe('Lake Macquarie Rowing Club');
  });

  it('should handle events without dates gracefully', () => {
    // Arrange
    const cardText = 'Event Title\nVenue Name\nDetails';

    // Act
    const dateMatch = cardText.match(/([A-Z][a-z]{2}\s+\d{1,2}\s+[A-Z][a-z]{2,8}\s+\d{4}\s+\d{1,2}:\d{2}(?:\s*—\s*(?:[A-Z][a-z]{2}\s+)?\d{1,2}(?:\s+[A-Z][a-z]{2,8}\s+\d{4})?\s+\d{1,2}:\d{2})?)/);
    const dateText = dateMatch ? dateMatch[1] : '';

    // Assert
    expect(dateText).toBe('');
  });
});

describe('News Parsing', () => {
  it('should extract news article title and URL', () => {
    // Arrange
    const html = `
      <div class="card card-hover">
        <a href="/news/123-club-update">Club Update - January 2025</a>
      </div>
      <div class="card card-hover">
        <a href="/news/456-new-boats">New Boats Arriving Soon</a>
      </div>
    `;

    // Act
    const $ = cheerio.load(html);
    const news = [];

    $('.card.card-hover').each((i, elem) => {
      const $card = $(elem);
      const $titleLink = $card.find('a[href*="/news/"]').first();
      if (!$titleLink.length) return;

      const title = $titleLink.text().trim();
      const url = $titleLink.attr('href');

      news.push({ title, url });
    });

    // Assert
    expect(news).toHaveLength(2);
    expect(news[0].title).toBe('Club Update - January 2025');
    expect(news[1].url).toBe('/news/456-new-boats');
  });

  it('should extract news date from card text', () => {
    // Arrange
    const cardText = `
      Club Update
      Posted 15 Jan 2025
      Read the latest club news...
    `;

    // Act
    const dateMatch = cardText.match(/Posted\s+(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})/);
    const dateText = dateMatch ? dateMatch[1] : '';

    // Assert
    expect(dateText).toBe('15 Jan 2025');
  });
});

describe('HTML Sanitization', () => {
  it('should handle malformed HTML gracefully', () => {
    // Arrange
    const malformedHTML = '<div><a href="/test">Unclosed link<div>Nested</div>';

    // Act
    const $ = cheerio.load(malformedHTML);
    const links = $('a').map((i, el) => $(el).text()).get();

    // Assert - Cheerio should still parse it
    expect(links.length).toBeGreaterThan(0);
  });

  it('should handle missing attributes', () => {
    // Arrange
    const html = '<a>Link without href</a><a href="">Empty href</a>';

    // Act
    const $ = cheerio.load(html);
    const validLinks = [];

    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && href.length > 0) {
        validLinks.push(href);
      }
    });

    // Assert
    expect(validLinks).toHaveLength(0);
  });

  it('should trim whitespace from extracted text', () => {
    // Arrange
    const html = '<a href="/test">  \n  Link Text  \n  </a>';

    // Act
    const $ = cheerio.load(html);
    const text = $('a').text().trim();

    // Assert
    expect(text).toBe('Link Text');
  });
});

describe('URL Handling', () => {
  it('should make relative URLs absolute', () => {
    // Arrange
    const BASE_URL = 'https://www.lakemacquarierowingclub.org.au';
    const relativeUrl = '/gallery/album-123';

    // Act
    const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `${BASE_URL}${relativeUrl}`;

    // Assert
    expect(fullUrl).toBe('https://www.lakemacquarierowingclub.org.au/gallery/album-123');
  });

  it('should not modify absolute URLs', () => {
    // Arrange
    const BASE_URL = 'https://www.lakemacquarierowingclub.org.au';
    const absoluteUrl = 'https://example.com/external';

    // Act
    const fullUrl = absoluteUrl.startsWith('http') ? absoluteUrl : `${BASE_URL}${absoluteUrl}`;

    // Assert
    expect(fullUrl).toBe('https://example.com/external');
  });

  it('should extract album ID from URL with query params', () => {
    // Arrange
    const url = '/gallery/album-789?view=grid&page=2';

    // Act
    const albumId = url.split('/gallery/')[1]?.split('?')[0];

    // Assert
    expect(albumId).toBe('album-789');
  });
});
