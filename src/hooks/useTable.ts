import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getTableFromUrl,
  recallTable,
  rememberTable,
} from '@/utils/getTableFromUrl';

export function useTable() {
  const location = useLocation();
  const navigate = useNavigate();
  const [table, setTable] = useState<string | null>(() => {
    return getTableFromUrl(location.search) ?? recallTable();
  });

  useEffect(() => {
    const fromUrl = getTableFromUrl(location.search);
    if (fromUrl && fromUrl !== table) {
      setTable(fromUrl);
      rememberTable(fromUrl);
    }
  }, [location.search, table]);

  const updateTable = useCallback(
    (next: string) => {
      setTable(next);
      rememberTable(next);
      const params = new URLSearchParams(location.search);
      params.set('mesa', next);
      navigate(
        { pathname: location.pathname, search: `?${params.toString()}` },
        { replace: true },
      );
    },
    [location.pathname, location.search, navigate],
  );

  return { table, setTable: updateTable };
}
