import { useState, useEffect, useRef } from 'react';

/**
 * LMRC Noticeboard Configuration Editor
 * Modern web-based interface for managing config.json with comprehensive UX
 */
function ConfigEditor() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [healthData, setHealthData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mainContentRef = useRef(null);

  // Fetch configuration on mount
  useEffect(() => {
    fetchConfig();
    fetchHealth();
  }, []);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) handleSave();
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setMessage(null);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [hasUnsavedChanges]);

  // Scroll spy for active section
  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current) return;

      const sections = mainContentRef.current.querySelectorAll('[data-section]');
      let current = 'overview';

      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150) {
          current = section.getAttribute('data-section');
        }
      });

      setActiveSection(current);
    };

    const mainContent = mainContentRef.current;
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
      return () => mainContent.removeEventListener('scroll', handleScroll);
    }
  }, [config]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/config/full');
      if (!response.ok) throw new Error('Failed to fetch configuration');
      const data = await response.json();
      setConfig(data);
      setHasUnsavedChanges(false);
    } catch (err) {
      setMessage({ type: 'error', text: `Error loading config: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const response = await fetch('/api/config/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update configuration');
      }

      setMessage({ type: 'success', text: 'Configuration saved successfully! Changes will apply within 60 seconds.' });
      setHasUnsavedChanges(false);

      // Auto-clear success message after 4 seconds
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: `Error saving: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset to last saved backup? This will undo all current changes.')) return;

    try {
      setSaving(true);
      const response = await fetch('/api/config/reset', {
        method: 'POST'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset configuration');
      }

      setMessage({ type: 'success', text: 'Configuration restored from backup!' });
      await fetchConfig();
    } catch (err) {
      setMessage({ type: 'error', text: `Error resetting: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const updateNestedConfig = (section, key, subkey, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: {
          ...prev[section][key],
          [subkey]: value
        }
      }
    }));
    setHasUnsavedChanges(true);
  };

  const scrollToSection = (sectionId) => {
    if (!mainContentRef.current) return;

    const element = mainContentRef.current.querySelector(`[data-section="${sectionId}"]`);
    if (element) {
      const container = mainContentRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollOffset = elementRect.top - containerRect.top + container.scrollTop - 100;
      container.scrollTo({ top: scrollOffset, behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.loadingSpinner}></div>
          <div>Loading configuration...</div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Failed to load configuration</div>
      </div>
    );
  }

  const navigationItems = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'branding', icon: '🎨', label: 'Branding & Display' },
    { id: 'timing', icon: '⏱️', label: 'Timing & Rotation' },
    { id: 'gallery', icon: '📸', label: 'Gallery' },
    { id: 'events', icon: '📅', label: 'Events' },
    { id: 'news', icon: '📰', label: 'News' },
    { id: 'weather', icon: '🌤️', label: 'Weather' },
    { id: 'social', icon: '📱', label: 'Social Media' },
    { id: 'fallback', icon: '🔄', label: 'Fallback Settings' },
    { id: 'scraper', icon: '🕷️', label: 'Scraper' },
    { id: 'advanced', icon: '⚙️', label: 'Advanced' }
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.menuButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div>
            <h1 style={styles.title}>LMRC Noticeboard Configuration</h1>
            <p style={styles.subtitle}>Configure display settings, timing, and content options</p>
          </div>
        </div>
        <div style={styles.headerActions}>
          <a href="/" style={styles.backLink}>← Back to Noticeboard</a>
        </div>
      </header>

      {/* Status Bar */}
      {message && (
        <div style={{
          ...styles.statusBar,
          ...(message.type === 'error' ? styles.statusBarError : styles.statusBarSuccess)
        }}>
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            style={styles.statusBarClose}
            aria-label="Close message"
          >
            ✕
          </button>
        </div>
      )}

      {hasUnsavedChanges && !message && (
        <div style={{...styles.statusBar, ...styles.statusBarWarning}}>
          <span>⚠️ You have unsaved changes</span>
          <span style={styles.statusBarHint}>Press Ctrl+S to save</span>
        </div>
      )}

      {/* Main Layout */}
      <div style={styles.mainLayout}>
        {/* Sidebar Navigation */}
        <aside style={{
          ...styles.sidebar,
          ...(sidebarOpen ? {} : styles.sidebarClosed)
        }}>
          <nav style={styles.nav}>
            {navigationItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                style={{
                  ...styles.navItem,
                  ...(activeSection === item.id ? styles.navItemActive : {})
                }}
                aria-current={activeSection === item.id ? 'page' : undefined}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {sidebarOpen && <span style={styles.navLabel}>{item.label}</span>}
              </button>
            ))}
          </nav>

          {sidebarOpen && (
            <div style={styles.sidebarFooter}>
              <div style={styles.sidebarFooterText}>
                Keyboard Shortcuts
              </div>
              <div style={styles.shortcut}>
                <kbd style={styles.kbd}>Ctrl+S</kbd>
                <span>Save</span>
              </div>
              <div style={styles.shortcut}>
                <kbd style={styles.kbd}>Esc</kbd>
                <span>Clear alerts</span>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main ref={mainContentRef} style={styles.mainContent}>
          <div style={styles.contentInner}>
            {/* Overview Dashboard */}
            <div data-section="overview">
              <OverviewDashboard
                config={config}
                healthData={healthData}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            </div>

            {/* Branding & Display */}
            <div data-section="branding">
              <Section title="Branding & Display" icon="🎨">
                <SubSection title="Club Identity">
                  <Field label="Club Name" required>
                    <input
                      type="text"
                      value={config.branding?.clubName || ''}
                      onChange={(e) => updateConfig('branding', 'clubName', e.target.value)}
                      style={styles.input}
                      placeholder="Lake Macquarie Rowing Club"
                    />
                  </Field>

                  <Field label="Club Logo URL" help="Full URL to club logo image">
                    <input
                      type="url"
                      value={config.branding?.clubLogoPath || ''}
                      onChange={(e) => updateConfig('branding', 'clubLogoPath', e.target.value)}
                      style={styles.input}
                      placeholder="https://..."
                    />
                  </Field>

                  <Field label="Tagline" help="Optional tagline displayed below club name">
                    <input
                      type="text"
                      value={config.branding?.tagline || ''}
                      onChange={(e) => updateConfig('branding', 'tagline', e.target.value)}
                      style={styles.input}
                      placeholder="Optional tagline text"
                    />
                  </Field>
                </SubSection>

                <SubSection title="Club Colors">
                  <div style={styles.colorGrid}>
                    <ColorField
                      label="Primary Color"
                      value={config.branding?.clubColors?.primary || '#2778bf'}
                      onChange={(val) => updateNestedConfig('branding', 'clubColors', 'primary', val)}
                    />
                    <ColorField
                      label="Secondary Color"
                      value={config.branding?.clubColors?.secondary || '#1a5a8f'}
                      onChange={(val) => updateNestedConfig('branding', 'clubColors', 'secondary', val)}
                    />
                    <ColorField
                      label="Accent Color"
                      value={config.branding?.clubColors?.accent || '#FFD700'}
                      onChange={(val) => updateNestedConfig('branding', 'clubColors', 'accent', val)}
                    />
                    <ColorField
                      label="Background Color"
                      value={config.branding?.clubColors?.background || '#F5F5F5'}
                      onChange={(val) => updateNestedConfig('branding', 'clubColors', 'background', val)}
                    />
                    <ColorField
                      label="Text Color"
                      value={config.branding?.clubColors?.text || '#333333'}
                      onChange={(val) => updateNestedConfig('branding', 'clubColors', 'text', val)}
                    />
                    <ColorField
                      label="White Color"
                      value={config.branding?.clubColors?.white || '#FFFFFF'}
                      onChange={(val) => updateNestedConfig('branding', 'clubColors', 'white', val)}
                    />
                  </div>
                </SubSection>

                <SubSection title="Display Settings">
                  <Field label="Display Name" help="Name shown in browser tab">
                    <input
                      type="text"
                      value={config.display?.name || ''}
                      onChange={(e) => updateConfig('display', 'name', e.target.value)}
                      style={styles.input}
                    />
                  </Field>

                  <FieldGroup title="Panel Layout (%)">
                    <Field label="Left Panel" inline>
                      <input
                        type="number"
                        value={config.display?.layout?.leftPanelWidth || 25}
                        onChange={(e) => updateNestedConfig('display', 'layout', 'leftPanelWidth', parseInt(e.target.value))}
                        style={styles.inputSmall}
                        min="15"
                        max="40"
                      />
                    </Field>
                    <Field label="Center Panel" inline>
                      <input
                        type="number"
                        value={config.display?.layout?.centerPanelWidth || 50}
                        onChange={(e) => updateNestedConfig('display', 'layout', 'centerPanelWidth', parseInt(e.target.value))}
                        style={styles.inputSmall}
                        min="30"
                        max="70"
                      />
                    </Field>
                    <Field label="Right Panel" inline>
                      <input
                        type="number"
                        value={config.display?.layout?.rightPanelWidth || 25}
                        onChange={(e) => updateNestedConfig('display', 'layout', 'rightPanelWidth', parseInt(e.target.value))}
                        style={styles.inputSmall}
                        min="15"
                        max="40"
                      />
                    </Field>
                  </FieldGroup>
                </SubSection>
              </Section>
            </div>

            {/* Timing & Rotation */}
            <div data-section="timing">
              <Section title="Timing & Rotation" icon="⏱️">
                <div style={styles.infoBox}>
                  <strong>💡 Tip:</strong> Shorter rotation times create more dynamic displays, longer times allow for better content absorption.
                </div>

                <Field label="Hero Rotation" help="How long each photo displays in the center panel">
                  <div style={styles.sliderGroup}>
                    <input
                      type="range"
                      value={config.timing?.heroRotationSeconds || 15}
                      onChange={(e) => updateConfig('timing', 'heroRotationSeconds', parseInt(e.target.value))}
                      style={styles.slider}
                      min="5"
                      max="60"
                    />
                    <input
                      type="number"
                      value={config.timing?.heroRotationSeconds || 15}
                      onChange={(e) => updateConfig('timing', 'heroRotationSeconds', parseInt(e.target.value))}
                      style={styles.inputSmall}
                      min="5"
                      max="60"
                    />
                    <span style={styles.unit}>seconds</span>
                  </div>
                </Field>

                <Field label="News Rotation" help="How long each news item displays">
                  <div style={styles.sliderGroup}>
                    <input
                      type="range"
                      value={config.timing?.newsPanelRotationSeconds || 45}
                      onChange={(e) => updateConfig('timing', 'newsPanelRotationSeconds', parseInt(e.target.value))}
                      style={styles.slider}
                      min="10"
                      max="120"
                    />
                    <input
                      type="number"
                      value={config.timing?.newsPanelRotationSeconds || 45}
                      onChange={(e) => updateConfig('timing', 'newsPanelRotationSeconds', parseInt(e.target.value))}
                      style={styles.inputSmall}
                      min="10"
                      max="120"
                    />
                    <span style={styles.unit}>seconds</span>
                  </div>
                </Field>

                <Field label="Sponsor Rotation" help="How long each sponsor group displays">
                  <div style={styles.sliderGroup}>
                    <input
                      type="range"
                      value={config.timing?.sponsorRotationSeconds || 30}
                      onChange={(e) => updateConfig('timing', 'sponsorRotationSeconds', parseInt(e.target.value))}
                      style={styles.slider}
                      min="10"
                      max="60"
                    />
                    <input
                      type="number"
                      value={config.timing?.sponsorRotationSeconds || 30}
                      onChange={(e) => updateConfig('timing', 'sponsorRotationSeconds', parseInt(e.target.value))}
                      style={styles.inputSmall}
                      min="10"
                      max="60"
                    />
                    <span style={styles.unit}>seconds</span>
                  </div>
                </Field>

                <Field label="Data Refresh" help="How often to check for new content from the scraper">
                  <div style={styles.sliderGroup}>
                    <input
                      type="range"
                      value={config.timing?.dataRefreshSeconds || 60}
                      onChange={(e) => updateConfig('timing', 'dataRefreshSeconds', parseInt(e.target.value))}
                      style={styles.slider}
                      min="30"
                      max="300"
                    />
                    <input
                      type="number"
                      value={config.timing?.dataRefreshSeconds || 60}
                      onChange={(e) => updateConfig('timing', 'dataRefreshSeconds', parseInt(e.target.value))}
                      style={styles.inputSmall}
                      min="30"
                      max="300"
                    />
                    <span style={styles.unit}>seconds</span>
                  </div>
                </Field>

                <Field label="Weather Refresh" help="How often to update weather data from the API">
                  <div style={styles.sliderGroup}>
                    <input
                      type="range"
                      value={config.timing?.weatherRefreshMinutes || 30}
                      onChange={(e) => updateConfig('timing', 'weatherRefreshMinutes', parseInt(e.target.value))}
                      style={styles.slider}
                      min="10"
                      max="120"
                    />
                    <input
                      type="number"
                      value={config.timing?.weatherRefreshMinutes || 30}
                      onChange={(e) => updateConfig('timing', 'weatherRefreshMinutes', parseInt(e.target.value))}
                      style={styles.inputSmall}
                      min="10"
                      max="120"
                    />
                    <span style={styles.unit}>minutes</span>
                  </div>
                </Field>
              </Section>
            </div>

            {/* Gallery */}
            <div data-section="gallery">
              <Section title="Gallery Settings" icon="📸">
                <Field label="Max Albums to Display" help="Maximum number of photo albums to show in rotation">
                  <input
                    type="number"
                    value={config.gallery?.maxAlbumsToDisplay || 10}
                    onChange={(e) => updateConfig('gallery', 'maxAlbumsToDisplay', parseInt(e.target.value))}
                    style={styles.input}
                    min="1"
                    max="50"
                  />
                </Field>

                <Field label="Max Photos per Album" help="Maximum photos to include from each album">
                  <input
                    type="number"
                    value={config.gallery?.maxPhotosPerAlbum || 20}
                    onChange={(e) => updateConfig('gallery', 'maxPhotosPerAlbum', parseInt(e.target.value))}
                    style={styles.input}
                    min="5"
                    max="100"
                  />
                </Field>

                <ToggleField
                  label="Public Albums Only"
                  help="Only display albums marked as public on RevSport"
                  checked={config.gallery?.publicOnly || false}
                  onChange={(val) => updateConfig('gallery', 'publicOnly', val)}
                />

                <ToggleField
                  label="Prioritize Recent Albums"
                  help="Show newest albums first in rotation"
                  checked={config.gallery?.prioritizeRecent || false}
                  onChange={(val) => updateConfig('gallery', 'prioritizeRecent', val)}
                />
              </Section>
            </div>

            {/* Events */}
            <div data-section="events">
              <Section title="Events Settings" icon="📅">
                <Field label="Max Events to Display" help="Maximum number of events to show in the events panel">
                  <input
                    type="number"
                    value={config.events?.maxEventsToDisplay || 7}
                    onChange={(e) => updateConfig('events', 'maxEventsToDisplay', parseInt(e.target.value))}
                    style={styles.input}
                    min="1"
                    max="20"
                  />
                </Field>

                <Field label="Days Ahead to Show" help="How far into the future to display events">
                  <input
                    type="number"
                    value={config.events?.daysAhead || 90}
                    onChange={(e) => updateConfig('events', 'daysAhead', parseInt(e.target.value))}
                    style={styles.input}
                    min="7"
                    max="365"
                  />
                </Field>

                <ToggleField
                  label="Show Past Events"
                  help="Include events that have already occurred"
                  checked={config.events?.showPastEvents || false}
                  onChange={(val) => updateConfig('events', 'showPastEvents', val)}
                />
              </Section>
            </div>

            {/* News */}
            <div data-section="news">
              <Section title="News Settings" icon="📰">
                <Field label="Max Items to Display" help="Maximum number of news articles to show in rotation">
                  <input
                    type="number"
                    value={config.news?.maxItemsToDisplay || 10}
                    onChange={(e) => updateConfig('news', 'maxItemsToDisplay', parseInt(e.target.value))}
                    style={styles.input}
                    min="1"
                    max="50"
                  />
                </Field>

                <Field label="Max Content Length" help="Maximum character count for news content (will truncate)">
                  <input
                    type="number"
                    value={config.news?.maxContentLength || 500}
                    onChange={(e) => updateConfig('news', 'maxContentLength', parseInt(e.target.value))}
                    style={styles.input}
                    min="100"
                    max="2000"
                  />
                </Field>

                <SubSection title="Content Filters">
                  <ToggleField
                    label="Show Featured Only"
                    help="Only display news items marked as featured"
                    checked={config.news?.showFeaturedOnly || false}
                    onChange={(val) => updateConfig('news', 'showFeaturedOnly', val)}
                  />

                  <ToggleField
                    label="Show Results"
                    help="Include race results and competition outcomes"
                    checked={config.news?.showResults !== false}
                    onChange={(val) => updateConfig('news', 'showResults', val)}
                  />

                  <ToggleField
                    label="Show Announcements"
                    help="Include club announcements and updates"
                    checked={config.news?.showAnnouncements !== false}
                    onChange={(val) => updateConfig('news', 'showAnnouncements', val)}
                  />
                </SubSection>
              </Section>
            </div>

            {/* Weather */}
            <div data-section="weather">
              <Section title="Weather Settings" icon="🌤️">
                <div style={styles.infoBox}>
                  <strong>ℹ️ Note:</strong> Weather data is fetched from the OpenWeatherMap API. Coordinates should match your club location.
                </div>

                <Field label="Location Name" help="Display name for the weather location">
                  <input
                    type="text"
                    value={config.weather?.location || ''}
                    onChange={(e) => updateConfig('weather', 'location', e.target.value)}
                    style={styles.input}
                    placeholder="Rathmines"
                  />
                </Field>

                <FieldGroup title="Coordinates">
                  <Field label="Latitude" inline>
                    <input
                      type="number"
                      step="0.0001"
                      value={config.weather?.latitude || 0}
                      onChange={(e) => updateConfig('weather', 'latitude', parseFloat(e.target.value))}
                      style={styles.input}
                      placeholder="-33.0333"
                    />
                  </Field>
                  <Field label="Longitude" inline>
                    <input
                      type="number"
                      step="0.0001"
                      value={config.weather?.longitude || 0}
                      onChange={(e) => updateConfig('weather', 'longitude', parseFloat(e.target.value))}
                      style={styles.input}
                      placeholder="151.60"
                    />
                  </Field>
                </FieldGroup>

                <Field label="Units">
                  <select
                    value={config.weather?.units || 'metric'}
                    onChange={(e) => updateConfig('weather', 'units', e.target.value)}
                    style={styles.select}
                  >
                    <option value="metric">Metric (°C, km/h)</option>
                    <option value="imperial">Imperial (°F, mph)</option>
                  </select>
                </Field>

                <ToggleField
                  label="Show Forecast"
                  help="Display weather forecast in addition to current conditions"
                  checked={config.weather?.showForecast || false}
                  onChange={(val) => updateConfig('weather', 'showForecast', val)}
                />
              </Section>
            </div>

            {/* Social Media */}
            <div data-section="social">
              <Section title="Social Media" icon="📱">
                <SubSection title="Facebook">
                  <ToggleField
                    label="Enable Facebook"
                    help="Show Facebook information on the noticeboard"
                    checked={config.socialMedia?.facebook?.enabled !== false}
                    onChange={(val) => updateNestedConfig('socialMedia', 'facebook', 'enabled', val)}
                  />

                  <Field label="Page Name">
                    <input
                      type="text"
                      value={config.socialMedia?.facebook?.handle || ''}
                      onChange={(e) => updateNestedConfig('socialMedia', 'facebook', 'handle', e.target.value)}
                      style={styles.input}
                      placeholder="Lake Macquarie Rowing Club"
                    />
                  </Field>

                  <Field label="Facebook Page URL">
                    <input
                      type="url"
                      value={config.socialMedia?.facebook?.url || ''}
                      onChange={(e) => updateNestedConfig('socialMedia', 'facebook', 'url', e.target.value)}
                      style={styles.input}
                      placeholder="https://facebook.com/..."
                    />
                  </Field>
                </SubSection>

                <SubSection title="Instagram">
                  <ToggleField
                    label="Enable Instagram"
                    help="Show Instagram information on the noticeboard"
                    checked={config.socialMedia?.instagram?.enabled !== false}
                    onChange={(val) => updateNestedConfig('socialMedia', 'instagram', 'enabled', val)}
                  />

                  <Field label="Instagram Handle">
                    <input
                      type="text"
                      value={config.socialMedia?.instagram?.handle || ''}
                      onChange={(e) => updateNestedConfig('socialMedia', 'instagram', 'handle', e.target.value)}
                      style={styles.input}
                      placeholder="@lakemacquarierowingclub"
                    />
                  </Field>

                  <Field label="Instagram Profile URL">
                    <input
                      type="url"
                      value={config.socialMedia?.instagram?.url || ''}
                      onChange={(e) => updateNestedConfig('socialMedia', 'instagram', 'url', e.target.value)}
                      style={styles.input}
                      placeholder="https://instagram.com/..."
                    />
                  </Field>
                </SubSection>
              </Section>
            </div>

            {/* Fallback Settings */}
            <div data-section="fallback">
              <Section title="Fallback Settings" icon="🔄">
                <div style={styles.infoBox}>
                  <strong>💡 Purpose:</strong> Fallback settings provide default content when the scraper fails or data is unavailable.
                </div>

                <ToggleField
                  label="Enable Fallback Mode"
                  help="Show fallback content when scraped data is unavailable"
                  checked={config.fallback?.enabled !== false}
                  onChange={(val) => updateConfig('fallback', 'enabled', val)}
                />

                <Field label="Fallback Logo Path" help="Local path to fallback club logo">
                  <input
                    type="text"
                    value={config.fallback?.clubLogoPath || ''}
                    onChange={(e) => updateConfig('fallback', 'clubLogoPath', e.target.value)}
                    style={styles.input}
                    placeholder="/assets/logo.png"
                  />
                </Field>

                <Field label="Fallback Message" help="Message to display when using fallback content">
                  <input
                    type="text"
                    value={config.fallback?.message || ''}
                    onChange={(e) => updateConfig('fallback', 'message', e.target.value)}
                    style={styles.input}
                    placeholder="Check our website for the latest updates"
                  />
                </Field>
              </Section>
            </div>

            {/* Scraper */}
            <div data-section="scraper">
              <Section title="Scraper Configuration" icon="🕷️">
                <div style={styles.warningBox}>
                  <strong>⚠️ Warning:</strong> Changing scraper settings may affect data collection reliability. Test thoroughly after changes.
                </div>

                <ToggleField
                  label="Schedule Hourly Scraping"
                  help="Automatically run scraper every hour via cron job (requires server setup)"
                  checked={config.scraper?.scheduleHourly !== false}
                  onChange={(val) => updateConfig('scraper', 'scheduleHourly', val)}
                />

                <Field label="Max Retries" help="Number of retry attempts if scraper fails">
                  <input
                    type="number"
                    value={config.scraper?.maxRetries || 3}
                    onChange={(e) => updateConfig('scraper', 'maxRetries', parseInt(e.target.value))}
                    style={styles.input}
                    min="1"
                    max="10"
                  />
                </Field>

                <Field label="Timeout (seconds)" help="Maximum time to wait for page loads">
                  <input
                    type="number"
                    value={config.scraper?.timeoutSeconds || 30}
                    onChange={(e) => updateConfig('scraper', 'timeoutSeconds', parseInt(e.target.value))}
                    style={styles.input}
                    min="10"
                    max="120"
                  />
                </Field>
              </Section>
            </div>

            {/* Advanced */}
            <div data-section="advanced">
              <Section title="Advanced Settings" icon="⚙️">
                <SubSection title="Animations & Effects">
                  <ToggleField
                    label="Enable Animations"
                    help="Enable smooth transitions and animations throughout the interface"
                    checked={config.advanced?.enableAnimations !== false}
                    onChange={(val) => updateConfig('advanced', 'enableAnimations', val)}
                  />

                  <ToggleField
                    label="Enable Ken Burns Effect"
                    help="Apply slow pan/zoom effect to photos in the hero panel"
                    checked={config.advanced?.enableKenBurnsEffect !== false}
                    onChange={(val) => updateConfig('advanced', 'enableKenBurnsEffect', val)}
                  />

                  <Field label="Transition Duration (ms)" help="Duration of content transitions">
                    <input
                      type="number"
                      value={config.advanced?.transitionDuration || 500}
                      onChange={(e) => updateConfig('advanced', 'transitionDuration', parseInt(e.target.value))}
                      style={styles.input}
                      min="100"
                      max="2000"
                    />
                  </Field>
                </SubSection>

                <SubSection title="Debugging">
                  <Field label="Log Level" help="Console logging verbosity">
                    <select
                      value={config.advanced?.logLevel || 'info'}
                      onChange={(e) => updateConfig('advanced', 'logLevel', e.target.value)}
                      style={styles.select}
                    >
                      <option value="error">Error (minimal)</option>
                      <option value="warn">Warning</option>
                      <option value="info">Info (recommended)</option>
                      <option value="debug">Debug (verbose)</option>
                    </select>
                  </Field>
                </SubSection>
              </Section>
            </div>

            {/* Bottom padding for scroll */}
            <div style={{ height: '100px' }}></div>
          </div>
        </main>
      </div>

      {/* Action Bar */}
      <div style={styles.actionBar}>
        <div style={styles.actionBarInner}>
          <div style={styles.actionBarLeft}>
            {hasUnsavedChanges && (
              <span style={styles.changeIndicator}>
                {Object.keys(config).filter(() => true).length} section(s) modified
              </span>
            )}
          </div>
          <div style={styles.actionBarRight}>
            <button
              onClick={handleReset}
              disabled={saving}
              style={styles.resetButton}
            >
              🔄 Reset to Backup
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              style={{
                ...styles.saveButton,
                ...(hasUnsavedChanges ? styles.saveButtonActive : {})
              }}
            >
              {saving ? '💾 Saving...' : hasUnsavedChanges ? '💾 Save Changes' : '✓ Saved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function OverviewDashboard({ config, healthData, hasUnsavedChanges }) {
  return (
    <div style={styles.overview}>
      <h2 style={styles.overviewTitle}>Configuration Overview</h2>

      <div style={styles.statsGrid}>
        <StatCard
          icon="🎨"
          label="Branding"
          value={config.branding?.clubName || 'Not set'}
          status="configured"
        />
        <StatCard
          icon="📸"
          label="Gallery Albums"
          value={`Up to ${config.gallery?.maxAlbumsToDisplay || 0}`}
          status="configured"
        />
        <StatCard
          icon="📅"
          label="Events Display"
          value={`${config.events?.maxEventsToDisplay || 0} events`}
          status="configured"
        />
        <StatCard
          icon="📰"
          label="News Items"
          value={`${config.news?.maxItemsToDisplay || 0} articles`}
          status="configured"
        />
      </div>

      {healthData && (
        <div style={styles.healthSection}>
          <h3 style={styles.healthTitle}>System Health</h3>
          <div style={styles.healthGrid}>
            <HealthIndicator
              label="Server Status"
              status={healthData.status === 'healthy' ? 'healthy' : 'warning'}
              message={healthData.status === 'healthy' ? 'Running' : 'Issues detected'}
            />
            <HealthIndicator
              label="Gallery Data"
              status={healthData.data?.gallery ? 'healthy' : 'warning'}
              message={healthData.data?.gallery ? `${healthData.data.gallery.itemCount || 0} items` : 'No data'}
            />
            <HealthIndicator
              label="Events Data"
              status={healthData.data?.events ? 'healthy' : 'warning'}
              message={healthData.data?.events ? `${healthData.data.events.itemCount || 0} items` : 'No data'}
            />
            <HealthIndicator
              label="News Data"
              status={healthData.data?.news ? 'healthy' : 'warning'}
              message={healthData.data?.news ? `${healthData.data.news.itemCount || 0} items` : 'No data'}
            />
          </div>
        </div>
      )}

      {hasUnsavedChanges && (
        <div style={{...styles.infoBox, marginTop: '24px', backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107'}}>
          <strong>⚠️ Unsaved Changes:</strong> Your modifications will take effect within 60 seconds after saving.
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, status }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statContent}>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
      </div>
      {status && (
        <div style={{
          ...styles.statBadge,
          ...(status === 'configured' ? styles.statBadgeConfigured : {})
        }}>
          ✓
        </div>
      )}
    </div>
  );
}

function HealthIndicator({ label, status, message }) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#999';
    }
  };

  return (
    <div style={styles.healthItem}>
      <div style={{...styles.healthDot, backgroundColor: getStatusColor()}}></div>
      <div>
        <div style={styles.healthLabel}>{label}</div>
        <div style={styles.healthMessage}>{message}</div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>
        <span style={styles.sectionIcon}>{icon}</span>
        {title}
      </h2>
      <div style={styles.sectionContent}>
        {children}
      </div>
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div style={styles.subsection}>
      <h3 style={styles.subsectionTitle}>{title}</h3>
      <div style={styles.subsectionContent}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, help, required, inline, children }) {
  return (
    <div style={{
      ...styles.field,
      ...(inline ? styles.fieldInline : {})
    }}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}>*</span>}
        {help && <span style={styles.helpText}>{help}</span>}
      </label>
      {children}
    </div>
  );
}

function FieldGroup({ title, children }) {
  return (
    <div style={styles.fieldGroup}>
      {title && <div style={styles.fieldGroupTitle}>{title}</div>}
      <div style={styles.fieldGroupContent}>
        {children}
      </div>
    </div>
  );
}

function ToggleField({ label, help, checked, onChange }) {
  return (
    <div style={styles.toggleField}>
      <label style={styles.toggleLabel}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={styles.toggleInput}
        />
        <span style={{
          ...styles.toggleSwitch,
          ...(checked ? styles.toggleSwitchActive : {})
        }}>
          <span style={{
            ...styles.toggleSlider,
            ...(checked ? styles.toggleSliderActive : {})
          }}>
            {checked ? '✓' : '✕'}
          </span>
        </span>
        <span style={styles.toggleText}>
          <span style={styles.toggleTextLabel}>
            {label}
            <span style={{
              marginLeft: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: checked ? '#38a169' : '#c53030'
            }}>
              {checked ? 'ON' : 'OFF'}
            </span>
          </span>
          {help && <span style={styles.toggleTextHelp}>{help}</span>}
        </span>
      </label>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div style={styles.colorField}>
      <label style={styles.colorLabel}>{label}</label>
      <div style={styles.colorInputGroup}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={styles.colorPicker}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={styles.colorText}
          placeholder="#000000"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
      <div style={{...styles.colorPreview, backgroundColor: value}}></div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    height: '100vh',
    backgroundColor: '#f5f7fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },

  // Header
  header: {
    backgroundColor: '#2778bf',
    color: 'white',
    padding: '20px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  menuButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    opacity: 0.9
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  backLink: {
    color: 'white',
    textDecoration: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
    border: '1px solid rgba(255,255,255,0.2)'
  },

  // Status Bar
  statusBar: {
    padding: '12px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 500
  },
  statusBarSuccess: {
    backgroundColor: '#4caf50',
    color: 'white'
  },
  statusBarError: {
    backgroundColor: '#f44336',
    color: 'white'
  },
  statusBarWarning: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    borderBottom: '1px solid #ffeaa7'
  },
  statusBarClose: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'inherit',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    opacity: 0.8
  },
  statusBarHint: {
    fontSize: '12px',
    opacity: 0.8
  },

  // Loading
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px',
    fontSize: '16px',
    color: '#666',
    gap: '16px'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #2778bf',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  error: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '16px',
    color: '#d32f2f'
  },

  // Main Layout
  mainLayout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },

  // Sidebar
  sidebar: {
    width: '240px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e1e8ed',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    overflow: 'hidden'
  },
  sidebarClosed: {
    width: '64px'
  },
  nav: {
    flex: 1,
    padding: '16px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
    textAlign: 'left',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  navItemActive: {
    backgroundColor: '#e3f2fd',
    color: '#2778bf',
    fontWeight: 600
  },
  navIcon: {
    fontSize: '20px',
    flexShrink: 0
  },
  navLabel: {
    flex: 1
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid #e1e8ed',
    fontSize: '12px',
    color: '#666'
  },
  sidebarFooterText: {
    fontWeight: 600,
    marginBottom: '8px'
  },
  shortcut: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
    fontSize: '11px'
  },
  kbd: {
    backgroundColor: '#f5f5f5',
    border: '1px solid #ccc',
    borderRadius: '3px',
    padding: '2px 6px',
    fontSize: '10px',
    fontFamily: 'monospace'
  },

  // Main Content
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#f5f7fa',
    height: '100%'
  },
  contentInner: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '32px'
  },

  // Overview
  overview: {
    marginBottom: '32px'
  },
  overviewTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#333',
    marginBottom: '24px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  statIcon: {
    fontSize: '32px',
    flexShrink: 0
  },
  statContent: {
    flex: 1,
    minWidth: 0
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginTop: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  statBadge: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0
  },
  statBadgeConfigured: {
    backgroundColor: '#4caf50',
    color: 'white'
  },

  // Health
  healthSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
  },
  healthTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '16px'
  },
  healthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  healthItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  healthDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0
  },
  healthLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#333'
  },
  healthMessage: {
    fontSize: '12px',
    color: '#666'
  },

  // Section
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  sectionTitle: {
    margin: '0 0 24px 0',
    fontSize: '22px',
    fontWeight: 600,
    color: '#2778bf',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e1e8ed'
  },
  sectionIcon: {
    fontSize: '28px'
  },
  sectionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  // SubSection
  subsection: {
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0'
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#555',
    marginBottom: '16px'
  },
  subsectionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },

  // Field
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  fieldInline: {
    flex: 1
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  required: {
    color: '#f44336',
    marginLeft: '4px'
  },
  helpText: {
    fontSize: '12px',
    fontWeight: 400,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: '1.4'
  },

  // Field Group
  fieldGroup: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e1e8ed'
  },
  fieldGroupTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#555',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  fieldGroupContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },

  // Inputs
  input: {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
    backgroundColor: 'white'
  },
  inputSmall: {
    width: '80px',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    textAlign: 'center'
  },
  select: {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer'
  },

  // Slider
  sliderGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  slider: {
    flex: 1,
    height: '6px',
    outline: 'none',
    WebkitAppearance: 'none',
    backgroundColor: '#e1e8ed',
    borderRadius: '3px'
  },
  unit: {
    fontSize: '13px',
    color: '#666',
    minWidth: '60px'
  },

  // Toggle
  toggleField: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e1e8ed'
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    cursor: 'pointer'
  },
  toggleInput: {
    display: 'none'
  },
  toggleSwitch: {
    position: 'relative',
    width: '48px',
    height: '26px',
    backgroundColor: '#e53e3e',
    borderRadius: '13px',
    flexShrink: 0,
    transition: 'background-color 0.3s ease',
    marginTop: '2px',
    border: '2px solid #c53030',
    cursor: 'pointer'
  },
  toggleSwitchActive: {
    backgroundColor: '#48bb78',
    borderColor: '#38a169'
  },
  toggleSlider: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '18px',
    height: '18px',
    backgroundColor: 'white',
    borderRadius: '50%',
    transition: 'transform 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  toggleSliderActive: {
    transform: 'translateX(22px)'
  },
  toggleText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  toggleTextLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#333'
  },
  toggleTextHelp: {
    fontSize: '12px',
    color: '#666',
    lineHeight: '1.4'
  },

  // Color
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px'
  },
  colorField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  colorLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#333'
  },
  colorInputGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  colorPicker: {
    width: '48px',
    height: '48px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    outline: 'none'
  },
  colorText: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'monospace',
    textTransform: 'uppercase'
  },
  colorPreview: {
    height: '24px',
    borderRadius: '4px',
    border: '1px solid #d1d5db'
  },

  // Info Boxes
  infoBox: {
    padding: '12px 16px',
    backgroundColor: '#e3f2fd',
    border: '1px solid #90caf9',
    borderLeft: '4px solid #2196f3',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#0d47a1',
    lineHeight: '1.5'
  },
  warningBox: {
    padding: '12px 16px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffd54f',
    borderLeft: '4px solid #ff9800',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#663c00',
    lineHeight: '1.5'
  },

  // Action Bar
  actionBar: {
    position: 'sticky',
    bottom: 0,
    backgroundColor: 'white',
    borderTop: '1px solid #e1e8ed',
    padding: '16px 32px',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
    zIndex: 50
  },
  actionBarInner: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  actionBarLeft: {
    fontSize: '13px',
    color: '#666'
  },
  changeIndicator: {
    fontWeight: 500
  },
  actionBarRight: {
    display: 'flex',
    gap: '12px'
  },
  resetButton: {
    padding: '12px 24px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  saveButton: {
    padding: '12px 32px',
    backgroundColor: '#cbd5e0',
    color: '#718096',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'not-allowed',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  saveButtonActive: {
    backgroundColor: '#4caf50',
    color: 'white',
    cursor: 'pointer',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 8px rgba(76, 175, 80, 0.3)'
  }
};

// Add CSS animation for loading spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #2778bf;
    cursor: pointer;
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #2778bf;
    cursor: pointer;
    border: none;
  }

  input:focus {
    border-color: #2778bf;
    box-shadow: 0 0 0 3px rgba(39, 120, 191, 0.1);
  }

  button:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  button:active:not(:disabled) {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      height: 100%;
      z-index: 200;
      box-shadow: 2px 0 8px rgba(0,0,0,0.1);
    }
  }
`;
document.head.appendChild(styleSheet);

export default ConfigEditor;
