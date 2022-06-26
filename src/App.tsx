import React from 'react';
import './App.css';
import BasicTabs from './components/basic-tab';
import { AppConstants } from './constants/app-constants';
import { getActiveTabAsync, getStorageAsync } from './utils/chrome-async';

export interface AppState {
  keywords: string[];
  sites: Site[];
  currentSiteIndex: number;
  activeDomain: string;
  autoImportEnabled: boolean;
  alwaysShowKeywords: boolean;
}

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

class App extends React.Component<{}, AppState> {
  constructor(props = {}) {
    super(props);
    this.state = {
      keywords: [],
      sites: [
        {
          domain: AppConstants.AllSites,
          enabled: true,
          cssSelectors: []
        }
      ],
      currentSiteIndex: 0,
      activeDomain: '',
      autoImportEnabled: false,
      alwaysShowKeywords: false
    };
  }

  async componentDidMount() {
    const syncData = await getStorageAsync(['keywords', 'sites']);
    const localData = await chrome.storage.local.get(['keywords', 'sites', 'autoImportEnabled', 'alwaysShowKeywords']);

    const autoImportEnabled = (localData.autoImportEnabled ?? this.state.autoImportEnabled) as boolean;
    const alwaysShowKeywords = (localData.alwaysShowKeywords ?? this.state.alwaysShowKeywords) as boolean;
    this.setState({
      autoImportEnabled: autoImportEnabled,
      alwaysShowKeywords: alwaysShowKeywords
    });

    if (autoImportEnabled) {
      const keywords = (localData.keywords ?? this.state.keywords) as string[];
      this.setState({ keywords: keywords });

      const sites = (localData.sites ?? this.state.sites) as Site[];
      const cleanedSites = this.removeEmptySites(sites);
      this.setState({ sites: cleanedSites });
    } else {
      const keywords = (syncData.keywords ?? this.state.keywords) as string[];
      this.setState({ keywords: keywords });

      const sites = (syncData.sites ?? this.state.sites) as Site[];
      const cleanedSites = this.removeEmptySites(sites);
      this.setSites(cleanedSites);
    }

    const activeTab = await getActiveTabAsync();
    if (!activeTab.url) {
      throw new Error('Unexpected error: Missing url');
    }

    const activeUrl = new URL(activeTab.url);
    this.setState({ activeDomain: activeUrl.hostname });

    const currentSiteIndex = this.state.sites.findIndex(site => site.domain === activeUrl.hostname);
    if (currentSiteIndex >= 0) {
      this.setState({ currentSiteIndex: currentSiteIndex });
    } else {
      const currentSite = {
        domain: activeUrl.hostname,
        enabled: true,
        cssSelectors: []
      };
      const newSites = this.state.sites.concat([currentSite]);
      this.setState({
        sites: newSites,
        currentSiteIndex: newSites.length - 1
      });
    }
  }

  removeEmptySites = (sites: Site[]) => sites.filter(site => site.cssSelectors.length || !site.enabled || site.domain === AppConstants.AllSites);

  getSelector = async (hideMode: number, searchMode: number, cssSelectorsAllSite: CssSelector[], cssSelectorsThisSite: CssSelector[], duplicateSelectors: string[]): Promise<string> => {
    const selectorsAllSites = cssSelectorsAllSite
      .filter(selector => !selector.visibility && selector.hideMode === hideMode && selector.searchMode === searchMode && !duplicateSelectors.includes(selector.value))
      .map(selector => selector.value);
    const selectorsThisSite = cssSelectorsThisSite
      .filter(selector => !selector.visibility && selector.hideMode === hideMode && selector.searchMode === searchMode)
      .map(selector => selector.value);

    return selectorsAllSites.concat(selectorsThisSite).join(',');
  }

  getRefreshSelector = async (): Promise<{ elementShallowHideSelector: string, elementDeepHideSelector: string, textHideSelector: string }> => {
    const cssSelectorsAllSite = this.state.sites.find(site => site.domain === AppConstants.AllSites)?.cssSelectors ?? [];
    const cssSelectorsThisSite = this.state.sites.find(site => site.domain === this.state.activeDomain)?.cssSelectors ?? [];
    const selectorsValueAllSite = cssSelectorsAllSite.filter(selector => !selector.visibility).map(selector => selector.value);
    const selectorsValueThisSite = cssSelectorsThisSite.filter(selector => !selector.visibility).map(selector => selector.value);
    const duplicateSelectors = selectorsValueAllSite.filter(selector => selectorsValueThisSite.includes(selector));

    return {
      elementShallowHideSelector: await this.getSelector(AppConstants.ElementHideMode, AppConstants.shallowSearch, cssSelectorsAllSite, cssSelectorsThisSite, duplicateSelectors),
      elementDeepHideSelector: await this.getSelector(AppConstants.ElementHideMode, AppConstants.deepSearch, cssSelectorsAllSite, cssSelectorsThisSite, duplicateSelectors),
      textHideSelector: await this.getSelector(AppConstants.TextHideMode, AppConstants.shallowSearch, cssSelectorsAllSite, cssSelectorsThisSite, duplicateSelectors)
    };
  }


  setKeywords = async (keywords: string[]) => {
    this.setState({ keywords: keywords });
    await chrome.storage.sync.set({ keywords: keywords });
  }

  setSelectors = async (selectors: CssSelector[]) => {
    const newSites = this.state.sites.slice();
    newSites[this.state.currentSiteIndex].cssSelectors = selectors;

    this.setState({ sites: newSites });
    await chrome.storage.sync.set({ sites: newSites });
  }

  setSites = (sites: Site[]) => {
    this.setState({ sites: sites });
    chrome.storage.sync.set({ sites: sites });
  }

  setCurrentSite = (site: Site) => {
    const newSites = this.state.sites.slice();
    newSites[this.state.currentSiteIndex] = site;

    this.setSites(newSites);
  }

  setCurrentSiteIndex = (index: number) => {
    this.setState({ currentSiteIndex: index });
  }

  setAutoImportEnabled = (autoImportEnabled: boolean) => {
    this.setState({ autoImportEnabled: autoImportEnabled });
    chrome.storage.local.set({ autoImportEnabled: autoImportEnabled });
  }

  currentIsActiveDomain = () => {
    const currentDomain = this.state.sites[this.state.currentSiteIndex].domain;
    return currentDomain === this.state.activeDomain || currentDomain === AppConstants.AllSites;
  }

  render() {
    return (
      <div className="App">
        <BasicTabs
          keywords={this.state.keywords}
          sites={this.state.sites}
          currentSiteIndex={this.state.currentSiteIndex}
          activeDomain={this.state.activeDomain}
          autoImportEnabled={this.state.autoImportEnabled}
          alwaysShowKeywords={this.state.alwaysShowKeywords}
          setKeywords={this.setKeywords}
          setSelectors={this.setSelectors}
          setSites={this.setSites}
          setCurrentSite={this.setCurrentSite}
          setCurrentSiteIndex={this.setCurrentSiteIndex}
          getRefreshSelector={this.getRefreshSelector}
          currentIsActiveDomain={this.currentIsActiveDomain}
          setAutoImportEnabled={this.setAutoImportEnabled}
        ></BasicTabs>
      </div>
    );
  }
}

export { App };
