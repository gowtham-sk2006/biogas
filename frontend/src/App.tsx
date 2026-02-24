import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ModeSelection from './components/ModeSelection';
import ImageUploadMode from './components/ImageUploadMode';
import ManualForm from './components/ManualForm';
import PartialUpdate from './components/PartialUpdate';
import Dashboard from './components/Dashboard';
import HistorySidebar, { addToHistory } from './components/HistorySidebar';
import IntroAnimation from './components/IntroAnimation';
import ChatBot from './components/ChatBot';
import type { AppMode, PredictResponse, DetectResponse } from './types';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [mode, setMode] = useState<AppMode>('landing');
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [_detectionResult, setDetectionResult] = useState<DetectResponse | null>(null);

  const goToDashboard = (r: PredictResponse) => {
    setResult(r);
    setMode('dashboard');
    addToHistory(r);
  };

  const handleImageConfirm = (plasticType: string, detResult: DetectResponse) => {
    setDetectionResult(detResult);
    // Auto-run prediction with detected plastic type
    import('./api/client').then(({ predictPyrolysis }) => {
      predictPyrolysis({ plastic_type: plasticType, weight: 5, mode: 'auto' })
        .then(resp => goToDashboard(resp.data))
        .catch(() => setMode('manual'));
    });
  };

  const handleManualResult = (r: PredictResponse) => goToDashboard(r);
  const handlePartialResult = (r: PredictResponse) => goToDashboard(r);

  const handleHistoryLoad = (r: PredictResponse) => {
    setResult(r);
    setMode('dashboard');
  };

  const goLanding = () => setMode('landing');

  return (
    <>
      <AnimatePresence>
        {showIntro && (
          <IntroAnimation key="intro" onComplete={() => setShowIntro(false)} />
        )}
      </AnimatePresence>

      {!showIntro && (
        <>
          <Navbar />
          <HistorySidebar onLoadResult={handleHistoryLoad} />
          <main className="pt-14 min-h-screen">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <AnimatePresence mode="wait">
                {mode === 'landing' && (
                  <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ModeSelection onSelect={setMode} />
                  </motion.div>
                )}

                {mode === 'image-upload' && (
                  <motion.div key="image-upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    <ImageUploadMode onConfirm={handleImageConfirm} onBack={goLanding} />
                  </motion.div>
                )}

                {mode === 'manual' && (
                  <motion.div key="manual" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    <ManualForm onResult={handleManualResult} onBack={goLanding} />
                  </motion.div>
                )}

                {mode === 'partial' && result && (
                  <motion.div key="partial" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    <PartialUpdate
                      previousResult={result}
                      onResult={handlePartialResult}
                      onBack={() => setMode('dashboard')}
                    />
                  </motion.div>
                )}

                {mode === 'partial' && !result && (
                  <motion.div key="no-prev" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="glass-card p-12 text-center max-w-lg mx-auto mt-20">
                      <p className="text-text-secondary text-lg mb-4">No previous analysis found</p>
                      <p className="text-text-muted text-sm mb-6">Run a full analysis first to use Partial Update</p>
                      <button onClick={goLanding} className="btn-primary">Go Back</button>
                    </div>
                  </motion.div>
                )}

                {mode === 'dashboard' && result && (
                  <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Dashboard
                      result={result}
                      onBack={goLanding}
                      onPartialUpdate={() => setMode('partial')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ChatBot />
            <Footer />
          </main>
        </>
      )}
    </>
  );
}
