import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type View = 'org' | 'guest'

const AVATARS = [
  { init: 'L', bg: '#b8e0c4', color: '#1e4a2b' },
  { init: 'M', bg: '#f5c8a0', color: '#6b3010' },
  { init: 'T', bg: '#b8d0f0', color: '#1a3060' },
  { init: 'R', bg: '#f0b8d0', color: '#601040' },
]

const CHANNELS = ['SMS', 'WhatsApp', 'Instagram', 'Signal', 'Messenger', 'Mail']

// Consistent centered container
const C = 'max-w-[1100px] mx-auto px-6 md:px-12'

const ChatMockup = () => (
  <div className="rounded-2xl overflow-hidden border border-black/10 shadow-sm" style={{ background: '#e8e8e8' }}>
    <div className="px-4 py-3 border-b border-black/[0.08] flex items-center gap-1.5" style={{ background: '#dcdcdc', fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>
      <div className="w-2 h-2 rounded-full" style={{ background: '#b0b0b0' }} />
      <div className="w-2 h-2 rounded-full" style={{ background: '#b0b0b0' }} />
      <div className="w-2 h-2 rounded-full" style={{ background: '#b0b0b0' }} />
      <span className="ml-2">Weekend Château — groupe (14)</span>
    </div>
    <div className="p-4 flex flex-col gap-3">
      {[
        { name: 'Marie', text: "Quelqu'un part de Paris 11e ?" },
        { name: 'Thomas', text: 'Moi je peux prendre 2 depuis Nation' },
        { name: 'Julie', text: "Je suis à Vincennes, c'est loin ?" },
      ].map((msg, i) => (
        <div key={i}>
          <div style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>{msg.name}</div>
          <div className="rounded-xl" style={{ fontSize: 13, lineHeight: 1.4, padding: '9px 12px', maxWidth: '82%', background: 'white', color: '#1a1a18', borderBottomLeftRadius: 4 }}>
            {msg.text}
          </div>
        </div>
      ))}
      <div className="rounded-xl" style={{ fontSize: 12, background: '#f0dfa0', color: '#4a3800', padding: '8px 12px', alignSelf: 'flex-start' }}>
        📍 Partage de position · Léa
      </div>
      <div>
        <div style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>Alex</div>
        <div className="rounded-xl" style={{ fontSize: 13, lineHeight: 1.4, padding: '9px 12px', maxWidth: '82%', background: 'white', color: '#1a1a18', borderBottomLeftRadius: 4 }}>
          On part à quelle heure au final ?
        </div>
      </div>
      <div className="rounded-xl self-end ml-auto" style={{ fontSize: 13, lineHeight: 1.4, padding: '9px 12px', maxWidth: '82%', background: '#1a1a18', color: '#f5f3ee', borderBottomRightRadius: 4 }}>
        bivio.app/weekend-lea — inscrivez-vous là ✓
      </div>
    </div>
  </div>
)

export default function Landing() {
  const [view, setView] = useState<View>('org')
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleOrgCTA = () => navigate(user ? '/events/new' : '/events/new')
  const handleGuestCTA = () => navigate('/auth')

  return (
    <div className="min-h-screen text-[#1a1a18]" style={{ background: '#f5f3ee', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-black/10 backdrop-blur-sm" style={{ background: 'rgba(245,243,238,0.95)' }}>
        <div className={`${C} grid grid-cols-[1fr_auto_1fr] items-center py-[18px]`}>
          <div className="justify-self-start">
            <img src="/bivio-light.svg" alt="Bivio" style={{ height: 28, display: 'block' }} />
          </div>

          <div className="flex rounded-lg p-[3px] gap-[2px]" style={{ background: '#edeae3' }}>
            <button
              onClick={() => setView('org')}
              className="rounded-md text-[12px] sm:text-[13px] font-medium transition-all duration-150 cursor-pointer border-none px-3 sm:px-5 py-[7px]"
              style={view === 'org' ? { background: '#7cc400', color: '#2d5200', fontWeight: 700 } : { background: 'transparent', color: '#6b6b63' }}
            >
              J'organise
            </button>
            <button
              onClick={() => setView('guest')}
              className="rounded-md text-[12px] sm:text-[13px] font-medium transition-all duration-150 cursor-pointer border-none px-3 sm:px-5 py-[7px]"
              style={view === 'guest' ? { background: '#7cc400', color: '#2d5200', fontWeight: 700 } : { background: 'transparent', color: '#6b6b63' }}
            >
              Je rejoins
            </button>
          </div>

          <div className="justify-self-end">
            <button
              onClick={() => navigate('/auth')}
              className="hidden sm:block border-none rounded-md text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-80 px-5 py-[9px]"
              style={{ background: '#1a1a18', color: '#f5f3ee' }}
            >
              Se connecter
            </button>
          </div>
        </div>
      </nav>

      {/* ── ORG VIEW ── */}
      {view === 'org' && (
        <div>

          {/* Hero — 2 col on desktop */}
          <section className="border-b border-black/[0.08]">
            <div className={`${C} grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center py-16 md:py-20 lg:py-24`}>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-6" style={{ color: '#4a8a00' }}>
                  Pour les organisateurs d'événements privés
                </div>
                <h1
                  className="animate-fade-up leading-[1.06] tracking-tight mb-6"
                  style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(40px, 5.5vw, 64px)', letterSpacing: '-0.02em', color: '#1a1a18' }}
                >
                  Bivio s'occupe des<br />trajets de tes invités.<br />
                  <em className="italic" style={{ color: '#4a8a00' }}>Toi tu fais la fête.</em>
                </h1>
                <p className="animate-fade-up leading-[1.65] mb-8 max-w-[480px]" style={{ fontSize: 17, color: '#3d3d38', animationDelay: '0.08s' }}>
                  Bivio regroupe tous tes invités et coordonne les trajets. Fini la galère pour tous ceux sans voiture. On s'en occupe pour toi.
                </p>
                <div className="flex items-center gap-4 flex-wrap animate-fade-up" style={{ animationDelay: '0.16s' }}>
                  <button
                    onClick={handleOrgCTA}
                    className="border-none rounded-xl font-semibold cursor-pointer transition-opacity hover:opacity-[0.85] px-7 py-[14px]"
                    style={{ background: '#1a1a18', color: '#f5f3ee', fontSize: 15 }}
                  >
                    Créer un événement →
                  </button>
                  <span style={{ fontSize: 13, color: '#6b6b63' }}>Gratuit · Sans mot de passe · 2 min</span>
                </div>

                {/* Social proof */}
                <div className="flex items-center gap-4 mt-8 pt-8 border-t border-black/10">
                  <div className="flex">
                    {AVATARS.map((av, i) => (
                      <div key={av.init} className="flex items-center justify-center rounded-full text-[12px] font-bold" style={{ width: 32, height: 32, background: av.bg, color: av.color, border: '2.5px solid #f5f3ee', marginLeft: i === 0 ? 0 : -9, zIndex: 4 - i, position: 'relative' }}>
                        {av.init}
                      </div>
                    ))}
                  </div>
                  <p className="text-[13px] font-medium" style={{ color: '#3d3d38' }}>
                    La charge mentale des trajets de tes invités en moins.
                  </p>
                </div>
              </div>

              {/* Chat mockup - visible on desktop in hero, hidden on mobile (shows below) */}
              <div className="hidden lg:block">
                <ChatMockup />
              </div>
            </div>
          </section>

          {/* Chat mockup mobile only */}
          <div className="lg:hidden border-b border-black/[0.08]">
            <div className={`${C} py-8`}>
              <ChatMockup />
            </div>
          </div>

          {/* Channels band */}
          <div className="border-b border-black/[0.08]">
            <div className={`${C} py-5`}>
              <div className="rounded-xl px-5 py-4 flex items-center gap-2 flex-wrap" style={{ background: '#edeae3' }}>
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em] mr-1 whitespace-nowrap" style={{ color: '#6b6b63' }}>
                  Tes invités sont sur
                </span>
                {CHANNELS.map((ch, i) => (
                  <span key={ch} className="flex items-center gap-2">
                    <span className="border rounded-full px-3 py-1 text-[13px] font-medium" style={{ background: '#f5f3ee', borderColor: 'rgba(0,0,0,0.14)', color: '#1a1a18' }}>
                      {ch}
                    </span>
                    {i < CHANNELS.length - 1 && <span className="text-[13px]" style={{ color: '#6b6b63' }}>·</span>}
                  </span>
                ))}
                <span className="text-[13px]" style={{ color: '#6b6b63' }}>→</span>
                <span className="rounded-full px-4 py-1 text-[13px] font-bold" style={{ background: '#7cc400', color: '#2d5200' }}>
                  Tout le monde sur Bivio
                </span>
              </div>
            </div>
          </div>

          {/* How it works */}
          <section className="border-b border-black/[0.08]" style={{ background: '#edeae3' }}>
            <div className={`${C} py-16 md:py-20`}>
              <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-12" style={{ color: '#6b6b63' }}>
                Comment ça marche
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-16">
                {[
                  { n: '1', title: "Tu crées l'event", body: 'Nom, date, destination. Ton lien est prêt en 2 minutes.' },
                  { n: '2', title: "Tu envoies à chacun par où tu l'as", body: 'SMS, WhatsApp, Insta, Signal — peu importe. Un lien, tous les canaux.' },
                  { n: '3', title: 'Bivio coordonne les trajets', body: "Chacun indique d'où il part. Les groupes se forment. Les instructions partent tout seules." },
                ].map(step => (
                  <div key={step.n}>
                    <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, color: '#4a8a00', lineHeight: 1, marginBottom: 14 }}>{step.n}</div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a18', marginBottom: 8 }}>{step.title}</h3>
                    <p style={{ fontSize: 14, color: '#3d3d38', lineHeight: 1.7 }}>{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA bottom */}
          <section>
            <div className={`${C} py-12 md:py-16`}>
              <div className="rounded-2xl px-8 md:px-14 py-14 md:py-16" style={{ background: '#1a1a18' }}>
                <h2
                  className="mb-4"
                  style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#f0ede6' }}
                >
                  Ton prochain event<br />mérite <em className="italic" style={{ color: '#7cc400' }}>mieux</em>.
                </h2>
                <p className="mb-8" style={{ fontSize: 16, color: '#8a8a80', lineHeight: 1.6 }}>
                  Crée ton event en 2 minutes. Tes invités s'organisent seuls.
                </p>
                <button
                  onClick={handleOrgCTA}
                  className="border-none rounded-xl font-semibold cursor-pointer transition-opacity hover:opacity-[0.88] px-7 py-[14px]"
                  style={{ background: '#f5f3ee', color: '#1a1a18', fontSize: 15 }}
                >
                  Créer un événement →
                </button>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* ── GUEST VIEW ── */}
      {view === 'guest' && (
        <div>

          {/* Hero */}
          <section className="border-b border-black/[0.08]">
            <div className={`${C} py-16 md:py-20 lg:py-24`}>
              <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-6" style={{ color: '#4a8a00' }}>
                Tu as été invité à un événement
              </div>
              <h1
                className="animate-fade-up leading-[1.06] tracking-tight mb-6 max-w-[640px]"
                style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(40px, 5.5vw, 64px)', letterSpacing: '-0.02em', color: '#1a1a18' }}
              >
                Ton trajet,<br /><em className="italic" style={{ color: '#4a8a00' }}>organisé</em><br />avant même d'y penser.
              </h1>
              <p className="animate-fade-up leading-[1.65] mb-8 max-w-[500px]" style={{ fontSize: 17, color: '#3d3d38', animationDelay: '0.08s' }}>
                L'organisateur t'a envoyé un lien Bivio. Indique d'où tu pars — conducteur ou passager — et on s'occupe du reste.
              </p>
              <div className="flex items-center gap-4 flex-wrap animate-fade-up" style={{ animationDelay: '0.16s' }}>
                <button
                  onClick={handleGuestCTA}
                  className="border-none rounded-xl font-semibold cursor-pointer transition-opacity hover:opacity-[0.82] px-7 py-[14px]"
                  style={{ background: '#1a1a18', color: '#f5f3ee', fontSize: 15 }}
                >
                  Rejoindre un événement →
                </button>
                <span style={{ fontSize: 13, color: '#6b6b63' }}>Tu as un code ? Saisis-le ici.</span>
              </div>

              <div className="flex items-center gap-4 mt-8 pt-8 border-t border-black/10">
                <div className="flex">
                  {AVATARS.map((av, i) => (
                    <div key={av.init} className="flex items-center justify-center rounded-full text-[12px] font-bold" style={{ width: 32, height: 32, background: av.bg, color: av.color, border: '2.5px solid #f5f3ee', marginLeft: i === 0 ? 0 : -9, zIndex: 4 - i, position: 'relative' }}>
                      {av.init}
                    </div>
                  ))}
                </div>
                <p className="text-[13px] font-medium" style={{ color: '#3d3d38' }}>
                  Des invités qui sont arrivés sans stresser pour le trajet.
                </p>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="border-b border-black/[0.08]" style={{ background: '#edeae3' }}>
            <div className={`${C} py-16 md:py-20`}>
              <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-12" style={{ color: '#6b6b63' }}>
                Comment ça marche pour toi
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-16">
                {[
                  { n: '1', title: 'Tu ouvres le lien', body: "L'organisateur te l'a envoyé. Ou saisis le code court directement." },
                  { n: '2', title: "Tu indiques d'où tu pars", body: 'Conducteur avec des places libres, ou passager — 1 minute.' },
                  { n: '3', title: 'Tu reçois les instructions', body: 'Bivio te dit avec qui tu pars, où vous vous retrouvez, et à quelle heure.' },
                ].map(step => (
                  <div key={step.n}>
                    <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, color: '#4a8a00', lineHeight: 1, marginBottom: 14 }}>{step.n}</div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a18', marginBottom: 8 }}>{step.title}</h3>
                    <p style={{ fontSize: 14, color: '#3d3d38', lineHeight: 1.7 }}>{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA bottom */}
          <section>
            <div className={`${C} py-12 md:py-16`}>
              <div className="rounded-2xl px-8 md:px-14 py-14 md:py-16" style={{ background: '#1a1a18' }}>
                <h2
                  className="mb-4"
                  style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#f0ede6' }}
                >
                  Ton trajet est<br /><em className="italic" style={{ color: '#7cc400' }}>déjà</em> organisé.
                </h2>
                <p className="mb-8" style={{ fontSize: 16, color: '#8a8a80', lineHeight: 1.6 }}>
                  Il suffit d'indiquer d'où tu pars.
                </p>
                <button
                  onClick={handleGuestCTA}
                  className="border-none rounded-xl font-semibold cursor-pointer transition-opacity hover:opacity-[0.88] px-7 py-[14px]"
                  style={{ background: '#f5f3ee', color: '#1a1a18', fontSize: 15 }}
                >
                  Rejoindre un événement →
                </button>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-black/10">
        <div className={`${C} py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
          <img src="/bivio-light.svg" alt="Bivio" style={{ height: 22, display: 'block' }} />
          <span style={{ fontSize: 12, color: '#6b6b63' }}>Avec toi pour simplifier l'organisation de ton événement.</span>
        </div>
      </footer>

    </div>
  )
}
