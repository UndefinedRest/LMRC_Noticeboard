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
    if (!config?.weather?.bomStationId) return;
    
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

      const galleryData = await galleryRes.json();
      const eventsData = await eventsRes.json();
      const newsData = await newsRes.json();
      const sponsorsData = await sponsorsRes.json();

      setGallery(galleryData);
      setEvents(eventsData);
      setNews(newsData);
      setSponsors(sponsorsData);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const fetchWeather = async () => {
    try {
      const stationId = config?.weather?.bomStationId || '061055';
      const bomUrl = `http://www.bom.gov.au/fwo/IDN60801/IDN60801.${stationId}.json`;
      
      const res = await fetch(bomUrl);
      const data = await res.json();
      
      if (data?.observations?.data?.[0]) {
        setWeather(data.observations.data[0]);
      }
    } catch (err) {
      console.error('Error fetching weather:', err);
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
      />
    </div>
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
        <div className="text-6xl">🚣</div>
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
        {weather ? (
          <>
            <div className="text-5xl">
              {weather.temp > 25 ? '☀️' : weather.temp > 15 ? '⛅' : '☁️'}
            </div>
            <div>
              <div className="text-3xl font-bold">{weather.air_temp}°C</div>
              <div className="text-sm opacity-80">{config.weather?.location || 'Local'}</div>
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
          <div className="text-9xl mb-6">🚣</div>
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

function Footer({ sponsorGroup, config, colors }) {
  return (
    <div 
      className="h-32 flex flex-col justify-center px-8"
      style={{ backgroundColor: colors.primary, color: 'white' }}
    >
      {/* Sponsors Row */}
      {sponsorGroup && sponsorGroup.length > 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-8">
            <div className="text-sm opacity-70 mr-4">
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
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm opacity-70">
            Thank you to our club sponsors
          </div>
        </div>
      )}

      {/* Social Media Row */}
      <div className="border-t border-white border-opacity-20 pt-3 flex items-center justify-center gap-8">
        {config.socialMedia?.facebook?.enabled && (
          <div className="flex items-center gap-2">
            <div className="text-2xl">📘</div>
            <div className="text-base">{config.socialMedia.facebook.handle}</div>
          </div>
        )}
        {config.socialMedia?.instagram?.enabled && (
          <div className="flex items-center gap-2">
            <div className="text-2xl">📸</div>
            <div className="text-base">{config.socialMedia.instagram.handle}</div>
          </div>
        )}
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