import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Navigation
      'nav.dashboard': 'Dashboard',
      'nav.applications': 'Applications',
      'nav.newApplication': 'New Application',
      'nav.reports': 'Reports',
      'nav.audit': 'Audit Log',
      'nav.users': 'User Management',
      'nav.logout': 'Logout',

      // Status labels
      'status.DRAFT': 'Draft',
      'status.SUBMITTED': 'Submitted',
      'status.UNDER_SCRUTINY': 'Under Scrutiny',
      'status.EDS': 'Document Deficiency',
      'status.REFERRED': 'Referred to Meeting',
      'status.MOM_GENERATED': 'MoM Generated',
      'status.FINALIZED': 'Finalized',

      // Actions
      'action.submit': 'Submit Application',
      'action.refer': 'Refer to Meeting',
      'action.issue_eds': 'Issue EDS Notice',
      'action.finalize': 'Finalize MoM',
      'action.export_pdf': 'Export as PDF',
      'action.export_docx': 'Export as Word',
      'action.pay_fee': 'Pay Application Fee',

      // Forms
      'form.project_name': 'Project Name',
      'form.sector': 'Sector',
      'form.district': 'District',
      'form.area_ha': 'Area (Hectares)',
      'form.description': 'Project Description',
      'form.documents': 'Upload Documents',

      // Messages
      'msg.loading': 'Loading...',
      'msg.no_applications': 'No applications found',
      'msg.application_submitted': 'Application submitted successfully',
      'msg.payment_initiated': 'Payment initiated. Please scan the QR code.',

      // Auth
      'auth.email': 'Email Address',
      'auth.password': 'Password',
      'auth.login': 'Sign In',
      'auth.register': 'Create Account',
      'auth.name': 'Full Name',
      'auth.organization': 'Organization',
    },
  },
  hi: {
    translation: {
      // Navigation
      'nav.dashboard': 'डैशबोर्ड',
      'nav.applications': 'आवेदन',
      'nav.newApplication': 'नया आवेदन',
      'nav.reports': 'रिपोर्ट',
      'nav.audit': 'ऑडिट लॉग',
      'nav.users': 'उपयोगकर्ता प्रबंधन',
      'nav.logout': 'लॉग आउट',

      // Status labels
      'status.DRAFT': 'प्रारूप',
      'status.SUBMITTED': 'प्रस्तुत',
      'status.UNDER_SCRUTINY': 'जांच में',
      'status.EDS': 'दस्तावेज़ कमी',
      'status.REFERRED': 'बैठक हेतु संदर्भित',
      'status.MOM_GENERATED': 'MoM तैयार',
      'status.FINALIZED': 'अंतिम',

      // Actions
      'action.submit': 'आवेदन जमा करें',
      'action.refer': 'बैठक हेतु संदर्भित करें',
      'action.issue_eds': 'EDS नोटिस जारी करें',
      'action.finalize': 'MoM अंतिम करें',
      'action.export_pdf': 'PDF में निर्यात करें',
      'action.export_docx': 'Word में निर्यात करें',
      'action.pay_fee': 'आवेदन शुल्क भुगतान',

      // Forms
      'form.project_name': 'परियोजना का नाम',
      'form.sector': 'क्षेत्र',
      'form.district': 'जिला',
      'form.area_ha': 'क्षेत्रफल (हेक्टेयर)',
      'form.description': 'परियोजना विवरण',
      'form.documents': 'दस्तावेज़ अपलोड करें',

      // Messages
      'msg.loading': 'लोड हो रहा है...',
      'msg.no_applications': 'कोई आवेदन नहीं मिला',
      'msg.application_submitted': 'आवेदन सफलतापूर्वक जमा हुआ',
      'msg.payment_initiated': 'भुगतान शुरू हुआ। QR कोड स्कैन करें।',

      // Auth
      'auth.email': 'ईमेल पता',
      'auth.password': 'पासवर्ड',
      'auth.login': 'साइन इन करें',
      'auth.register': 'खाता बनाएं',
      'auth.name': 'पूरा नाम',
      'auth.organization': 'संगठन',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
