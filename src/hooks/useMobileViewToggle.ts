import { useState, useEffect } from 'react';

export function useMobileViewToggle() {
  const [isMobileViewForced, setIsMobileViewForced] = useState(false);
  const [actuallyMobile, setActuallyMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setActuallyMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleMobileView = () => {
    setIsMobileViewForced(!isMobileViewForced);
  };

  const isMobileView = actuallyMobile || isMobileViewForced;

  return {
    isMobileView,
    isMobileViewForced,
    actuallyMobile,
    toggleMobileView
  };
}