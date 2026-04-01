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

export default function Landing() {
  const [view, setView] = useState<View>('org')
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleOrgCTA = () => navigate(user ? '/events/new' : '/auth')
  const handleGuestCTA = () => navigate('/auth')

  return (
    <div
      className="min-h-screen text-[#1a1a18]"
      style={{ background: '#f5f3ee', fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >

      {/* ── Nav ── */}
      <nav className="grid grid-cols-[1fr_auto_1fr] items-center px-6 md:px-10 py-[18px] border-b border-black/10 sticky top-0 z-50 backdrop-blur-sm" style={{ background: 'rgba(245,243,238,0.95)' }}>
        <div className="justify-self-start">
          <img src="/bivio-light.svg" alt="Bivio" style={{ height: 28, display: 'block' }} />
        </div>

        <div className="flex rounded-lg p-[3px] gap-[2px]" style={{ background: '#edeae3' }}>
          <button
            onClick={() => setView('org')}
            className="rounded-md text-[12px] sm:text-[13px] font-medium transition-all duration-150 cursor-pointer border-none px-3 sm:px-5 py-[7px]"
            style={view === 'org'
              ? { background: '#7cc400', color: '#2d5200', fontWeight: 700 }
              : { background: 'transparent', color: '#6b6b63' }}
          >
            J'organise
          </button>
          <button
            onClick={() => setView('guest')}
            className="rounded-md text-[12px] sm:text-[13px] font-medium transition-all duration-150 cursor-pointer border-none px-3 sm:px-5 py-[7px]"
            style={view === 'guest'
              ? { background: '#7cc400', color: '#2d5200', fontWeight: 700 }
              : { background: 'transparent', color: '#6b6b63' }}
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
      </nav>

      {/* ── ORG VIEW ── */}
      {view === 'org' && (
        <div>

          {/* Hero */}
          <section className="px-6 md:px-10 pt-14 md:pt-[72px] pb-12 md:pb-14 max-w-[820px]">
            <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-6" style={{ color: '#4a8a00' }}>
              Pour les organisateurs d'événements privés
            </div>
            <h1
              className="animate-fade-up leading-[1.06] tracking-tight mb-0"
              style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(38px, 6.5vw, 68px)', letterSpacing: '-0.02em', color: '#1a1a18' }}
            >
              Bivio s'occupe des<br />trajets de tes invités.<br />
              <em className="italic" style={{ color: '#4a8a00' }}>Toi tu fais la fête.</em>
            </h1>
            <p
              className="animate-fade-up leading-[1.65] mt-6 mb-10 max-w-[540px]"
              style={{ fontSize: 17, color: '#3d3d38', animationDelay: '0.08s' }}
            >
              Bivio regroupe tous tes invités et coordonne les trajets. Fini la galère pour tous ceux sans voiture pour aller de la gare à ton événement. On s'en occupe pour toi.
            </p>
            <div className="flex items-center gap-4 flex-wrap animate-fade-up" style={{ animationDelay: '0.16s' }}>
              <button
                onClick={handleOrgCTA}
                className="border-none rounded-md font-semibold cursor-pointer transition-opacity hover:opacity-[0.82] px-7 py-[14px]"
                style={{ background: '#1a1a18', color: '#f5f3ee', fontSize: 15 }}
              >
                Créer un événement →
              </button>
            </div>
          </section>

          <div className="h-px mx-6 md:mx-10" style={{ background: 'rgba(0,0,0,0.1)' }} />

          {/* Social proof */}
          <div className="px-6 md:px-10 py-7 flex items-center gap-4">
            <div className="flex">
              {AVATARS.map((av, i) => (
                <div
                  key={av.init}
                  className="flex items-center justify-center rounded-full text-[12px] font-bold"
                  style={{ width: 34, height: 34, background: av.bg, color: av.color, border: '2.5px solid #f5f3ee', marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i, position: 'relative' }}
                >
                  {av.init}
                </div>
              ))}
            </div>
            <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#3d3d38' }}>
              La charge mentale des trajets de tes invités en moins.
            </p>
          </div>

          {/* Channels band */}
          <div className="rounded-[10px] px-4 md:px-6 py-4 mx-6 md:mx-10 mb-12 md:mb-16 flex items-center gap-2 flex-wrap" style={{ background: '#edeae3' }}>
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
            <span className="rounded-full px-[14px] py-1 text-[13px] font-bold" style={{ background: '#7cc400', color: '#2d5200' }}>
              Tout le monde sur Bivio
            </span>
          </div>

          {/* Problem */}
          <section className="px-6 md:px-10 py-12 md:py-[72px] grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-[60px] items-start max-w-[900px]">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-5" style={{ color: '#6b6b63' }}>Le contexte</div>
              <h2 className="mb-4" style={{ fontFamily: "'Instrument Serif', serif", fontSize: 34, lineHeight: 1.15, letterSpacing: '-0.02em', color: '#1a1a18' }}>
                Organiser les trajets, c'est épuisant.
              </h2>
              <p style={{ fontSize: 15, color: '#3d3d38', lineHeight: 1.7 }}>
                Les gens arrivent de partout, tu les as sur des applis différentes, et au final tu te retrouves à tout coordonner à la main pendant que tout le monde te demande "c'est où déjà ?" à J-1.
              </p>
              <p className="mt-3" style={{ fontSize: 15, color: '#3d3d38', lineHeight: 1.7 }}>
                Bivio te donne un lien. Tu l'envoies à chacun par où tu l'as. Le reste se fait tout seul.
              </p>
            </div>

            {/* Chat mockup */}
            <div className="rounded-[14px] overflow-hidden border border-black/10" style={{ background: '#e8e8e8' }}>
              <div className="px-[14px] py-[10px] border-b border-black/[0.08] flex items-center gap-1.5" style={{ background: '#dcdcdc', fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: '#b0b0b0' }} />
                <div className="w-2 h-2 rounded-full" style={{ background: '#b0b0b0' }} />
                <div className="w-2 h-2 rounded-full" style={{ background: '#b0b0b0' }} />
                <span className="ml-1">Weekend Château — groupe (14)</span>
              </div>
              <div className="p-3 flex flex-col gap-2">
                {[
                  { name: 'Marie', text: "Quelqu'un part de Paris 11e ?", me: false },
                  { name: 'Thomas', text: 'Moi je peux prendre 2 depuis Nation', me: false },
                  { name: 'Julie', text: "Je suis à Vincennes, c'est loin ?", me: false },
                ].map((msg, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>{msg.name}</div>
                    <div
                      className="rounded-[10px]"
                      style={{
                        fontSize: 12, lineHeight: 1.4, padding: '8px 10px',
                        maxWidth: '82%', background: 'white', color: '#1a1a18',
                        borderBottomLeftRadius: 3,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div className="rounded-lg" style={{ fontSize: 11, background: '#f0dfa0', color: '#4a3800', padding: '8px 10px', alignSelf: 'flex-start' }}>
                  📍 Partage de position · Léa
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>Alex</div>
                  <div className="rounded-[10px]" style={{ fontSize: 12, lineHeight: 1.4, padding: '8px 10px', maxWidth: '82%', background: 'white', color: '#1a1a18', borderBottomLeftRadius: 3 }}>
                    On part à quelle heure au final ?
                  </div>
                </div>
                <div
                  className="rounded-[10px] self-end ml-auto"
                  style={{ fontSize: 12, lineHeight: 1.4, padding: '8px 10px', maxWidth: '82%', background: '#1a1a18', color: '#f5f3ee', borderBottomRightRadius: 3 }}
                >
                  bivio.app/weekend-lea — inscrivez-vous là ✓
                </div>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="px-6 md:px-10 py-14 md:py-[72px] border-t border-b border-black/[0.08]" style={{ background: '#edeae3' }}>
            <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-10" style={{ color: '#6b6b63' }}>
              Comment ça marche
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-10 max-w-[820px]">
              {[
                { n: '1', title: "Tu crées l'event", body: 'Nom, date, destination. Ton lien est prêt en 2 minutes.' },
                { n: '2', title: "Tu envoies à chacun par où tu l'as", body: 'SMS, WhatsApp, Insta, Signal — peu importe. Un lien, tous les canaux.' },
                { n: '3', title: 'Bivio coordonne les trajets', body: "Chacun indique d'où il part. Les groupes se forment. Les instructions partent tout seules." },
              ].map(step => (
                <div key={step.n}>
                  <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 40, color: '#4a8a00', lineHeight: 1, marginBottom: 12 }}>{step.n}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a18', marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: '#3d3d38', lineHeight: 1.6 }}>{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA bottom */}
          <section className="px-6 md:px-10 py-16 md:py-20 rounded-2xl mx-6 md:mx-10 my-10" style={{ background: '#1a1a18' }}>
            <h2
              className="mb-3"
              style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#f0ede6' }}
            >
              Ton prochain event<br />mérite <em className="italic" style={{ color: '#7cc400' }}>mieux</em>.
            </h2>
            <p className="mb-8 leading-relaxed" style={{ fontSize: 16, color: '#8a8a80' }}>
              Crée ton event en 2 minutes. Tes invités s'organisent seuls.
            </p>
            <button
              onClick={handleOrgCTA}
              className="border-none rounded-md font-semibold cursor-pointer transition-opacity hover:opacity-[0.88] px-7 py-[14px]"
              style={{ background: '#f5f3ee', color: '#1a1a18', fontSize: 15 }}
            >
              Créer un événement →
            </button>
          </section>

        </div>
      )}

      {/* ── GUEST VIEW ── */}
      {view === 'guest' && (
        <div>

          {/* Hero */}
          <section className="px-6 md:px-10 pt-14 md:pt-[72px] pb-12 md:pb-14 max-w-[820px]">
            <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-6" style={{ color: '#4a8a00' }}>
              Tu as été invité à un événement
            </div>
            <h1
              className="animate-fade-up leading-[1.06] tracking-tight"
              style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(38px, 6.5vw, 68px)', letterSpacing: '-0.02em', color: '#1a1a18' }}
            >
              Ton trajet,<br /><em className="italic" style={{ color: '#4a8a00' }}>organisé</em><br />avant même d'y penser.
            </h1>
            <p
              className="animate-fade-up leading-[1.65] mt-6 mb-10 max-w-[540px]"
              style={{ fontSize: 17, color: '#3d3d38', animationDelay: '0.08s' }}
            >
              L'organisateur t'a envoyé un lien Bivio. Indique d'où tu pars — conducteur ou passager — et on s'occupe du reste.
            </p>
            <div className="flex items-center gap-4 flex-wrap animate-fade-up" style={{ animationDelay: '0.16s' }}>
              <button
                onClick={handleGuestCTA}
                className="border-none rounded-md font-semibold cursor-pointer transition-opacity hover:opacity-[0.82] px-7 py-[14px]"
                style={{ background: '#1a1a18', color: '#f5f3ee', fontSize: 15 }}
              >
                Rejoindre un événement →
              </button>
              <span style={{ fontSize: 13, color: '#6b6b63' }}>Tu as un code ? Saisis-le ici.</span>
            </div>
          </section>

          <div className="h-px mx-6 md:mx-10" style={{ background: 'rgba(0,0,0,0.1)' }} />

          {/* Social proof */}
          <div className="px-6 md:px-10 py-7 flex items-center gap-4">
            <div className="flex">
              {AVATARS.map((av, i) => (
                <div
                  key={av.init}
                  className="flex items-center justify-center rounded-full text-[12px] font-bold"
                  style={{ width: 34, height: 34, background: av.bg, color: av.color, border: '2.5px solid #f5f3ee', marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i, position: 'relative' }}
                >
                  {av.init}
                </div>
              ))}
            </div>
            <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#3d3d38' }}>
              Des invités qui sont arrivés sans stresser pour le trajet.
            </p>
          </div>

          {/* How it works */}
          <section className="px-6 md:px-10 py-14 md:py-[72px] border-t border-b border-black/[0.08]" style={{ background: '#edeae3' }}>
            <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-10" style={{ color: '#6b6b63' }}>
              Comment ça marche pour toi
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-10 max-w-[820px]">
              {[
                { n: '1', title: 'Tu ouvres le lien', body: "L'organisateur te l'a envoyé. Ou saisis le code court directement." },
                { n: '2', title: "Tu indiques d'où tu pars", body: 'Conducteur avec des places libres, ou passager — 1 minute.' },
                { n: '3', title: 'Tu reçois les instructions', body: 'Bivio te dit avec qui tu pars, où vous vous retrouvez, et à quelle heure.' },
              ].map(step => (
                <div key={step.n}>
                  <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 40, color: '#4a8a00', lineHeight: 1, marginBottom: 12 }}>{step.n}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a18', marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: '#3d3d38', lineHeight: 1.6 }}>{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA bottom */}
          <section className="px-6 md:px-10 py-16 md:py-20 rounded-2xl mx-6 md:mx-10 my-10" style={{ background: '#1a1a18' }}>
            <h2
              className="mb-3"
              style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#f0ede6' }}
            >
              Ton trajet est<br /><em className="italic" style={{ color: '#7cc400' }}>déjà</em> organisé.
            </h2>
            <p className="mb-8 leading-relaxed" style={{ fontSize: 16, color: '#8a8a80' }}>
              Il suffit d'indiquer d'où tu pars.
            </p>
            <button
              onClick={handleGuestCTA}
              className="border-none rounded-md font-semibold cursor-pointer transition-opacity hover:opacity-[0.88] px-7 py-[14px]"
              style={{ background: '#f5f3ee', color: '#1a1a18', fontSize: 15 }}
            >
              Rejoindre un événement →
            </button>
          </section>

        </div>
      )}

      {/* ── Footer ── */}
      <footer className="px-6 md:px-10 py-6 border-t border-black/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: '#1a1a18', letterSpacing: '-0.02em' }}>Bivio</div>
        <span style={{ fontSize: 12, color: '#6b6b63' }}>Avec toi pour simplifier l'organisation de ton événement.</span>
      </footer>

    </div>
  )
}
