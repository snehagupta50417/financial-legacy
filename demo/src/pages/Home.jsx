import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Star, ArrowRight, Compass, LayoutDashboard } from 'lucide-react'
import { useStore } from '../store'
import { JOURNEYS } from '../data'
import { ICONS } from '../lib/icons'
import { cx } from '../lib/util'

export default function Home() {
  const { state, set, toast } = useStore()
  const navigate = useNavigate()
  return (
    <div>
      <AnimatePresence>
        {state.bannerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="flex items-center gap-4 rounded-2xl border border-ai/20 bg-gradient-to-r from-ai/10 via-ai/[0.04] to-transparent px-5 py-3.5">
              <Compass size={20} className="shrink-0 text-ai" />
              <p className="flex-1 text-[15px] text-slate-200">
                <b className="text-white">The family guides the journey.</b> The agent reads documents, drafts filings, routes to portals.
              </p>
              <button
                onClick={() => {
                  set({ bannerOpen: false })
                  toast('info', 'Principle banner hidden — Restart Demo brings it back')
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="hero" className="mb-10 flex items-end justify-between gap-8">
        <div>
          <div className="label mb-3 text-gold">₹78,000+ crore unclaimed in India · not lost, unguided</div>
          <h1 className="font-display text-6xl font-extrabold leading-[1.05] tracking-tight text-white">
            One engine. <span className="bg-gradient-to-r from-gold via-amber-200 to-gold bg-clip-text text-transparent">Seven journeys.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-400">
            FinLegacy AI helps Indian families discover, organise and claim financial assets — whatever moment of life brought them here.
          </p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn-ghost shrink-0 px-5 py-3">
          <LayoutDashboard size={17} /> Unified dashboard
        </button>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {JOURNEYS.map((j, i) => {
          const Icon = ICONS[j.icon]
          return (
            <motion.button
              key={j.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/journey/${j.id}/scenario`)}
              className={cx(
                'glass group relative flex min-h-[230px] flex-col p-6 text-left transition',
                j.star ? 'border-gold/40 hover:shadow-[0_0_50px_-12px_rgba(245,197,66,0.5)]' : 'hover:border-white/20',
                i === 0 && 'col-span-1',
                j.id === 2 && 'col-span-2 row-span-1',
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cx('grid h-14 w-14 place-items-center rounded-2xl ring-1', j.star ? 'bg-gold/15 text-gold ring-gold/30' : 'bg-white/5 text-ai ring-white/10')}>
                  <Icon size={28} />
                </span>
                <span
                  className={cx(
                    'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold',
                    j.star ? 'border-gold/40 bg-gold/15 text-gold' : 'border-white/10 bg-white/5 text-slate-400',
                  )}
                >
                  {j.star && <Star size={12} fill="currentColor" />} {j.badge}
                </span>
              </div>
              <div className="mt-auto pt-6">
                <div className="num text-xs font-bold text-slate-500">0{j.id}</div>
                <div className="font-display text-xl font-bold text-white">{j.name}</div>
                <div className="mt-1 text-[15px] text-slate-400">{j.line}</div>
              </div>
              <ArrowRight size={18} className="absolute bottom-6 right-6 text-slate-600 transition group-hover:translate-x-1 group-hover:text-white" />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
