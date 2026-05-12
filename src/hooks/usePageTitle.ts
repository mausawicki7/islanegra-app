import { useEffect } from 'react';

const SUFFIX = 'ISLANEGRA';

export function usePageTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
