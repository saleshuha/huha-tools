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
    console.log('Toggle mobile view clicked, current state:', isMobileViewForced);
    setIsMobileViewForced(!isMobileViewForced);
    console.log('New mobile view state will be:', !isMobileViewForced);
  };

  const isMobileView = actuallyMobile || isMobileViewForced;

  console.log('Mobile view states:', { actuallyMobile, isMobileViewForced, isMobileView });

  return {
    isMobileView,
    isMobileViewForced,
    actuallyMobile,
    toggleMobileView
  };
}