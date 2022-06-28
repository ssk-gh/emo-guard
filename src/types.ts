export interface Site {
  domain: string;
  enabled: boolean;
  cssSelectors: CssSelector[];
}

export interface CssSelector {
  value: string;
  hideMode: number;
  searchMode: number;
  visibility: boolean;
}

export interface ModeOption {
  icon: React.ReactNode;
  text: React.ReactNode;
}

export interface RefreshSelector {
  elementShallowSelector: string;
  elementDeepSelector: string;
  textSelector: string;
}