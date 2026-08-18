export interface LandingPageProps {
  isAuthenticated: boolean;
}

export interface LandingNavLink {
  href: string;
  label: string;
}

export interface LandingProofNote {
  icon: string;
  eyebrow: string;
  title: string;
  detail: string;
  tone: "yellow" | "green" | "peach" | "blue";
}

export interface LandingBenefit {
  icon: string;
  title: string;
  description: string;
}

export interface LandingFaq {
  question: string;
  answer: string;
}
