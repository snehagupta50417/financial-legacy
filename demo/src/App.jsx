import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useStore } from './store'
import { TopNav, Toasts, PresenterToolbar } from './components/Shell'
import Copilot from './components/Copilot'
import CommandPalette from './components/CommandPalette'
import DemoMode from './components/DemoMode'
import Home from './pages/Home'
import Journey from './pages/Journey'
import Dashboard from './pages/Dashboard'
import Ledger from './pages/Ledger'

export default function App() {
  const location = useLocation()
  const { resetKey, demo } = useStore()
  const section = location.pathname.split('/').slice(0, 3).join('/')
  useEffect(() => {
    if (!demo) window.scrollTo(0, 0)
  }, [location.pathname, demo])
  return (
    <div className="relative z-10 min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1680px] px-6 pb-40 pt-8" key={resetKey}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname.startsWith('/journey') ? location.pathname : section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/journey/:id" element={<Journey />} />
              <Route path="/journey/:id/:tab" element={<Journey />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <Toasts />
      <Copilot />
      <PresenterToolbar />
      <CommandPalette />
      <DemoMode />
    </div>
  )
}
