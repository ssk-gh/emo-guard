import React from 'react';
import { AppConstants } from '../constants/app-constants';
import '../styles/app.css';
import { SettingsPanel } from './settings-panel';
import { Container } from '@mui/material';
import DOMPurify from 'dompurify';
import { Site } from '../types';
import { removeEmptySites } from '../utils/common';

export interface OptionsState {
    keywords: string[];
    sites: Site[];
    emoGuardian: string;
    dropboxIntegrationEnabled: boolean;
    autoImportEnabled: boolean;
    autoImportInterval: number;
    lastExport: Date | null;
    lastImport: Date | null;
    blockingSpeed: number;
    alwaysShowKeywords: boolean;
}

export class Options extends React.Component<{}, OptionsState> {
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
            blockingSpeed: 50,
            alwaysShowKeywords: false
        };
    }

    async componentDidMount() {
        const syncData = await chrome.storage.sync.get(['keywords', 'sites', 'emoGuardian']);
        const localData = await chrome.storage.local.get(['keywords', 'sites', 'emoGuardian', 'dropboxIntegrationEnabled', 'autoImportEnabled', 'autoImportInterval', 'lastExport', 'lastImport', 'blockingSpeed', 'alwaysShowKeywords']);

        const dropboxIntegrationEnabled = (localData.dropboxIntegrationEnabled ?? this.state.dropboxIntegrationEnabled) as boolean;
        const autoImportEnabled = (localData.autoImportEnabled ?? this.state.autoImportEnabled) as boolean;
        const autoImportInterval = (localData.autoImportInterval ?? this.state.autoImportInterval) as number;
        const lastExport = localData.lastExport ? new Date(localData.lastExport) : this.state.lastExport;
        const lastImport = localData.lastImport ? new Date(localData.lastImport) : this.state.lastImport;
        const blockingSpeed = (localData.blockingSpeed ?? this.state.blockingSpeed) as number;
        const alwaysShowKeywords = (localData.alwaysShowKeywords ?? this.state.alwaysShowKeywords) as boolean;
        const keywords = ((autoImportEnabled ? localData.keywords : syncData.keywords) ?? this.state.keywords) as string[];
        const sites = ((autoImportEnabled ? localData.sites : syncData.sites) ?? this.state.sites) as Site[];
        const cleanedSites = removeEmptySites(sites);
        const emoGuardian = ((autoImportEnabled ? localData.emoGuardian : syncData.emoGuardian) ?? this.state.emoGuardian) as string;
        const cleanedEmoGuardian = DOMPurify.sanitize(emoGuardian);
        this.setState({
            keywords: keywords,
            sites: cleanedSites,
            emoGuardian: cleanedEmoGuardian,
            dropboxIntegrationEnabled: dropboxIntegrationEnabled,
            autoImportEnabled: autoImportEnabled,
            autoImportInterval: autoImportInterval,
            lastExport: lastExport,
            lastImport: lastImport,
            blockingSpeed: blockingSpeed,
            alwaysShowKeywords: alwaysShowKeywords
        });

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.callee) {
                case 'updateLastImport':
                    const lastImport = new Date(message.args[0]);
                    this.setLastImport(lastImport);
                    break;
                default:
                    break;
            }
            sendResponse();
        });
    }

    getSyncContents = async (): Promise<Object> => {
        const keywords = await this.getKeywords();
        const sites = await this.getSites();
        const emoGuardian = await this.getEmoGuardian();

        return { keywords: keywords, sites: sites, emoGuardian: emoGuardian };
    }

    getKeywords = async (): Promise<string[]> => {
        const syncData = await chrome.storage.sync.get(['keywords']);
        const localData = await chrome.storage.local.get(['keywords']);
        return ((this.state.autoImportEnabled ? localData.keywords : syncData.keywords) ?? []) as string[];
    }

    getSites = async (): Promise<Site[]> => {
        const syncData = await chrome.storage.sync.get(['sites']);
        const localData = await chrome.storage.local.get(['sites']);
        return ((this.state.autoImportEnabled ? localData.sites : syncData.sites) ?? []) as Site[];
    }

    getEmoGuardian = async (): Promise<string> => {
        const syncData = await chrome.storage.sync.get(['emoGuardian']);
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

    setAlwaysShowKeywords = async (alwaysShowKeywords: boolean) => {
        this.setState({ alwaysShowKeywords: alwaysShowKeywords });
        await chrome.storage.local.set({ alwaysShowKeywords: alwaysShowKeywords });
    }

    render() {
        return (
            <div className="App">
                <Container maxWidth="sm">
                    <SettingsPanel
                        emoGuardian={this.state.emoGuardian}
                        setEmoGuardian={this.setEmoGuardian}
                        getSyncContents={this.getSyncContents}
                        getSites={this.getSites}
                        setSites={this.setSites}
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
                        alwaysShowKeywords={this.state.alwaysShowKeywords}
                        setAlwaysShowKeywords={this.setAlwaysShowKeywords}
                    ></SettingsPanel>
                </Container>
            </div>
        );
    }
}
