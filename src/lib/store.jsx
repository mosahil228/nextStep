import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchJobs } from './jobsApi';
import { hideSplash } from './splash';

const Ctx = createContext(null);
const FAV_KEY = 'nsc_saved_jobs';

export function AppProvider({ children }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; }
  });
  const [toast, setToast] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await fetchJobs());
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load jobs');
    } finally {
      setLoading(false);
      hideSplash();
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { localStorage.setItem(FAV_KEY, JSON.stringify(saved)); }, [saved]);

  const notify = useCallback((msg) => {
    setToast({ msg, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const toggleSave = useCallback((id) => {
    setSaved((s) => {
      const has = s.includes(id);
      notify(has ? 'Removed from saved jobs' : 'Saved');
      return has ? s.filter((x) => x !== id) : [id, ...s];
    });
  }, [notify]);

  return (
    <Ctx.Provider value={{ jobs, loading, error, reload, saved, toggleSave, isSaved: (id) => saved.includes(id), toast, notify }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
