import { useEffect, useState } from 'react';
import MobileAppLayout from './MobileAppLayout.jsx';
import WebAppLayout from './WebAppLayout.jsx';

const DESKTOP_MEDIA = '(min-width: 1024px)';

export default function AdaptiveAppLayout() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_MEDIA).matches);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_MEDIA);
    const onChange = (e) => setIsDesktop(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isDesktop ? <WebAppLayout /> : <MobileAppLayout />;
}
