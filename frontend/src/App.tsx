import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/Hero';
import { AlertProvider } from './components/AlertPanel';
import Dashboard from './pages/Dashboard';
import DetectionPanel from './pages/DetectionPanel';
import PredictPage from './pages/PredictPage';

// ─── Page Meta ───────────────────────────────────────────────────

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Real-time pyrolysis analytics and optimization',
  },
  detect: {
    title: 'Plastic Detection',
    subtitle: 'AI-powered multi-view plastic recognition',
  },
  predict: {
    title: 'Prediction Engine',
    subtitle: 'Yield, emission & risk forecasting',
  },
};

// ─── Page Wrapper ────────────────────────────────────────────────

function PageWrapper({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        <p className="text-text-secondary text-sm mt-1">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}

// ─── App ─────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState('home');

  const meta = pageMeta[page];

  return (
    <AlertProvider>
      <div className="min-h-screen flex flex-col">
        {/* Navbar */}
        <Navbar active={page} onNavigate={setPage} />

        {/* Content */}
        <main className="flex-1 pt-16">
          <div className="max-w-7xl mx-auto px-6">
            <AnimatePresence mode="wait">
              {page === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Hero onGetStarted={() => setPage('dashboard')} />
                </motion.div>
              )}

              {page === 'dashboard' && meta && (
                <PageWrapper key="dashboard" title={meta.title} subtitle={meta.subtitle}>
                  <Dashboard />
                </PageWrapper>
              )}

              {page === 'detect' && meta && (
                <PageWrapper key="detect" title={meta.title} subtitle={meta.subtitle}>
                  <DetectionPanel />
                </PageWrapper>
              )}

              {page === 'predict' && meta && (
                <PageWrapper key="predict" title={meta.title} subtitle={meta.subtitle}>
                  <PredictPage />
                </PageWrapper>
              )}
            </AnimatePresence>

            <Footer />
          </div>
        </main>
      </div>
    </AlertProvider>
  );
}
