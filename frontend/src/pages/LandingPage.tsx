import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, LogIn, ChevronRight, Bell, Search, ExternalLink, Download, Phone, Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import LoginModal from '../components/auth/LoginModal';
import ServiceDetailModal from '../components/landing/ServiceDetailModal';
import toast from 'react-hot-toast';

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const aboutRef = useRef<HTMLDivElement>(null);
  const clearanceRef = useRef<HTMLDivElement>(null);
  const downloadsRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'hi' : 'en';
    void i18n.changeLanguage(next);
  };

  const navLinks = [
    { label: t('landing.home'), action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { label: t('landing.about'), action: () => scrollTo(aboutRef) },
    { label: t('landing.clearance'), action: () => scrollTo(clearanceRef) },
    { label: t('landing.downloads'), action: () => scrollTo(downloadsRef) },
    { label: t('landing.guide'), action: () => toast.success('Guided Tours and Manuals section coming soon!') },
    { label: t('landing.contact'), action: () => scrollTo(contactRef) },
    { label: t('landing.dashboard'), action: () => { if (user) navigate('/dashboard'); else setIsLoginOpen(true); } },
    { label: t('landing.complaint'), action: () => toast.success('Public Grievance Portal is currently under maintenance.') },
    { label: t('landing.vacancies'), action: () => toast.success('No active vacancies at the moment.') },
  ];

  const clearanceData = [
    { 
      title: t('landing.services.ec.title'), 
      icon: '🌿', 
      color: 'bg-green-600',
      description: t('landing.services.ec.desc'),
      requirements: ['EIA Report', 'Public Hearing Minutes', 'Empanelled Consultant', 'Site Photos'],
      timeline: '105 to 150 days depending on project category (A/B).',
      documents: ['Form 1 & 1A', 'Pre-feasibility Report', 'Conceptual Plan']
    },
    { 
      title: t('landing.services.fc.title'), 
      icon: '🌳', 
      color: 'bg-emerald-700',
      description: t('landing.services.fc.desc'),
      requirements: ['DGPS Survey', 'Compensatory Afforestation Plan', 'Gram Sabha NOC', 'State Recommendation'],
      timeline: '180 to 210 days including site inspection by Nodal Officer.',
      documents: ['Part I to V Forms', 'Map on 1:50k scale', 'CAT Plan']
    },
    { 
      title: t('landing.services.wc.title'), 
      icon: '🐅', 
      color: 'bg-green-800',
      description: t('landing.services.wc.desc'),
      requirements: ['NBWL Approval', 'Standing Committee Recommendation', 'Mitigation Plan', 'Chief Wildlife Warden Report'],
      timeline: '90 to 120 days after State Board recommendation.',
      documents: ['Species List', 'Site Map', 'Impact Assessment']
    },
    { 
      title: t('landing.services.crz.title'), 
      icon: '🏖️', 
      color: 'bg-teal-600',
      description: t('landing.services.crz.desc'),
      requirements: ['CRZ Mapping (1:25k0)', 'Shoreline Change Analysis', 'HTL/LTL Marking', 'MCZMA Recommendation'],
      timeline: '60 to 90 days following submission of mapping reports.',
      documents: ['Environment Management Plan', 'Risk Assessment', 'Disaster Management Plan']
    },
  ];

  const forms = [
    { title: t('landing.forms.ec'), size: '2.4 MB', type: 'PDF' },
    { title: t('landing.forms.fc'), size: '1.8 MB', type: 'PDF' },
    { title: t('landing.forms.eia'), size: '5.6 MB', type: 'PDF' },
    { title: t('landing.forms.guide'), size: '1.2 MB', type: 'PDF' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* ─── Top Gov Banner ────────────────────────────────────────────────── */}
      <div className="bg-[#0b5c3e] text-white py-1 px-4 text-[10px] md:text-xs flex justify-between items-center font-medium">
        <div className="flex items-center gap-2">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="India Emblem" className="w-3 h-3 invert" />
          <span>{t('app.govtOfIndia')}</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleLanguage} className="hover:underline flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {i18n.language === 'en' ? 'हिन्दी' : 'English'}
          </button>
          <span>A- | A | A+</span>
        </div>
      </div>

      {/* ─── Main Header ───────────────────────────────────────────────────── */}
      <header className="py-4 px-4 md:px-8 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img 
              src="https://parivesh.nic.in/content/images/logo.png" 
              alt="PARIVESH Logo" 
              className="h-10 md:h-12" 
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150x50?text=PARIVESH+3.0'; }}
            />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-[#0b5c3e] leading-none">PARIVESH</h1>
              <p className="text-[10px] text-gray-500 font-semibold tracking-wider">{t('app.cpcGreen')}</p>
            </div>
          </div>
          <div className="hidden lg:block border-l border-gray-200 pl-4">
            <p className="text-xs font-bold text-gray-700 leading-tight">{t('app.ministryNameHindi')}</p>
            <p className="text-[10px] text-gray-500">{t('app.ministryName')}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden xl:flex items-center gap-10 h-12">
             <div className="flex items-center justify-center w-24 h-full">
               <img src="/life-logo.png" className="max-h-full object-contain scale-[3.2]" alt="Mission LiFE" />
             </div>
             <div className="w-px h-6 bg-gray-200 self-center" />
             <div className="flex items-center justify-center w-28 h-full">
               <img src="/akam-logo.png" className="max-h-full object-contain scale-[2.8]" alt="AKAM" />
             </div>
             <div className="w-px h-6 bg-gray-200 self-center" />
             <div className="flex items-center justify-center w-16 h-full">
               <img src="/emblem-logo.png" className="max-h-full object-contain scale-[2.5]" alt="Emblem of India" />
             </div>
          </div>
          
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-[#0b5c3e] text-white px-5 py-2 rounded font-semibold text-sm hover:bg-[#084831] transition-colors shadow-sm"
            >
              {t('nav.dashboard')}
            </button>
          ) : (
            <button
              onClick={() => setIsLoginOpen(true)}
              className="bg-[#1e40af] text-white px-6 py-2 rounded font-semibold text-sm hover:bg-[#1e3a8a] transition-colors shadow-md flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" /> {t('auth.signIn')}
            </button>
          )}
        </div>
      </header>

      {/* ─── Navigation Bar ────────────────────────────────────────────────── */}
      <nav className="bg-[#0b5c3e] text-white overflow-x-auto sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex px-4 whitespace-nowrap">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={link.action}
              className="px-5 py-3 text-xs md:text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              {link.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ─── News Ticker ───────────────────────────────────────────────────── */}
      <div className="bg-gray-50 border-b border-gray-200 py-1 overflow-hidden relative group">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="text-[10px] md:text-sm text-gray-600 font-medium px-4">
            🌟 New Guidelines for Project Proponents published on March 14, 2026.
          </span>
          <span className="text-[10px] md:text-sm text-gray-600 font-medium px-4">
            🛡️ Enhanced document security with Post-Quantum Cryptography now active.
          </span>
          <span className="text-[10px] md:text-sm text-gray-600 font-medium px-4">
            📊 Real-time application tracking dashboard is live.
          </span>
        </div>
      </div>

      {/* ─── Hero Section ──────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl relative aspect-[4/3] bg-gray-100">
               <img 
                 src="/pm-modi.png" 
                 alt="PM Modi" 
                 className="w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                 <h2 className="text-white text-2xl font-bold">PARIVESH 3.0</h2>
                 <p className="text-white/80 text-sm mt-1">{t('landing.footerTagline')}</p>
               </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-3xl md:text-4xl font-extrabold text-[#0b5c3e] leading-tight">
                {t('landing.heroTitle')}
              </h3>
              <p className="text-gray-600 text-lg">
                {t('landing.heroSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                    <Search className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-gray-700">{t('landing.trackProposal')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                onClick={() => toast.success('Showing latest notifications...')}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1e40af]/10 flex items-center justify-center text-[#1e40af] group-hover:bg-[#1e40af] group-hover:text-white transition-colors">
                    <Bell className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-gray-700">{t('landing.whatsNew')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-green-900">{t('landing.whatsNew')}</h4>
                <ExternalLink className="w-4 h-4 text-green-600 cursor-pointer" />
              </div>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm cursor-pointer hover:bg-green-100 p-1 rounded transition-colors">
                  <span className="text-green-600 font-bold">•</span>
                  <p className="text-gray-700">Reconstitution of SEIAA and SEAC Chhattisgarh state guidelines.</p>
                </li>
                <li className="flex gap-3 text-sm cursor-pointer hover:bg-green-100 p-1 rounded transition-colors">
                  <span className="text-green-600 font-bold">•</span>
                  <p className="text-gray-700">Clarification regarding proposals of the State of Gujarat falling under Para 4.2.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* ─── About Section ─────────────────────────────────────────────── */}
      <section ref={aboutRef} className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-[#0b5c3e]">{t('landing.aboutTitle')}</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              {t('landing.aboutPara1')}
            </p>
            <p className="text-gray-600 text-lg leading-relaxed">
              {t('landing.aboutPara2')}
            </p>
            <div className="grid grid-cols-3 gap-8 pt-6">
              <div>
                <p className="text-3xl font-bold text-green-700">100%</p>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('landing.stats.online')}</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-700">24/7</p>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('landing.stats.tracking')}</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-700">Zero</p>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('landing.stats.visits')}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-100 rounded-3xl aspect-video relative overflow-hidden shadow-inner">
             <video 
               className="w-full h-full object-cover" 
               controls 
               loop
               autoPlay
               muted
               poster="/pm-modi.png"
               title="PARIVESH Official Video"
             >
               <source src="/parivesh-video.mp4" type="video/mp4" />
               Your browser does not support the video tag.
             </video>
          </div>
        </div>
      </section>

      {/* ─── Clearance Section ─────────────────────────────────────────────── */}
      <section ref={clearanceRef} className="bg-[#eef5e9] py-20 px-4 relative overflow-hidden">
        {/* Decorative Mandala Patterns */}
        <div className="absolute top-0 right-0 w-80 h-80 opacity-20 pointer-events-none -translate-y-16 translate-x-16">
          <img src="/mandala-pattern.png" alt="" className="w-full h-full object-contain rotate-180" />
        </div>
        <div className="absolute bottom-0 left-0 w-80 h-80 opacity-20 pointer-events-none translate-y-16 -translate-x-16">
          <img src="/mandala-pattern.png" alt="" className="w-full h-full object-contain" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-14">
            <h3 className="text-5xl font-serif text-[#1b633e] drop-shadow-sm">
              {t('landing.clearanceTitle')}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {clearanceData.map((card, idx) => {
              const images = ['/clearance-ec.png', '/clearance-fc.png', '/clearance-wc.png', '/clearance-crz.png'];
              return (
                <motion.div
                  key={card.title}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedService(card)}
                  className="relative aspect-[3/4] rounded-sm overflow-hidden shadow-xl border-4 border-white group cursor-pointer"
                >
                  <img 
                    src={images[idx]} 
                    alt={card.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  
                  <div className="absolute inset-x-4 bottom-6">
                    <div className="bg-[#1f2937]/90 backdrop-blur-sm px-5 py-3 rounded text-white flex justify-between items-center group-hover:bg-[#1b633e]/95 transition-all transform group-hover:-translate-y-1 shadow-lg border border-white/10">
                      <span className="font-bold text-sm tracking-wide uppercase italic">{card.title}</span>
                      <span className="text-2xl font-light text-green-400 group-hover:text-white transition-colors">»</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Downloads Section ─────────────────────────────────────────────── */}
      <section ref={downloadsRef} className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-[#0b5c3e]">{t('landing.downloadsTitle')}</h3>
              <p className="text-gray-500">{t('landing.downloadsSubtitle')}</p>
            </div>
            <button className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors flex items-center gap-2">
              {t('landing.viewAll')} <ExternalLink className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {forms.map((form) => (
              <div key={form.title} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition-all group">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-shadow">
                  <Download className="w-6 h-6 text-green-600" />
                </div>
                <h5 className="font-bold text-gray-800 mb-1">{form.title}</h5>
                <p className="text-xs text-gray-400 font-medium">{form.type} • {form.size}</p>
                <button 
                  onClick={() => toast.success(`Starting download: ${form.title}`)}
                  className="mt-6 w-full py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:text-green-700 hover:border-green-200 transition-colors"
                >
                  Download Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contact Section ─────────────────────────────────────────────── */}
      <section ref={contactRef} className="bg-gray-50 py-20 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-[#0b5c3e]">{t('landing.contactTitle')}</h3>
              <p className="text-gray-500 leading-relaxed">
                {t('landing.contactSubtitle')}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h6 className="font-bold text-gray-800">{t('landing.callUs')}</h6>
                  <p className="text-gray-600">1800 11 9792 / 011-24695424</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h6 className="font-bold text-gray-800">{t('landing.emailSupport')}</h6>
                  <p className="text-gray-600">monitoring-ec@nic.in</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h6 className="font-bold text-gray-800">{t('landing.officeAddress')}</h6>
                  <p className="text-gray-600">Ministry of Environment, Forest and Climate Change<br />Indira Paryavaran Bhawan, Jor Bagh Road, New Delhi-110003</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
             <h4 className="font-bold text-gray-800 mb-6">{t('landing.sendMessage')}</h4>
             <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); toast.success('Message sent! We will contact you soon.'); }}>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder={t('landing.fullName')} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full" required />
                  <input type="email" placeholder={t('landing.email')} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full" required />
                </div>
                <input type="text" placeholder={t('landing.subject')} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full" required />
                <textarea placeholder={t('landing.message')} rows={4} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full" required></textarea>
                <button type="submit" className="w-full py-3 bg-[#0b5c3e] text-white font-bold rounded-xl hover:bg-[#084831] transition-all shadow-md">
                  {t('landing.submit')}
                </button>
             </form>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#0b5c3e] text-white py-16 px-8 overflow-hidden relative border-t border-white/5">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <div className="w-96 h-96 border-[16px] border-white rounded-full translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="space-y-6 col-span-1 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white rounded-full p-2 flex items-center justify-center">
                <img src="https://parivesh.nic.in/content/images/logo.png" alt="Logo" className="w-full" />
              </div>
              <div>
                <h5 className="font-bold text-xl tracking-wide">PARIVESH</h5>
                <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">{t('app.cpcGreen')}</p>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed font-medium">
              {t('landing.footerTagline')}
            </p>
          </div>

          <div>
            <h6 className="font-bold mb-6 uppercase text-xs tracking-widest text-green-300">{t('landing.quickLinks')}</h6>
            <ul className="text-sm space-y-3 text-white/70">
              <li onClick={() => toast.success('Privacy Policy')} className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 group">
                <ChevronRight className="w-3 h-3 text-green-500 group-hover:translate-x-1 transition-transform" /> Privacy Policy
              </li>
              <li onClick={() => toast.success('Terms of Use')} className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 group">
                <ChevronRight className="w-3 h-3 text-green-500 group-hover:translate-x-1 transition-transform" /> Terms of Use
              </li>
              <li onClick={() => toast.success('Copyright Policy')} className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 group">
                <ChevronRight className="w-3 h-3 text-green-500 group-hover:translate-x-1 transition-transform" /> Copyright Policy
              </li>
              <li onClick={() => toast.success('Hyperlinking Policy')} className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 group">
                <ChevronRight className="w-3 h-3 text-green-500 group-hover:translate-x-1 transition-transform" /> Hyperlinking Policy
              </li>
              <li onClick={() => toast.success('Public Grievance')} className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 group">
                <ChevronRight className="w-3 h-3 text-green-500 group-hover:translate-x-1 transition-transform" /> Complaints & Feedback
              </li>
              <li onClick={() => toast.success('Active Vacancies')} className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 group">
                <ChevronRight className="w-3 h-3 text-green-500 group-hover:translate-x-1 transition-transform" /> Career Opportunities
              </li>
            </ul>
          </div>

          <div>
            <h6 className="font-bold mb-6 uppercase text-xs tracking-widest text-green-300">{t('landing.otherWebsites')}</h6>
            <ul className="text-sm space-y-3 text-white/70">
              <li className="hover:text-white cursor-pointer transition-colors">MoEFCC Official Site</li>
              <li className="hover:text-white cursor-pointer transition-colors">National Portal of India</li>
              <li className="hover:text-white cursor-pointer transition-colors">Digital India</li>
              <li className="hover:text-white cursor-pointer transition-colors">MyGov.in</li>
            </ul>
          </div>

          <div className="space-y-6">
            <h6 className="font-bold mb-2 uppercase text-xs tracking-widest text-green-300">{t('landing.visitStats')}</h6>
             <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-3xl font-mono font-bold text-green-400">3,870,870</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{t('landing.uniqueVisitors')}</p>
             </div>
             <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-all hover:scale-110">🐦</div>
                <div className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-all hover:scale-110">📷</div>
                <div className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-all hover:scale-110">🎥</div>
             </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">
              Designed & Developed by NIC | Content Managed by MoEFCC
            </p>
        </div>
      </footer>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isLoginOpen && (
          <LoginModal onClose={() => setIsLoginOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedService && (
          <ServiceDetailModal 
            service={selectedService} 
            onClose={() => setSelectedService(null)} 
            onApply={() => setIsLoginOpen(true)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
