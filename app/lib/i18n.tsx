'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'EN' | 'SS';

interface Translations {
  [key: string]: {
    EN: string;
    SS: string;
  };
}

export const dictionary: Translations = {
  appName: { EN: 'BIKA', SS: 'BIKA' },
  slogan: { EN: 'See something, say something', SS: 'Bona lokutsite, kusho lokutsite' },
  nationalAlert: { EN: 'KINGDOM OF ESWATINI • NATIONWIDE INCIDENT & LOGISTICS REPORTING SYSTEM', SS: 'UMBUSO WE-ESWATINI • SISEMO SAKUBIKA TINKATHO NETIMPHAHLA SIVE LONKHE' },
  emergencyHotline: { EN: 'EMERGENCY HOTLINE: 999 / 800-BIKA', SS: 'LUCINGO LWASESHESHA: 999 / 800-BIKA' },
  systemOnline: { EN: 'SYSTEM ONLINE', SS: 'SISEMO SISEBENTA' },
  offlineMode: { EN: 'OFFLINE DRAFT MODE', SS: 'SISEMO SANGEWASHO' },
  publicPortal: { EN: 'Public Portal', SS: 'Sikhangiso SeSive' },
  commandCentre: { EN: 'Command Centre', SS: 'Sikhulukhulu SeSive' },
  officialDashboard: { EN: 'Official Dashboard', SS: 'Lipulatifomu LaBaphathi' },
  fleetOperators: { EN: 'Fleet & Operators', SS: 'Timoto NemaBhasi' },
  restaurantsClinics: { EN: 'Restaurants & Clinics', SS: 'EmaResterenti NemaCilinki' },
  analyticsReports: { EN: 'Analytics & Reports', SS: 'Tibalobalo NeMibiko' },
  superAdmin: { EN: 'Super Admin', SS: 'Umphathi Lomkhulu' },
  reportAnIncident: { EN: 'Report an Incident', SS: 'Bika Sento' },
  reportAnIncidentDesc: { EN: 'Speeding kombis, rank congestion, unsafe road/air/rail conditions.', SS: 'Omakhumbi labagijimisa kakhulu, insobatelo titeshi, timo letingaphephanga.' },
  reportAComplaint: { EN: 'Report a Complaint', SS: 'Bika Siphithiphithi / Sijabhaniso' },
  reportAComplaintDesc: { EN: 'Expired restaurant food, overcharging, bad conduct, long waiting times.', SS: 'Kudla lasekuphelelwe sikhatsi, kubhadalisa kakhulu, kutiphatsa kumphe.' },
  giveACompliment: { EN: 'Give a Compliment', SS: 'Kuncoma / Tfumelela Busa' },
  giveAComplimentDesc: { EN: 'Recognize honest kombi drivers, helpful rank marshals or police officers.', SS: 'Ncoma bashayeli batimbhashi labetsembekile, emapholisa noma emamashali.' },
  rateAService: { EN: 'Rate a Service', SS: 'Linga Inkonzo' },
  rateAServiceDesc: { EN: 'Provide star ratings on safety, cleanliness, pricing, and waiting time.', SS: 'Tfokotisa emastarsi ngekuphepha, kuhlanta, kubhadala nesikhatsi.' },
  checkMyReport: { EN: 'Track My Report', SS: 'Landela Liphothe Lami' },
  checkMyReportDesc: { EN: 'Track live status & chat with assigned officers using your BIKA Reference ID.', SS: 'Landela simo nemapholisa labasebentana neliphothe lakho ngeRef ID.' },
  emergencyReport: { EN: 'Emergency / Urgent Report', SS: 'Liphothe Leshesha / Libandla' },
  emergencyReportDesc: { EN: 'Immediate threat to life, major accident, hazardous chemical leak.', SS: 'Ingoti lenkhulu emphilweni, tingozi temgwaco, kuvisana kwetidzingo.' },
  selectMode: { EN: 'What service or transport mode is involved?', SS: 'Nguyiphi inkonzo noma indlela yekuhamba lephetfwe?' },
  airTransport: { EN: 'Air Transport & Aviation', SS: 'Kuhamba Ngemoya / Tikhwelelo' },
  seaTransport: { EN: 'Sea / Maritime Transport', SS: 'Kuhamba Ngelwandle / Emaloli Emachweba' },
  railTransport: { EN: 'Rail Transport', SS: 'Kuhamba Ngetimela' },
  roadTransport: { EN: 'Road / Public Transport', SS: 'Kuhamba Ngemgwaco / Omakhumbi Negebhi' },
  freightLogistics: { EN: 'Freight & Logistics', SS: 'EmaLoli Ekuphatfwa Kwetimphahla' },
  restaurantFood: { EN: 'Restaurants & Food Trade', SS: 'Tetidlo NemaResteRenti' },
  hospitalClinic: { EN: 'Hospitals & Clinics', SS: 'Tibhedlela Nemaclinics' },
  otherTrade: { EN: 'Other Transport & Trade', SS: 'Tetinye Tinhlelo Tezekuhwebana' },
  submitReport: { EN: 'Submit Report Now', SS: 'Leta Liphothe Manje' },
  description: { EN: 'Describe what happened in detail...', SS: 'Chaza kutsi kwentekeni ngalokugcwele...' },
  location: { EN: 'Location / Rank / Station / Highway', SS: 'Indawo / Isiteshi / Umgwaco' },
  region: { EN: 'Region in Eswatini', SS: 'Sifundza LeEswatini' },
  severity: { EN: 'Severity Level', SS: 'Lizinga Lengoti' },
  evidenceUpload: { EN: 'Attach Photo / Supporting Evidence (Max 1 MB)', SS: 'Faka Litfombe / Ubufakazi (Lizinga 1 MB)' },
  trackPrompt: { EN: 'Enter your BIKA Incident Reference ID to track progress', SS: 'Faka Inombolo Yereferensi BIKA Yokulandela' },
  mapInstruction: { EN: 'Click region boundary or marker pins to view regional reports.', SS: 'Cindozela umngcwabo wesifundza noma emaphingi ekubona imibiko.' },
  quickRoleSwitch: { EN: 'Demo Access Mode', SS: 'Lizinga Lekungena TeLutfuntfo' },
  hhohho: { EN: 'Hhohho (Mbabane, Piggs Peak, Ezulwini)', SS: 'Hhohho (Mbabane, Piggs Peak, Ezulwini)' },
  manzini: { EN: 'Manzini (Manzini, Matsapha, Kwaluseni)', SS: 'Manzini (Manzini, Matsapha, Kwaluseni)' },
  shiselweni: { EN: 'Shiselweni (Nhlangano, Hlathikhulu)', SS: 'Shiselweni (Nhlangano, Hlathikhulu)' },
  lubombo: { EN: 'Lubombo (Siteki, Big Bend, Lomahasha)', SS: 'Lubombo (Siteki, Big Bend, Lomahasha)' },
};

const LANGUAGE_STORAGE_KEY = 'bika_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'EN',
  setLanguage: () => {},
  t: (key: string) => key,
});

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'EN';
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'EN' || stored === 'SS') return stored;
  } catch {
    /* ignore */
  }
  return 'EN';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('EN');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLanguageState(readStoredLanguage());
    setHydrated(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  };

  const t = (key: string): string => {
    if (dictionary[key]) {
      return dictionary[key][language] || dictionary[key].EN;
    }
    return key;
  };

  const contextValue: LanguageContextType = {
    language: hydrated ? language : 'EN',
    setLanguage,
    t,
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: contextValue },
    children
  );
};

export const useLanguage = () => useContext(LanguageContext);
