import React from 'react';
import '../styles/app.css';
import BasicTabs from './basic-tab';
import { AppConstants } from '../constants/app-constants';
import { getActiveTabAsync } from '../utils/chrome-async';
import { Site, CssSelector, RefreshSelector } from '../types';
import { buildRefreshSelector, removeEmptySites } from '../utils/common';

export interface PopupState {
  keywords: string[];
  sites: Site[];
  currentSiteIndex: number;
  activeDomain: string;
  autoImportEnabled: boolean;
  alwaysShowKeywords: boolean;
  canInteract: boolean;
}

export class Popup extends React.Component<{}, PopupState> {
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
      alwaysShowKeywords: false,
      canInteract: true
    };
  }

  async componentDidMount() {
    const syncData = await chrome.storage.sync.get(['keywords', 'sites']);
    const localData = await chrome.storage.local.get(['keywords', 'sites', 'autoImportEnabled', 'alwaysShowKeywords']);

    const autoImportEnabled = (localData.autoImportEnabled ?? this.state.autoImportEnabled) as boolean;
    const alwaysShowKeywords = (localData.alwaysShowKeywords ?? this.state.alwaysShowKeywords) as boolean;
    const keywords = ((autoImportEnabled ? localData.keywords : syncData.keywords) ?? this.state.keywords) as string[];
    const sites = ((autoImportEnabled ? localData.sites : syncData.sites) ?? this.state.sites) as Site[];
    let cleanedSites = removeEmptySites(sites);
    if (!autoImportEnabled) {
      chrome.storage.sync.set({ sites: cleanedSites });
    }

    const activeTab = await getActiveTabAsync();
    if (!activeTab.url) {
      throw new Error('Unexpected error: Missing url');
    }
    const activeUrl = new URL(activeTab.url);
    const activeDomain = activeUrl.hostname;
    const canInteract = activeUrl.protocol.startsWith('http');

    let currentSiteIndex = cleanedSites.findIndex(site => site.domain === activeDomain);
    const siteExists = currentSiteIndex >= 0;
    if (!siteExists) {
      if (canInteract) {
        const newSite = { domain: activeDomain, enabled: true, cssSelectors: [] };
        cleanedSites = cleanedSites.concat([newSite]);
        currentSiteIndex = cleanedSites.length - 1
      } else {
        currentSiteIndex = cleanedSites.findIndex(site => site.domain === AppConstants.AllSites);
      }
    }

    this.setState({
      keywords: keywords,
      sites: cleanedSites,
      currentSiteIndex: currentSiteIndex,
      activeDomain: activeDomain,
      canInteract: canInteract,
      autoImportEnabled: autoImportEnabled,
      alwaysShowKeywords: alwaysShowKeywords
    });
  }

  getRefreshSelector = async (): Promise<RefreshSelector> => {
    return await buildRefreshSelector(this.state.sites, this.state.activeDomain);
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
          canInteract={this.state.canInteract}
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
