import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import DisclaimerBar from './components/DisclaimerBar';
import Footer from './components/Footer';
import TelegramFab from './components/TelegramFab';
import LatestJobPopup from './components/LatestJobPopup';
import Toast from './components/Toast';
import InstallBanner from './components/InstallApp';
import { trackPageView } from './lib/analytics';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Saved from './pages/Saved';
import AtsCheck from './pages/AtsCheck';
import Companies from './pages/Companies';
import MobileTabBar from './components/MobileTabBar';
import Admin from './admin/Admin';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="container page empty">
      <div className="empty-code">404</div>
      <p>Page not found.</p>
      <Link className="btn btn-primary" to="/">Go home</Link>
    </div>
  );
}

export default function App() {
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith('/admin');
  useEffect(() => { if (!loc.hash) window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => { trackPageView(loc.pathname + loc.search); }, [loc.pathname, loc.search]);

  if (isAdmin) return (<><Routes><Route path="/admin/*" element={<Admin />} /></Routes><Toast /></>);

  return (
    <>
      <DisclaimerBar />
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main key={loc.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
          <Routes location={loc}>
            <Route path="/" element={<Home />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/job/:id" element={<JobDetail />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/ats" element={<AtsCheck />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/resume-check" element={<Navigate to="/ats" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
      <Footer />
      <TelegramFab />
      <LatestJobPopup />
      <InstallBanner />
      <MobileTabBar />
      <Toast />
    </>
  );
}
