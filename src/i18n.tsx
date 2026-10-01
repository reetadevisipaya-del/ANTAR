import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Languages } from 'lucide-react'

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'ur', label: 'اردو' },
] as const
export type LanguageCode = typeof supportedLanguages[number]['code']
type Dictionary = Record<string, Partial<Record<LanguageCode, string>>>

const copy: Dictionary = {
  'Language': {hi:'भाषा',bn:'ভাষা',mr:'भाषा',ta:'மொழி',te:'భాష',gu:'ભાષા',kn:'ಭಾಷೆ',ml:'ഭാഷ',pa:'ਭਾਸ਼ਾ',or:'ଭାଷା',ur:'زبان'},
  'Parent Portal': {hi:'अभिभावक पोर्टल',bn:'অভিভাবক পোর্টাল',mr:'पालक पोर्टल',ta:'பெற்றோர் தளம்',te:'తల్లిదండ్రుల పోర్టల్',gu:'વાલી પોર્ટલ',kn:'ಪೋಷಕರ ಪೋರ್ಟಲ್',ml:'രക്ഷാകർതൃ പോർട്ടൽ',pa:'ਮਾਪੇ ਪੋਰਟਲ',or:'ଅଭିଭାବକ ପୋର୍ଟାଲ',ur:'والدین پورٹل'},
  'Staff Portal': {hi:'कर्मचारी पोर्टल',bn:'কর্মী পোর্টাল',mr:'कर्मचारी पोर्टल',ta:'பணியாளர் தளம்',te:'సిబ్బంది పోర్టల్',gu:'સ્ટાફ પોર્ટલ',kn:'ಸಿಬ್ಬಂದಿ ಪೋರ್ಟಲ್',ml:'സ്റ്റാഫ് പോർട്ടൽ',pa:'ਸਟਾਫ ਪੋਰਟਲ',or:'କର୍ମଚାରୀ ପୋର୍ଟାଲ',ur:'عملہ پورٹل'},
  'Institute Admin': {hi:'संस्थान व्यवस्थापक',bn:'প্রতিষ্ঠান প্রশাসক',mr:'संस्था प्रशासक',ta:'நிறுவன நிர்வாகம்',te:'సంస్థ నిర్వాహకుడు',gu:'સંસ્થા સંચાલક',kn:'ಸಂಸ್ಥೆ ನಿರ್ವಾಹಕ',ml:'സ്ഥാപന അഡ്മിൻ',pa:'ਸੰਸਥਾ ਐਡਮਿਨ',or:'ଅନୁଷ୍ଠାନ ପ୍ରଶାସକ',ur:'ادارہ منتظم'},
  'Welcome to ANTAR': {hi:'ANTAR में आपका स्वागत है',bn:'ANTAR-এ স্বাগতম',mr:'ANTAR मध्ये स्वागत आहे',ta:'ANTAR-க்கு வரவேற்கிறோம்',te:'ANTAR కు స్వాగతం',gu:'ANTAR માં આપનું સ્વાગત છે',kn:'ANTAR ಗೆ ಸ್ವಾಗತ',ml:'ANTAR-ലേക്ക് സ്വാഗതം',pa:'ANTAR ਵਿੱਚ ਜੀ ਆਇਆਂ ਨੂੰ',or:'ANTAR କୁ ସ୍ୱାଗତ',ur:'ANTAR میں خوش آمدید'},
  'Choose your portal': {hi:'अपना पोर्टल चुनें',bn:'আপনার পোর্টাল বেছে নিন',mr:'तुमचे पोर्टल निवडा',ta:'உங்கள் தளத்தைத் தேர்ந்தெடுக்கவும்',te:'మీ పోర్టల్‌ను ఎంచుకోండి',gu:'તમારું પોર્ટલ પસંદ કરો',kn:'ನಿಮ್ಮ ಪೋರ್ಟಲ್ ಆಯ್ಕೆಮಾಡಿ',ml:'നിങ്ങളുടെ പോർട്ടൽ തിരഞ്ഞെടുക്കുക',pa:'ਆਪਣਾ ਪੋਰਟਲ ਚੁਣੋ',or:'ଆପଣଙ୍କ ପୋର୍ଟାଲ୍ ବାଛନ୍ତୁ',ur:'اپنا پورٹل منتخب کریں'},
  'Sign in securely': {hi:'सुरक्षित रूप से साइन इन करें',bn:'নিরাপদে সাইন ইন করুন',mr:'सुरक्षितपणे साइन इन करा',ta:'பாதுகாப்பாக உள்நுழையவும்',te:'సురక్షితంగా సైన్ ఇన్ చేయండి',gu:'સુરક્ષિત રીતે સાઇન ઇન કરો',kn:'ಸುರಕ್ಷಿತವಾಗಿ ಸೈನ್ ಇನ್ ಮಾಡಿ',ml:'സുരക്ഷിതമായി സൈൻ ഇൻ ചെയ്യുക',pa:'ਸੁਰੱਖਿਅਤ ਸਾਈਨ ਇਨ ਕਰੋ',or:'ସୁରକ୍ଷିତ ଭାବେ ସାଇନ୍ ଇନ୍ କରନ୍ତୁ',ur:'محفوظ طریقے سے سائن ان کریں'},
  'Logout': {hi:'लॉग आउट',bn:'লগ আউট',mr:'लॉग आउट',ta:'வெளியேறு',te:'లాగ్ అవుట్',gu:'લૉગ આઉટ',kn:'ಲಾಗ್ ಔಟ್',ml:'ലോഗ് ഔട്ട്',pa:'ਲੌਗ ਆਉਟ',or:'ଲଗ୍ ଆଉଟ୍',ur:'لاگ آؤٹ'},
  'Back': {hi:'वापस',bn:'ফিরে যান',mr:'मागे',ta:'பின்செல்',te:'వెనుకకు',gu:'પાછા',kn:'ಹಿಂದೆ',ml:'തിരികെ',pa:'ਵਾਪਸ',or:'ପଛକୁ',ur:'واپس'},
  'Save': {hi:'सहेजें',bn:'সংরক্ষণ করুন',mr:'जतन करा',ta:'சேமி',te:'సేవ్ చేయండి',gu:'સાચવો',kn:'ಉಳಿಸಿ',ml:'സേവ് ചെയ്യുക',pa:'ਸੰਭਾਲੋ',or:'ସେଭ୍ କରନ୍ତୁ',ur:'محفوظ کریں'},
  'Cancel': {hi:'रद्द करें',bn:'বাতিল',mr:'रद्द करा',ta:'ரத்து செய்',te:'రద్దు చేయండి',gu:'રદ કરો',kn:'ರದ್ದುಮಾಡಿ',ml:'റദ്ദാക്കുക',pa:'ਰੱਦ ਕਰੋ',or:'ବାତିଲ୍ କରନ୍ତୁ',ur:'منسوخ کریں'},
  'Loading…': {hi:'लोड हो रहा है…',bn:'লোড হচ্ছে…',mr:'लोड होत आहे…',ta:'ஏற்றப்படுகிறது…',te:'లోడ్ అవుతోంది…',gu:'લોડ થઈ રહ્યું છે…',kn:'ಲೋಡ್ ಆಗುತ್ತಿದೆ…',ml:'ലോഡ് ചെയ്യുന്നു…',pa:'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…',or:'ଲୋଡ୍ ହେଉଛି…',ur:'لوڈ ہو رہا ہے…'},
  'Search': {hi:'खोजें',bn:'খুঁজুন',mr:'शोधा',ta:'தேடல்',te:'వెతకండి',gu:'શોધો',kn:'ಹುಡುಕಿ',ml:'തിരയുക',pa:'ਖੋਜੋ',or:'ଖୋଜନ୍ତୁ',ur:'تلاش کریں'},
  'Messages': {hi:'संदेश',bn:'বার্তা',mr:'संदेश',ta:'செய்திகள்',te:'సందేశాలు',gu:'સંદેશાઓ',kn:'ಸಂದೇಶಗಳು',ml:'സന്ദേശങ്ങൾ',pa:'ਸੁਨੇਹੇ',or:'ବାର୍ତ୍ତା',ur:'پیغامات'},
  'Documents': {hi:'दस्तावेज़',bn:'নথি',mr:'कागदपत्रे',ta:'ஆவணங்கள்',te:'పత్రాలు',gu:'દસ્તાવેજો',kn:'ದಾಖಲೆಗಳು',ml:'രേഖകൾ',pa:'ਦਸਤਾਵੇਜ਼',or:'ଦଲିଲ୍',ur:'دستاویزات'},
  'Schedule': {hi:'कार्यक्रम',bn:'সময়সূচি',mr:'वेळापत्रक',ta:'அட்டவணை',te:'షెడ్యూల్',gu:'સમયપત્રક',kn:'ವೇಳಾಪಟ್ಟಿ',ml:'ഷെഡ്യൂൾ',pa:'ਸਮਾਂ-ਸਾਰਣੀ',or:'କାର୍ଯ୍ୟସୂଚୀ',ur:'شیڈول'},
  'Notifications': {hi:'सूचनाएँ',bn:'বিজ্ঞপ্তি',mr:'सूचना',ta:'அறிவிப்புகள்',te:'నోటిఫికేషన్లు',gu:'સૂચનાઓ',kn:'ಅಧಿಸೂಚನೆಗಳು',ml:'അറിയിപ്പുകൾ',pa:'ਸੂਚਨਾਵਾਂ',or:'ବିଜ୍ଞପ୍ତି',ur:'اطلاعات'},
}
type LocaleState={language:LanguageCode;setLanguage:(value:LanguageCode)=>void;t:(english:string)=>string}
const LocaleContext=createContext<LocaleState>({language:'en',setLanguage:()=>undefined,t:(x)=>x})
export function LocaleProvider({children}:{children:ReactNode}){
  const [language,setLanguageState]=useState<LanguageCode>(()=>(localStorage.getItem('antar-language') as LanguageCode)||'en')
  const setLanguage=(value:LanguageCode)=>{localStorage.setItem('antar-language',value);setLanguageState(value)}
  useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=language==='ur'?'rtl':'ltr'},[language])
  const value=useMemo(()=>({language,setLanguage,t:(english:string)=>copy[english]?.[language]||english}),[language])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
export const useLocale=()=>useContext(LocaleContext)
export function LanguageSelector({compact=false}:{compact?:boolean}){
  const {language,setLanguage,t}=useLocale()
  return <label className={compact?'language-selector compact':'language-selector'} aria-label={t('Language')}>
    <Languages size={16}/><span className="sr-only">{t('Language')}</span>
    <select value={language} onChange={e=>setLanguage(e.target.value as LanguageCode)}>
      {supportedLanguages.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}
    </select>
  </label>
}
