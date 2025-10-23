import { useState, useEffect } from 'react';
import Noticeboard from './Noticeboard';
import ConfigEditor from './ConfigEditor';

/**
 * Main App component with simple routing
 * Routes:
 * - / → Noticeboard display
 * - /config → Configuration editor
 */
function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // Handle browser back/forward
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Simple client-side routing
  if (currentPath === '/config') {
    return <ConfigEditor />;
  }

  return <Noticeboard />;
}

export default App;
