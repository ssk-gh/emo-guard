import React from 'react';
import './App.css';
import BasicTabs from './components/basic-tab';
import { getActiveTabAsync, getStorageAsync } from './utils/chrome-async';

export interface AppState {
  keywords: string[];
  sites: Site[];
  currentSiteIndex: number;
  activeDomain: string;
}

export interface Site {
  domain: string;
  enabled: boolean;
  cssSelectors: CssSelector[];
}

export interface CssSelector {
  value: string;
  visibility: boolean;
}

class App extends React.Component<{}, AppState> {
  constructor(props = {}) {
    super(props);
    this.state = {
      keywords: [],
      sites: [
        {
          domain: 'default',
          enabled: true,
          cssSelectors: []
        }
      ],
      currentSiteIndex: 0,
      activeDomain: ''
    };
  }

  async componentDidMount() {
    const data = await getStorageAsync(['keywords', 'defaultSelectors', 'sites', 'interactiveSelector']);
    const keywords = (data.keywords ?? []) as string[];
    this.setState({ keywords: keywords });

    const sites = data.sites as Site[];
    if (sites && sites.length) {
      this.setState({ sites: sites });
    } else {
      chrome.storage.sync.set({ sites: this.state.sites });
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
      this.setState({ sites: newSites });
      this.setState({ currentSiteIndex: newSites.length - 1 });
    }

    if (data.interactiveSelector) {
      const newSites = this.state.sites.slice();
      newSites[this.state.currentSiteIndex].cssSelectors = newSites[this.state.currentSiteIndex].cssSelectors.concat([
        { value: data.interactiveSelector, visibility: false }
      ]);

      this.setSites(newSites);
      chrome.storage.sync.set({ interactiveSelector: '' });
    }
  }

  getJoinedSelector = (): string => {
    const defaultSelectors = this.state.sites.find(site => site.domain === 'default')?.cssSelectors.filter(selector => !selector.visibility).map(selector => selector.value) ?? [];
    const domainSelectors = this.state.sites[this.state.currentSiteIndex].cssSelectors.filter(selector => !selector.visibility).map(selector => selector.value);
    return defaultSelectors.concat(domainSelectors).join(',');
  }

  setKeywords = (keywords: string[]) => {
    this.setState({ keywords: keywords });
    chrome.storage.sync.set({ keywords: keywords });
  }

  setSelectors = (selectors: CssSelector[]) => {
    const newSites = this.state.sites.slice();
    newSites[this.state.currentSiteIndex].cssSelectors = selectors;

    this.setState({ sites: newSites });
    chrome.storage.sync.set({ sites: newSites });
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

  currentIsActiveDomain = () => {
    const currentDomain = this.state.sites[this.state.currentSiteIndex].domain;
    return currentDomain === this.state.activeDomain || currentDomain === 'default';
  }

  render() {
    return (
      <div className="App">
        <BasicTabs
          keywords={this.state.keywords}
          sites={this.state.sites}
          currentSiteIndex={this.state.currentSiteIndex}
          activeDomain={this.state.activeDomain}
          setKeywords={this.setKeywords}
          setSelectors={this.setSelectors}
          setSites={this.setSites}
          setCurrentSite={this.setCurrentSite}
          setCurrentSiteIndex={this.setCurrentSiteIndex}
          getJoinedSelector={this.getJoinedSelector}
          currentIsActiveDomain={this.currentIsActiveDomain}
        ></BasicTabs>
      </div>
    );
  }
}

export { App };
