import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

// ============================================================
// MAIN NOTICEBOARD COMPONENT
// ============================================================

function Noticeboard() {
  const [config, setConfig] = useState(null);
  const [gallery, setGallery] = useState(null);
  const [events, setEvents] = useState(null);
  const [news, setNews] = useState(null);
  const [sponsors, setSponsors] = useState(null);
  const [weather, setWeather] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [sponsorGroupIndex, setSponsorGroupIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState({
    timestamp: null,
    success: false
  });
  const [lastScrape, setLastScrape] = useState({
    timestamp: null
  });

  // Fetch configuration
  useEffect(() => {
    fetchConfig();
    const interval = setInterval(fetchConfig, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data
  useEffect(() => {
    if (!config) return;
    
    fetchAllData();
    const refreshSeconds = config.timing?.dataRefreshSeconds || 60;
    const interval = setInterval(fetchAllData, refreshSeconds * 1000);
    return () => clearInterval(interval);
  }, [config]);

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Hero rotation
  useEffect(() => {
    const heroItems = getHeroItems();
    if (!config || !heroItems.length) return;
    
    const rotationSeconds = config.timing?.heroRotationSeconds || 15;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroItems.length);
    }, rotationSeconds * 1000);
    
    return () => clearInterval(interval);
  }, [config, gallery, news]);

  // News article rotation (one article at a time)
  useEffect(() => {
    const newsArticles = getFilteredNews();
    if (!config || !newsArticles.length) return;
    
    const rotationSeconds = config.news?.itemRotationSeconds || 45;
    const interval = setInterval(() => {
      setCurrentNewsIndex(prev => (prev + 1) % newsArticles.length);
    }, rotationSeconds * 1000);
    
    return () => clearInterval(interval);
  }, [config, news]);

  // Sponsor group rotation (show multiple sponsors at once)
  useEffect(() => {
    if (!sponsors?.sponsors?.length) return;
    
    const sponsorsPerGroup = 5; // Show 5 sponsors at a time
    const totalGroups = Math.ceil(sponsors.sponsors.length / sponsorsPerGroup);
    
    if (totalGroups <= 1) return;
    
    const rotationSeconds = config?.timing?.sponsorRotationSeconds || 30;
    const interval = setInterval(() => {
      setSponsorGroupIndex(prev => (prev + 1) % totalGroups);
    }, rotationSeconds * 1000);
    
    return () => clearInterval(interval);
  }, [config, sponsors]);

  // Fetch weather
  useEffect(() => {
    if (!config?.weather) return;

    fetchWeather();
    const refreshMinutes = config.timing?.weatherRefreshMinutes || 30;
    const interval = setInterval(fetchWeather, refreshMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [config]);

  // ============================================================
  // DATA FETCHING FUNCTIONS
  // ============================================================

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const fetchAllData = async () => {
    try {
      const [galleryRes, eventsRes, newsRes, sponsorsRes] = await Promise.all([
        fetch('/api/gallery'),
        fetch('/api/events'),
        fetch('/api/news'),
        fetch('/api/sponsors')
      ]);

      // Check if any response failed
      const allSuccess = galleryRes.ok && eventsRes.ok && newsRes.ok && sponsorsRes.ok;

      const galleryData = await galleryRes.json();
      const eventsData = await eventsRes.json();
      const newsData = await newsRes.json();
      const sponsorsData = await sponsorsRes.json();

      setGallery(galleryData);
      setEvents(eventsData);
      setNews(newsData);
      setSponsors(sponsorsData);

      // Extract oldest scrape time from all data sources
      const scrapeTimes = [
        galleryData.scrapedAt,
        eventsData.scrapedAt,
        newsData.scrapedAt,
        sponsorsData.scrapedAt
      ].filter(Boolean).map(t => new Date(t));

      const oldestScrape = scrapeTimes.length > 0
        ? new Date(Math.min(...scrapeTimes))
        : null;

      setLastScrape({
        timestamp: oldestScrape
      });

      // Track refresh - only green if all responses were OK
      setLastRefresh({
        timestamp: new Date(),
        success: allSuccess
      });
    } catch (err) {
      console.error('Error fetching data:', err);

      // Track failed refresh
      setLastRefresh({
        timestamp: new Date(),
        success: false
      });
    }
  };

  const fetchWeather = async () => {
    try {
      const res = await fetch('/api/weather');

      if (!res.ok) {
        // 503 = Service Unavailable (BOM API blocked)
        // Don't log repeated errors for known issues
        if (res.status !== 503) {
          console.warn('Weather API returned error:', res.status);
        }
        return;
      }

      const data = await res.json();
      setWeather(data);
    } catch (err) {
      // Silently fail - weather is optional feature
      console.debug('Weather unavailable:', err.message);
    }
  };

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const getHeroItems = () => {
    const items = [];
    
    // Add photos from gallery
    if (gallery?.albums) {
      gallery.albums.forEach(album => {
        album.photos?.forEach(photo => {
          items.push({
            type: 'photo',
            url: photo.url,
            title: album.title,
            date: album.scrapedAt
          });
        });
      });
    }
    
    // Add featured news
    if (news?.news) {
      news.news.slice(0, 5).forEach(item => {
        items.push({
          type: item.type === 'result' ? 'result' : 'news',
          title: item.title,
          snippet: item.snippet,
          date: item.date
        });
      });
    }
    
    return items;
  };

  const getFilteredNews = () => {
    if (!news?.news) return [];
    
    let filtered = news.news;
    
    // Filter by featured if enabled
    if (config?.news?.showFeaturedOnly) {
      filtered = filtered.filter(item => item.isFeatured);
    }
    
    const maxItems = config?.news?.maxItemsToDisplay || 10;
    return filtered.slice(0, maxItems);
  };

  const getCurrentNewsArticle = () => {
    const articles = getFilteredNews();
    if (!articles.length) return null;
    return articles[currentNewsIndex];
  };

  const getCurrentSponsorGroup = () => {
    if (!sponsors?.sponsors?.length) return [];
    
    const sponsorsPerGroup = 5;
    const start = sponsorGroupIndex * sponsorsPerGroup;
    const end = start + sponsorsPerGroup;
    
    return sponsors.sponsors.slice(start, end);
  };

  const getUpcomingEvents = () => {
    if (!events?.events) return [];
    
    const maxEvents = config?.events?.maxEventsToDisplay || 7;
    return events.events.slice(0, maxEvents);
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🚣</div>
          <div className="text-2xl">Loading LMRC Noticeboard...</div>
        </div>
      </div>
    );
  }

  const heroItems = getHeroItems();
  const currentHero = heroItems[heroIndex];
  const currentNewsArticle = getCurrentNewsArticle();
  const filteredNews = getFilteredNews();
  const upcomingEvents = getUpcomingEvents();
  const currentSponsorGroup = getCurrentSponsorGroup();

  const colors = config.branding?.clubColors || {
    primary: '#003366',
    secondary: '#0066CC',
    accent: '#FFD700',
    background: '#F5F5F5',
    text: '#333333'
  };

  return (
    <div 
      className="w-screen h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {/* HEADER */}
      <Header 
        config={config}
        currentTime={currentTime}
        weather={weather}
        colors={colors}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex" style={{ minHeight: 0 }}>
        {/* LEFT PANEL - UPCOMING EVENTS */}
        <LeftPanel 
          events={upcomingEvents}
          colors={colors}
        />

        {/* CENTER HERO */}
        <CenterHero 
          item={currentHero}
          colors={colors}
          config={config}
        />

        {/* RIGHT PANEL - NEWS */}
        <RightPanel 
          article={currentNewsArticle}
          articleIndex={currentNewsIndex}
          totalArticles={filteredNews.length}
          colors={colors}
          config={config}
        />
      </div>

      {/* FOOTER */}
      <Footer
        sponsorGroup={currentSponsorGroup}
        config={config}
        colors={colors}
        lastRefresh={lastRefresh}
        lastScrape={lastScrape}
        currentTime={currentTime}
      />
    </div>
  );
}

// ============================================================
// WEATHER ICON HELPER
// ============================================================

function getWeatherIcon(iconCode, temperature) {
  // OpenWeatherMap icon codes: https://openweathermap.org/weather-conditions
  if (!iconCode) {
    // Fallback based on temperature
    return temperature > 25 ? '☀️' : temperature > 15 ? '⛅' : '☁️';
  }

  const iconMap = {
    '01d': '☀️', // clear sky day
    '01n': '🌙', // clear sky night
    '02d': '🌤️', // few clouds day
    '02n': '☁️', // few clouds night
    '03d': '☁️', // scattered clouds
    '03n': '☁️',
    '04d': '☁️', // broken clouds
    '04n': '☁️',
    '09d': '🌧️', // shower rain
    '09n': '🌧️',
    '10d': '🌦️', // rain day
    '10n': '🌧️', // rain night
    '11d': '⛈️', // thunderstorm
    '11n': '⛈️',
    '13d': '🌨️', // snow
    '13n': '🌨️',
    '50d': '🌫️', // mist
    '50n': '🌫️'
  };

  return iconMap[iconCode] || '⛅';
}

// ============================================================
// WIND DIRECTION HELPER
// ============================================================

function getWindDirection(degrees) {
  if (degrees == null) return '';

  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function getWindArrow(degrees) {
  if (degrees == null) return '';

  // Wind direction indicates WHERE the wind is coming FROM
  // Rotate arrow to point in the direction the wind is blowing TO (opposite direction)
  const rotation = (degrees + 180) % 360;

  return (
    <span
      style={{
        display: 'inline-block',
        transform: `rotate(${rotation}deg)`,
        fontSize: '1.2em'
      }}
    >
      ↑
    </span>
  );
}

// ============================================================
// HEADER COMPONENT
// ============================================================

function Header({ config, currentTime, weather, colors }) {
  const formatDate = () => {
    return currentTime.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className="h-24 flex items-center justify-between px-8"
      style={{ backgroundColor: colors.primary, color: 'white' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-4">
        {config.branding?.clubLogoPath ? (
          <img
            src={config.branding.clubLogoPath}
            alt={config.branding.clubName || 'Club Logo'}
            className="h-20 object-contain"
          />
        ) : (
          <div className="text-6xl">🚣</div>
        )}
        <div>
          <div className="text-3xl font-bold">{config.branding?.clubName || 'LMRC'}</div>
          <div className="text-sm opacity-80">{config.branding?.tagline || ''}</div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="text-center">
        <div className="text-2xl font-semibold">{formatDate()}</div>
        <div className="text-xl">{formatTime()}</div>
      </div>

      {/* Weather */}
      <div className="flex items-center gap-4">
        {weather && weather.temperature != null ? (
          <>
            <div className="text-5xl">
              {getWeatherIcon(weather.icon, weather.temperature)}
            </div>
            <div>
              <div className="text-3xl font-bold">{weather.temperature}°C</div>
              <div className="text-sm opacity-80">{weather.location || 'Local'}</div>
              {weather.windSpeed != null && (
                <div className="text-sm opacity-80 flex items-center gap-1 mt-1">
                  {getWindArrow(weather.windDirection)}
                  <span>{weather.windSpeed} km/h {getWindDirection(weather.windDirection)}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-2xl">--°C</div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LEFT PANEL - UPCOMING EVENTS
// ============================================================

function LeftPanel({ events, colors }) {
  return (
    <div 
      className="w-1/4 p-6 overflow-hidden"
      style={{ backgroundColor: colors.secondary, color: 'white' }}
    >
      <h2 className="text-3xl font-bold mb-6">Upcoming Events</h2>
      
      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">📅</div>
                <div className="flex-1">
                  <div className="text-xl font-semibold">{event.title}</div>
                  {event.date && (
                    <div className="text-sm opacity-80 mt-1">{event.date}</div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 opacity-60">
            <div className="text-5xl mb-4">📅</div>
            <div className="text-lg">No upcoming events</div>
            <div className="text-sm mt-2">Check the website for updates</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CENTER HERO - ROTATING CONTENT
// ============================================================

function CenterHero({ item, colors, config }) {
  if (!item) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <div className="text-center">
          {config.branding?.clubLogoPath ? (
            <img
              src={config.branding.clubLogoPath}
              alt="Club Logo"
              className="mx-auto mb-6"
              style={{ maxHeight: '200px', objectFit: 'contain' }}
            />
          ) : (
            <div className="text-9xl mb-6">🚣</div>
          )}
          <div className="text-4xl font-bold mb-4" style={{ color: colors.primary }}>
            Lake Macquarie Rowing Club
          </div>
          <div className="text-2xl" style={{ color: colors.text }}>
            {config.branding?.tagline || 'Welcome to our club'}
          </div>
        </div>
      </div>
    );
  }

  if (item.type === 'photo') {
    return (
      <div className="flex-1 relative overflow-hidden">
        <img 
          src={item.url}
          alt={item.title}
          className="w-full h-full object-cover"
          style={{ animation: 'kenburns 15s ease-in-out' }}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 p-6"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}
        >
          <div className="text-white text-3xl font-bold">{item.title}</div>
        </div>
        <style>{`
          @keyframes kenburns {
            0% { transform: scale(1) translate(0, 0); }
            100% { transform: scale(1.1) translate(-5%, -5%); }
          }
        `}</style>
      </div>
    );
  }

  if (item.type === 'result') {
    return (
      <div 
        className="flex-1 flex items-center justify-center p-12"
        style={{ backgroundColor: colors.accent }}
      >
        <div className="text-center max-w-4xl">
          <div className="text-8xl mb-6">🏆</div>
          <div className="text-5xl font-bold mb-6" style={{ color: colors.primary }}>
            {item.title}
          </div>
          {item.snippet && (
            <div className="text-2xl" style={{ color: colors.text }}>
              {item.snippet}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex items-center justify-center p-12"
      style={{ backgroundColor: colors.background }}
    >
      <div className="text-center max-w-4xl">
        <div className="text-7xl mb-6">📢</div>
        <div className="text-4xl font-bold mb-6" style={{ color: colors.primary }}>
          {item.title}
        </div>
        {item.snippet && (
          <div className="text-2xl" style={{ color: colors.text }}>
            {item.snippet}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// RIGHT PANEL - NEWS ARTICLE (FULL CONTENT)
// ============================================================

function RightPanel({ article, articleIndex, totalArticles, colors, config }) {
  if (!article) {
    return (
      <div 
        className="w-1/4 p-6 overflow-hidden flex flex-col"
        style={{ backgroundColor: colors.primary, color: 'white' }}
      >
        <h2 className="text-3xl font-bold mb-6">Latest News</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center opacity-60">
            <div className="text-5xl mb-4">📰</div>
            <div className="text-lg">No recent news</div>
          </div>
        </div>
      </div>
    );
  }

  // Truncate content if too long
  const maxLength = config?.news?.maxContentLength || 500;
  const content = article.content || article.excerpt || '';
  const displayContent = content.length > maxLength 
    ? content.substring(0, maxLength) + '...' 
    : content;

  return (
    <div 
      className="w-1/4 p-6 overflow-hidden flex flex-col"
      style={{ backgroundColor: colors.primary, color: 'white' }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Latest News</h2>
        {totalArticles > 1 && (
          <div className="text-sm opacity-70">
            {articleIndex + 1}/{totalArticles}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-hidden">
        {/* Article Header */}
        <div className="mb-4">
          {article.isFeatured && (
            <div className="inline-block px-3 py-1 rounded text-xs font-bold mb-2"
                 style={{ backgroundColor: colors.accent, color: colors.primary }}>
              FEATURED
            </div>
          )}
          
          {article.date && (
            <div className="text-sm opacity-80 mb-2 flex items-center gap-2">
              <span>📅</span>
              <span>{article.date}</span>
            </div>
          )}
          
          <h3 className="text-2xl font-bold leading-tight mb-4">
            {article.title}
          </h3>
        </div>

        {/* Article Content */}
        <div 
          className="text-base leading-relaxed opacity-90"
          style={{ 
            maxHeight: '60vh',
            overflowY: 'hidden'
          }}
        >
          {displayContent.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="mb-3">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Type Badge */}
        {article.type === 'result' && (
          <div className="mt-4 flex items-center gap-2 text-sm opacity-80">
            <span className="text-2xl">🏆</span>
            <span>Race Results</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FOOTER - SPONSORS CAROUSEL & SOCIAL MEDIA
// ============================================================

function Footer({ sponsorGroup, config, colors, lastRefresh, lastScrape, currentTime }) {
  const formatRefreshTime = () => {
    if (!lastRefresh.timestamp) return '--:--';
    return lastRefresh.timestamp.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatScrapeTime = () => {
    if (!lastScrape.timestamp) return 'Never';

    const now = currentTime || new Date();
    const scrapeTime = new Date(lastScrape.timestamp);
    const diffMs = now - scrapeTime;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  return (
    <div className="h-32 flex flex-col">
      {/* Sponsors Row - White Background */}
      <div
        className="flex-1 flex items-center justify-center px-8"
        style={{ backgroundColor: colors.white || '#FFFFFF', color: colors.text }}
      >
        {sponsorGroup && sponsorGroup.length > 0 ? (
          <div className="flex items-center gap-8">
            <div className="text-sm mr-4" style={{ color: colors.text, opacity: 0.7 }}>
              Proudly supported by:
            </div>
            {sponsorGroup.map((sponsor, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center"
                style={{ height: '60px' }}
              >
                <img
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  className="max-h-full max-w-full object-contain"
                  style={{ maxHeight: '60px', maxWidth: '150px' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm" style={{ color: colors.text, opacity: 0.7 }}>
            Thank you to our club sponsors
          </div>
        )}
      </div>

      {/* Social Media Row - Blue Background */}
      <div
        className="py-3 flex items-center justify-between px-8"
        style={{ backgroundColor: colors.primary, color: 'white' }}
      >
        {/* Social Media Icons - Left/Center */}
        <div className="flex items-center gap-6">
          {config.socialMedia?.facebook?.enabled && (
            <a
              href={config.socialMedia.facebook.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition-opacity hover:opacity-70"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-sm font-medium">{config.socialMedia.facebook.handle}</span>
            </a>
          )}
          {config.socialMedia?.instagram?.enabled && (
            <a
              href={config.socialMedia.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition-opacity hover:opacity-70"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span className="text-sm font-medium">{config.socialMedia.instagram.handle}</span>
            </a>
          )}
        </div>

        {/* Data Scrape Status - Right */}
        <div className="flex items-center gap-2 text-xs" style={{ opacity: 0.7 }}>
          <span
            style={{
              color: lastRefresh.success ? '#4ADE80' : '#EF4444',
              fontSize: '16px'
            }}
          >
            ●
          </span>
          <span>Last update: {formatScrapeTime()}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MOUNT THE APPLICATION
// ============================================================

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.render(<Noticeboard />, rootElement);
} else {
  console.error('Root element not found! Make sure index.html has <div id="root"></div>');
}

export default Noticeboard;