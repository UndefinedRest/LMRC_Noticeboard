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

  // Get layout configuration with defaults
  const layout = config?.display?.layout || {
    leftPanelWidth: 35,
    centerPanelWidth: 30,
    rightPanelWidth: 35,
    headerHeight: 140,
    footerHeight: 160
  };

  // Get typography configuration with defaults
  const typography = config?.display?.typography || {
    baseFontSize: 30,
    fontScale: {
      xs: 0.75,
      sm: 0.85,
      base: 1.0,
      lg: 1.15,
      xl: 1.35,
      '2xl': 1.5,
      '3xl': 1.75,
      '4xl': 2.0,
      '5xl': 2.5,
      '6xl': 3.0,
      '7xl': 3.5,
      '8xl': 4.0,
      '9xl': 4.5
    }
  };

  // Font size utility function
  const fontSize = (size) => {
    const scale = typography.fontScale[size] || 1.0;
    return Math.round(typography.baseFontSize * scale);
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
        height={layout.headerHeight}
        fontSize={fontSize}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex" style={{ minHeight: 0 }}>
        {/* LEFT PANEL - UPCOMING EVENTS */}
        <LeftPanel
          events={upcomingEvents}
          colors={colors}
          width={layout.leftPanelWidth}
          fontSize={fontSize}
        />

        {/* CENTER HERO */}
        <CenterHero
          item={currentHero}
          colors={colors}
          config={config}
          width={layout.centerPanelWidth}
          fontSize={fontSize}
        />

        {/* RIGHT PANEL - NEWS */}
        <RightPanel
          article={currentNewsArticle}
          articleIndex={currentNewsIndex}
          totalArticles={filteredNews.length}
          colors={colors}
          config={config}
          width={layout.rightPanelWidth}
          fontSize={fontSize}
        />
      </div>

      {/* FOOTER */}
      <Footer
        sponsorGroup={currentSponsorGroup}
        config={config}
        height={layout.footerHeight}
        colors={colors}
        lastRefresh={lastRefresh}
        lastScrape={lastScrape}
        currentTime={currentTime}
        fontSize={fontSize}
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
// CALENDAR ICON (Consistent SVG across all platforms)
// ============================================================

function CalendarIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <rect x="3" y="6" width="18" height="15" rx="2" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M3 10h18" stroke={color} strokeWidth="2"/>
      <path d="M7 3v4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M17 3v4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="8" cy="14" r="1" fill={color}/>
      <circle cx="12" cy="14" r="1" fill={color}/>
      <circle cx="16" cy="14" r="1" fill={color}/>
      <circle cx="8" cy="18" r="1" fill={color}/>
      <circle cx="12" cy="18" r="1" fill={color}/>
    </svg>
  );
}

// ============================================================
// HEADER COMPONENT
// ============================================================

function Header({ config, currentTime, weather, colors, height = 120, fontSize }) {
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

  // Scale logo to 80% of header height
  const logoHeight = Math.floor(height * 0.8);

  return (
    <div
      className="flex items-center justify-between px-8 relative"
      style={{
        height: `${height}px`,
        backgroundColor: colors.primary,
        color: 'white'
      }}
    >
      {/* Logo - Left aligned */}
      <div className="flex items-center gap-4 z-10">
        {config.branding?.clubLogoPath ? (
          <img
            src={config.branding.clubLogoPath}
            alt={config.branding.clubName || 'Club Logo'}
            style={{ height: `${logoHeight}px`, objectFit: 'contain' }}
          />
        ) : (
          <div style={{ fontSize: `${fontSize('6xl')}px` }}>🚣</div>
        )}
        <div>
          <div className="font-bold" style={{ fontSize: `${fontSize('4xl')}px` }}>
            {config.branding?.clubName || 'LMRC'}
          </div>
          <div className="opacity-80" style={{ fontSize: `${fontSize('sm')}px` }}>
            {config.branding?.tagline || ''}
          </div>
        </div>
      </div>

      {/* Date & Time - Absolutely centered on screen */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
        style={{ zIndex: 5 }}
      >
        <div className="font-semibold" style={{ fontSize: `${fontSize('2xl')}px` }}>
          {formatDate()}
        </div>
        <div style={{ fontSize: `${fontSize('xl')}px` }}>{formatTime()}</div>
      </div>

      {/* Weather - Right aligned */}
      <div className="flex items-center gap-4 z-10">
        {weather && weather.temperature != null ? (
          <>
            <div style={{ fontSize: `${fontSize('5xl')}px` }}>
              {getWeatherIcon(weather.icon, weather.temperature)}
            </div>
            <div>
              <div className="font-bold" style={{ fontSize: `${fontSize('4xl')}px` }}>
                {weather.temperature}°C
              </div>
              <div className="opacity-80" style={{ fontSize: `${fontSize('sm')}px` }}>
                {weather.location || 'Local'}
              </div>
              {weather.windSpeed != null && (
                <div className="opacity-80 flex items-center gap-1 mt-1" style={{ fontSize: `${fontSize('sm')}px` }}>
                  {getWindArrow(weather.windDirection)}
                  <span>{weather.windSpeed} km/h {getWindDirection(weather.windDirection)}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: `${fontSize('2xl')}px` }}>--°C</div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LEFT PANEL - UPCOMING EVENTS
// ============================================================

function LeftPanel({ events, colors, width = 35, fontSize }) {
  return (
    <div
      className="p-6 overflow-hidden"
      style={{
        width: `${width}%`,
        backgroundColor: colors.secondary,
        color: 'white'
      }}
    >
      <h2 className="font-bold mb-6" style={{ fontSize: `${fontSize('3xl')}px` }}>
        Upcoming Events
      </h2>

      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-start gap-3">
                <div style={{ width: `${fontSize('3xl')}px`, height: `${fontSize('3xl')}px`, flexShrink: 0 }}>
                  <CalendarIcon size={fontSize('3xl')} color="white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold" style={{ fontSize: `${fontSize('xl')}px` }}>
                    {event.title}
                  </div>
                  {event.date && (
                    <div className="opacity-80 mt-1" style={{ fontSize: `${fontSize('base')}px` }}>
                      {event.date}
                    </div>
                  )}
                  {event.location && (
                    <div className="opacity-80 mt-1 flex items-center gap-1" style={{ fontSize: `${fontSize('base')}px` }}>
                      <span>📍</span>
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 opacity-60">
            <div className="mb-4 flex justify-center">
              <CalendarIcon size={fontSize('5xl')} color="white" />
            </div>
            <div style={{ fontSize: `${fontSize('lg')}px` }}>No upcoming events</div>
            <div className="mt-2" style={{ fontSize: `${fontSize('sm')}px` }}>
              Check the website for updates
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CENTER HERO - ROTATING CONTENT
// ============================================================

function CenterHero({ item, colors, config, width = 30, fontSize }) {
  if (!item) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          width: `${width}%`,
          backgroundColor: colors.background
        }}
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
            <div className="mb-6" style={{ fontSize: `${fontSize('9xl')}px` }}>🚣</div>
          )}
          <div className="font-bold mb-4" style={{ fontSize: `${fontSize('4xl')}px`, color: colors.primary }}>
            Lake Macquarie Rowing Club
          </div>
          <div style={{ fontSize: `${fontSize('2xl')}px`, color: colors.text }}>
            {config.branding?.tagline || 'Welcome to our club'}
          </div>
        </div>
      </div>
    );
  }

  if (item.type === 'photo') {
    return (
      <div
        className="relative overflow-hidden"
        style={{ width: `${width}%` }}
      >
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
          <div className="text-white font-bold" style={{ fontSize: `${fontSize('3xl')}px` }}>
            {item.title}
          </div>
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
        className="flex items-center justify-center p-12"
        style={{
          width: `${width}%`,
          backgroundColor: colors.accent
        }}
      >
        <div className="text-center max-w-4xl">
          <div className="mb-6" style={{ fontSize: `${fontSize('8xl')}px` }}>🏆</div>
          <div className="font-bold mb-6" style={{ fontSize: `${fontSize('5xl')}px`, color: colors.primary }}>
            {item.title}
          </div>
          {item.snippet && (
            <div style={{ fontSize: `${fontSize('2xl')}px`, color: colors.text }}>
              {item.snippet}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center p-12"
      style={{
        width: `${width}%`,
        backgroundColor: colors.background
      }}
    >
      <div className="text-center max-w-4xl">
        <div className="mb-6" style={{ fontSize: `${fontSize('7xl')}px` }}>📢</div>
        <div className="font-bold mb-6" style={{ fontSize: `${fontSize('4xl')}px`, color: colors.primary }}>
          {item.title}
        </div>
        {item.snippet && (
          <div style={{ fontSize: `${fontSize('2xl')}px`, color: colors.text }}>
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

function RightPanel({ article, articleIndex, totalArticles, colors, config, width = 35, fontSize }) {
  if (!article) {
    return (
      <div
        className="p-6 overflow-hidden flex flex-col"
        style={{
          width: `${width}%`,
          backgroundColor: colors.primary,
          color: 'white'
        }}
      >
        <h2 className="font-bold mb-6" style={{ fontSize: `${fontSize('3xl')}px` }}>
          Latest News
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center opacity-60">
            <div className="mb-4" style={{ fontSize: `${fontSize('5xl')}px` }}>📰</div>
            <div style={{ fontSize: `${fontSize('lg')}px` }}>No recent news</div>
          </div>
        </div>
      </div>
    );
  }

  // Get content (don't truncate HTML as it breaks tags)
  const maxLength = config?.news?.maxContentLength || 2000;
  const content = article.content || article.excerpt || '';

  // Only truncate plain text, not HTML content
  // HTML content (from tables, etc.) should display fully to avoid breaking tags
  const isHTML = content.includes('<');
  const displayContent = (!isHTML && content.length > maxLength)
    ? content.substring(0, maxLength) + '...'
    : content;

  return (
    <div
      className="p-6 overflow-hidden flex flex-col"
      style={{
        width: `${width}%`,
        backgroundColor: colors.primary,
        color: 'white'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold" style={{ fontSize: `${fontSize('3xl')}px` }}>
          Latest News
        </h2>
        {totalArticles > 1 && (
          <div className="opacity-70" style={{ fontSize: `${fontSize('sm')}px` }}>
            {articleIndex + 1}/{totalArticles}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Article Header */}
        <div className="mb-4">
          {article.isFeatured && (
            <div className="inline-block px-3 py-1 rounded font-bold mb-2"
                 style={{
                   fontSize: `${fontSize('xs')}px`,
                   backgroundColor: colors.accent,
                   color: colors.primary
                 }}>
              FEATURED
            </div>
          )}

          {article.date && (
            <div className="opacity-80 mb-2 flex items-center gap-2" style={{ fontSize: `${fontSize('sm')}px` }}>
              <CalendarIcon size={fontSize('base')} color="white" />
              <span>{article.date}</span>
            </div>
          )}

          <h3 className="font-bold leading-tight mb-4" style={{ fontSize: `${fontSize('2xl')}px` }}>
            {article.title}
          </h3>
        </div>

        {/* Article Content */}
        <div
          className="leading-relaxed opacity-90 news-content"
          style={{ fontSize: `${fontSize('lg')}px` }}
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />

        {/* Type Badge */}
        {article.type === 'result' && (
          <div className="mt-4 flex items-center gap-2 opacity-80" style={{ fontSize: `${fontSize('sm')}px` }}>
            <span style={{ fontSize: `${fontSize('2xl')}px` }}>🏆</span>
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

function Footer({ sponsorGroup, config, colors, lastRefresh, lastScrape, currentTime, height = 120, fontSize }) {
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

  // Calculate sponsor logo height (70% of footer height for main area)
  const sponsorHeight = Math.floor(height * 0.5);

  return (
    <div
      className="flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Sponsors Row - White Background */}
      <div
        className="flex-1 flex items-center justify-center px-8"
        style={{ backgroundColor: colors.white || '#FFFFFF', color: colors.text }}
      >
        {sponsorGroup && sponsorGroup.length > 0 ? (
          <div className="flex items-center gap-8">
            <div className="mr-4" style={{ fontSize: `${fontSize('sm')}px`, color: colors.text, opacity: 0.7 }}>
              Proudly supported by:
            </div>
            {sponsorGroup.map((sponsor, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center"
                style={{ height: `${sponsorHeight}px` }}
              >
                <img
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  className="max-h-full max-w-full object-contain"
                  style={{ maxHeight: `${sponsorHeight}px`, maxWidth: '150px' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: `${fontSize('sm')}px`, color: colors.text, opacity: 0.7 }}>
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
              <span className="font-medium" style={{ fontSize: `${fontSize('sm')}px` }}>
                {config.socialMedia.facebook.handle}
              </span>
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
              <span className="font-medium" style={{ fontSize: `${fontSize('sm')}px` }}>
                {config.socialMedia.instagram.handle}
              </span>
            </a>
          )}
        </div>

        {/* Data Scrape Status - Right */}
        <div className="flex items-center gap-2" style={{ fontSize: `${fontSize('xs')}px`, opacity: 0.7 }}>
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

export default Noticeboard;