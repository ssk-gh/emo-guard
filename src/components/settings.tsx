import React from 'react';
import { Site } from '../App';
import { AppConstants } from '../constants/app-constants';
import { getStorageAsync } from '../utils/chrome-async';
import '../App.css';
import { SettingsPanel } from './settings-panel';
import { Container } from '@mui/material';
import DOMPurify from 'dompurify';

export interface SettingsState {
    keywords: string[];
    sites: Site[];
    emoGuardian: string;
    dropboxIntegrationEnabled: boolean;
    autoImportEnabled: boolean;
    autoImportInterval: number;
    lastExport: Date | null;
    lastImport: Date | null;
    blockingSpeed: number;
}

class Settings extends React.Component<{}, SettingsState> {
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
            emoGuardian: '',
            dropboxIntegrationEnabled: false,
            autoImportEnabled: false,
            autoImportInterval: 30,
            lastExport: null,
            lastImport: null,
            blockingSpeed: 50
        };
    }

    async componentDidMount() {
        const syncData = await getStorageAsync(['keywords', 'sites', 'emoGuardian']);
        const localData = await chrome.storage.local.get(['keywords', 'sites', 'emoGuardian', 'dropboxIntegrationEnabled', 'autoImportEnabled', 'autoImportInterval', 'lastExport', 'lastImport', 'blockingSpeed']);

        const dropboxIntegrationEnabled = (localData.dropboxIntegrationEnabled ?? this.state.dropboxIntegrationEnabled) as boolean;
        const autoImportEnabled = (localData.autoImportEnabled ?? this.state.autoImportEnabled) as boolean;
        const autoImportInterval = (localData.autoImportInterval ?? this.state.autoImportInterval) as number;
        const lastExport = localData.lastExport ? new Date(localData.lastExport) : this.state.lastExport;
        const lastImport = localData.lastImport ? new Date(localData.lastImport) : this.state.lastImport;
        const blockingSpeed = (localData.blockingSpeed ?? this.state.blockingSpeed) as number;
        this.setState({
            dropboxIntegrationEnabled: dropboxIntegrationEnabled,
            autoImportEnabled: autoImportEnabled,
            autoImportInterval: autoImportInterval,
            lastExport: lastExport,
            lastImport: lastImport,
            blockingSpeed: blockingSpeed
        });

        if (autoImportEnabled) {
            const keywords = (localData.keywords ?? this.state.keywords) as string[];
            this.setState({ keywords: keywords });

            const sites = (localData.sites ?? this.state.sites) as Site[];
            const cleanedSites = this.removeEmptySites(sites);
            this.setState({ sites: cleanedSites });

            const emoGuardian = localData.emoGuardian ?? this.state.emoGuardian;
            const cleanedEmoGuardian = DOMPurify.sanitize(emoGuardian);
            this.setState({ emoGuardian: cleanedEmoGuardian });
        } else {
            const keywords = (syncData.keywords ?? this.state.keywords) as string[];
            this.setState({ keywords: keywords });

            const sites = (syncData.sites ?? this.state.sites) as Site[];
            const cleanedSites = this.removeEmptySites(sites);
            this.setSites(cleanedSites);

            const emoGuardian = syncData.emoGuardian ?? this.state.emoGuardian;
            const cleanedEmoGuardian = DOMPurify.sanitize(emoGuardian);
            this.setState({ emoGuardian: cleanedEmoGuardian });
        }

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.callee) {
                case 'updateLastImport':
                    const lastImport = new Date(message.args[0]);
                    this.setLastImport(lastImport);
                    break;
                default:
                    throw new Error(`Unknown message: ${message}`);
            }
            sendResponse();
        });
    }

    removeEmptySites = (sites: Site[]) => sites.filter(site => site.cssSelectors.length || !site.enabled || site.domain === AppConstants.AllSites);

    getSyncContents = async (): Promise<Object> => {
        const keywords = await this.getKeywords();
        const sites = await this.getSites();
        const emoGuardian = await this.getEmoGuardian();

        return { keywords: keywords, sites: sites, emoGuardian: emoGuardian };
    }

    getKeywords = async (): Promise<string[]> => {
        const syncData = await getStorageAsync(['keywords']);
        const localData = await chrome.storage.local.get(['keywords']);
        return ((this.state.autoImportEnabled ? localData.keywords : syncData.keywords) ?? []) as string[];
    }

    getSites = async (): Promise<Site[]> => {
        const syncData = await getStorageAsync(['sites']);
        const localData = await chrome.storage.local.get(['sites']);
        return ((this.state.autoImportEnabled ? localData.sites : syncData.sites) ?? []) as Site[];
    }

    getEmoGuardian = async (): Promise<string> => {
        const syncData = await getStorageAsync(['emoGuardian']);
        const localData = await chrome.storage.local.get(['emoGuardian']);
        return ((this.state.autoImportEnabled ? localData.emoGuardian : syncData.emoGuardian) ?? '') as string;
    }

    setSites = (sites: Site[]) => {
        this.setState({ sites: sites });
        chrome.storage.sync.set({ sites: sites });
    }

    setEmoGuardian = (emoGuardian: string) => {
        this.setState({ emoGuardian: emoGuardian });
    }

    setDropboxIntegrationEnabled = (dropboxIntegrationEnabled: boolean) => {
        this.setState({ dropboxIntegrationEnabled: dropboxIntegrationEnabled });
        chrome.storage.local.set({ dropboxIntegrationEnabled: dropboxIntegrationEnabled });
    }

    setAutoImportEnabled = async (autoImportEnabled: boolean) => {
        this.setState({ autoImportEnabled: autoImportEnabled });
        await chrome.storage.local.set({ autoImportEnabled: autoImportEnabled });
    }

    setAutoImportInterval = async (autoImportInterval: number) => {
        this.setState({ autoImportInterval: autoImportInterval });
        await chrome.storage.local.set({ autoImportInterval: autoImportInterval });
    }

    setLastExport = async (lastExport: Date) => {
        this.setState({ lastExport: lastExport });
        await chrome.storage.local.set({ lastExport: lastExport.toJSON() });
    }

    setLastImport = async (lastImport: Date) => {
        this.setState({ lastImport: lastImport });
        await chrome.storage.local.set({ lastImport: lastImport.toJSON() });
    }

    setBlockingSpeed = async (blockingSpeed: number) => {
        this.setState({ blockingSpeed: blockingSpeed });
        await chrome.storage.local.set({ blockingSpeed: blockingSpeed });
    }

    render() {
        return (
            <div className="App">
                <Container maxWidth="sm">
                    <SettingsPanel
                        emoGuardian={this.state.emoGuardian}
                        setEmoGuardian={this.setEmoGuardian}
                        getSyncContents={this.getSyncContents}
                        setSites={this.setSites}
                        sites={this.state.sites}
                        dropboxIntegrationEnabled={this.state.dropboxIntegrationEnabled}
                        setDropboxIntegrationEnabled={this.setDropboxIntegrationEnabled}
                        autoImportEnabled={this.state.autoImportEnabled}
                        setAutoImportEnabled={this.setAutoImportEnabled}
                        autoImportInterval={this.state.autoImportInterval}
                        setAutoImportInterval={this.setAutoImportInterval}
                        lastExport={this.state.lastExport}
                        setLastExport={this.setLastExport}
                        lastImport={this.state.lastImport}
                        blockingSpeed={this.state.blockingSpeed}
                        setBlockingSpeed={this.setBlockingSpeed}
                    ></SettingsPanel>
                </Container>
            </div>
        );
    }
}

export { Settings };
