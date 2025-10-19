import React, { useState, useEffect } from 'react';

// ============================================================
// MAIN NOTICEBOARD COMPONENT
// ============================================================

export default function Noticeboard() {
  const [config, setConfig] = useState(null);
  const [gallery, setGallery] = useState(null);
  const [events, setEvents] = useState(null);
  const [news, setNews] = useState(null);
  const [weather, setWeather] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [newsIndex, setNewsIndex] = useState(0);
  const [sponsorIndex, setSponsorIndex] = useState(0);
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

  // News panel rotation
  useEffect(() => {
    if (!config || !news?.news?.length) return;
    
    const maxItems = config.news?.itemsPerBatch || 7;
    const batches = Math.ceil(news.news.length / maxItems);
    
    if (batches <= 1) return;
    
    const rotationSeconds = config.timing?.newsPanelRotationSeconds || 45;
    const interval = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % batches);
    }, rotationSeconds * 1000);
    
    return () => clearInterval(interval);
  }, [config, news]);

  // Sponsor rotation
  useEffect(() => {
    if (!config?.sponsors?.length) return;
    
    const rotationSeconds = config.timing?.sponsorRotationSeconds || 30;
    const interval = setInterval(() => {
      setSponsorIndex(prev => (prev + 1) % config.sponsors.length);
    }, rotationSeconds * 1000);
    
    return () => clearInterval(interval);
  }, [config]);

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
      const [galleryRes, eventsRes, newsRes] = await Promise.all([
        fetch('/api/gallery'),
        fetch('/api/events'),
        fetch('/api/news')
      ]);

      const galleryData = await galleryRes.json();
      const eventsData = await eventsRes.json();
      const newsData = await newsRes.json();

      setGallery(galleryData);
      setEvents(eventsData);
      setNews(newsData);
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

  const getNewsItems = () => {
    if (!news?.news) return [];
    
    const maxItems = config?.news?.itemsPerBatch || 7;
    const start = newsIndex * maxItems;
    const end = start + maxItems;
    
    return news.news.slice(start, end);
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
  const newsItems = getNewsItems();
  const upcomingEvents = getUpcomingEvents();
  const currentSponsor = config.sponsors?.[sponsorIndex];

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
      <div className="flex-1 flex">
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
          newsItems={newsItems}
          colors={colors}
        />
      </div>

      {/* FOOTER */}
      <Footer 
        sponsor={currentSponsor}
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
// RIGHT PANEL - NEWS & RESULTS
// ============================================================

function RightPanel({ newsItems, colors }) {
  return (
    <div 
      className="w-1/4 p-6 overflow-hidden"
      style={{ backgroundColor: colors.primary, color: 'white' }}
    >
      <h2 className="text-3xl font-bold mb-6">Latest News</h2>
      
      <div className="space-y-4">
        {newsItems.length > 0 ? (
          newsItems.map((item, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">
                  {item.type === 'result' ? '🏆' : '📰'}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold leading-tight">
                    {item.title}
                  </div>
                  {item.date && (
                    <div className="text-xs opacity-70 mt-2">{item.date}</div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 opacity-60">
            <div className="text-5xl mb-4">📰</div>
            <div className="text-lg">No recent news</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FOOTER - SPONSORS & SOCIAL MEDIA
// ============================================================

function Footer({ sponsor, config, colors }) {
  return (
    <div 
      className="h-20 flex items-center justify-between px-8"
      style={{ backgroundColor: colors.primary, color: 'white' }}
    >
      {/* Sponsor */}
      <div className="flex items-center gap-4">
        {sponsor ? (
          <>
            <div className="text-sm opacity-70">Proudly supported by</div>
            <div className="text-2xl font-bold">{sponsor.name}</div>
          </>
        ) : (
          <div className="text-sm opacity-70">Thank you to our sponsors</div>
        )}
      </div>

      {/* Social Media */}
      <div className="flex items-center gap-6">
        {config.socialMedia?.facebook?.enabled && (
          <div className="flex items-center gap-2">
            <div className="text-3xl">📘</div>
            <div className="text-lg">{config.socialMedia.facebook.handle}</div>
          </div>
        )}
        {config.socialMedia?.instagram?.enabled && (
          <div className="flex items-center gap-2">
            <div className="text-3xl">📸</div>
            <div className="text-lg">{config.socialMedia.instagram.handle}</div>
          </div>
        )}
      </div>
    </div>
  );
}