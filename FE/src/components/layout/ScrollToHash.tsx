import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const NAVBAR_OFFSET = 88;
const RETRY_WINDOW_MS = 1200;
const RETRY_INTERVAL_MS = 100;

function scrollToHashTarget(hash: string) {
  const targetId = decodeURIComponent(hash.replace(/^#/, ""));
  if (!targetId) {
    return false;
  }

  const element = document.getElementById(targetId);
  if (!element) {
    return false;
  }

  const top = window.scrollY + element.getBoundingClientRect().top - NAVBAR_OFFSET;
  window.scrollTo({
    top: Math.max(top, 0),
    behavior: "smooth",
  });

  return true;
}

export function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    if (scrollToHashTarget(location.hash)) {
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const found = scrollToHashTarget(location.hash);
      const expired = Date.now() - startedAt >= RETRY_WINDOW_MS;

      if (found || expired) {
        window.clearInterval(interval);
      }
    }, RETRY_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [location.hash, location.pathname]);

  return null;
}
