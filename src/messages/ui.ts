import type { Locale } from "@/lib/i18n/locale";

export type UiCopy = {
  nav: {
    dashboard: string;
    clients: string;
    projects: string;
    finance: string;
    business: string;
    income: string;
    expenses: string;
    hours: string;
    invoices: string;
    generalExpenses: string;
    mileage: string;
    welcome: string;
    /** Mobile menu: collapsible label grouping profile + settings under the user name. */
    profileAndSettings: string;
    profile: string;
    settings: string;
    theme: string;
    /** User-facing link to the feedback submission page. */
    sendFeedback: string;
    /** Admin-only link to the feedback submissions list. */
    feedbackInbox: string;
    openMenu: string;
    closeMenu: string;
    language: string;
  };
  auth: {
    signOut: string;
    signingOut: string;
  };
  footer: {
    rights: string;
    contact: string;
    privacy: string;
    terms: string;
  };
};

const en: UiCopy = {
  nav: {
    dashboard: "Dashboard",
    clients: "Clients",
    projects: "Projects",
    finance: "Finance",
    business: "Business",
    income: "Income",
    expenses: "Expenses",
    hours: "Hours",
    invoices: "Invoices",
    generalExpenses: "General expenses",
    mileage: "Mileage",
    welcome: "Welcome",
    profileAndSettings: "Profile & settings",
    profile: "Profile",
    settings: "Settings",
    theme: "Theme",
    sendFeedback: "Send feedback",
    feedbackInbox: "Feedback inbox",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
  },
  auth: {
    signOut: "Sign out",
    signingOut: "Signing out...",
  },
  footer: {
    rights: "© 2026 Rogervisuals. All rights reserved.",
    contact: "Contact",
    privacy: "Privacy",
    terms: "Terms",
  },
};

const es: UiCopy = {
  nav: {
    dashboard: "Panel",
    clients: "Clientes",
    projects: "Proyectos",
    finance: "Finanzas",
    business: "Negocio",
    income: "Ingresos",
    expenses: "Gastos",
    hours: "Horas",
    invoices: "Facturas",
    generalExpenses: "Gastos generales",
    mileage: "Kilometraje",
    welcome: "Bienvenido",
    profileAndSettings: "Perfil y ajustes",
    profile: "Perfil",
    settings: "Ajustes",
    theme: "Tema",
    sendFeedback: "Enviar comentarios",
    feedbackInbox: "Bandeja de comentarios",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    language: "Idioma",
  },
  auth: {
    signOut: "Cerrar sesión",
    signingOut: "Cerrando sesión...",
  },
  footer: {
    rights: "© 2026 Rogervisuals. Todos los derechos reservados.",
    contact: "Contacto",
    privacy: "Privacidad",
    terms: "Términos",
  },
};

const nl: UiCopy = {
  nav: {
    dashboard: "Dashboard",
    clients: "Klanten",
    projects: "Projecten",
    finance: "Financiën",
    business: "Zakelijk",
    income: "Inkomsten",
    expenses: "Uitgaven",
    hours: "Uren",
    invoices: "Facturen",
    generalExpenses: "Algemene kosten",
    mileage: "Kilometervergoeding",
    welcome: "Welkom",
    profileAndSettings: "Profiel & instellingen",
    profile: "Profiel",
    settings: "Instellingen",
    theme: "Thema",
    sendFeedback: "Feedback sturen",
    feedbackInbox: "Feedback-inbox",
    openMenu: "Menu openen",
    closeMenu: "Menu sluiten",
    language: "Taal",
  },
  auth: {
    signOut: "Uitloggen",
    signingOut: "Bezig met uitloggen...",
  },
  footer: {
    rights: "© 2026 Rogervisuals. Alle rechten voorbehouden.",
    contact: "Contact",
    privacy: "Privacy",
    terms: "Voorwaarden",
  },
};

export const uiByLocale: Record<Locale, UiCopy> = {
  en,
  es,
  nl,
};
