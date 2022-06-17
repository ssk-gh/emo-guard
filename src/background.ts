import { Dropbox } from "dropbox";
import { Site } from "./App";
import { AppConstants } from "./constants/app-constants";
import { authorize, fetchFile } from "./cloud/dropbox";

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        const syncData = await chrome.storage.sync.get(['keywords', 'sites']);
        const isNewcomer = !syncData.keywords && !syncData.sites;

        if (isNewcomer) {
            const sites = [
                {
                    domain: AppConstants.AllSites,
                    enabled: true,
                    cssSelectors: AppConstants.RecommendCssSelectors
                }
            ];
            chrome.storage.sync.set({
                sites: sites
            });
        }

        const emoGuardian = '😭🛡 🗯';
        chrome.storage.local.set({
            emoGuardian: emoGuardian
        });
    }
});

chrome.runtime.onStartup.addListener(async () => {
    importBlockListIfEnabled();

    const localData = await chrome.storage.local.get('autoImportInterval');
    const autoImportInterval = (localData.autoImportInterval ?? 30) as number;
    chrome.alarms.create({ delayInMinutes: autoImportInterval });
});

chrome.alarms.onAlarm.addListener(async () => {
    importBlockListIfEnabled();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.callee) {
        case 'importBlockList':
            importBlockListIfEnabled();
            break;
        case 'updateAutoImportInterval':
            chrome.alarms.clearAll();
            chrome.alarms.create({ delayInMinutes: message.args[0] });
            break;
        default:
            throw new Error(`Unknown message: ${message}`);
    }
    sendResponse();
});

const importBlockListIfEnabled = async () => {
    const data = await chrome.storage.local.get('autoImportEnabled');
    const autoImportEnabled = (data.autoImportEnabled ?? false) as boolean;
    if (!autoImportEnabled) {
        return;
    }

    const dropboxAuth = await authorize();
    const dropbox = new Dropbox({ auth: dropboxAuth });
    const blockList = await fetchFile(dropbox, dropboxAuth, AppConstants.BlockListFileName) as { keywords: string[], sites: Site[], emoGuardian: string };

    const keywords = (blockList.keywords ?? []) as string[];
    const sites = (blockList.sites ?? []) as Site[];
    const cleanedSites = removeEmptySites(sites);
    const emoGuardian = (blockList.emoGuardian ?? '') as string;
    const now = new Date().toJSON();

    chrome.storage.local.set({
        keywords: keywords,
        sites: cleanedSites,
        emoGuardian: emoGuardian,
        lastImport: now
    });
    chrome.runtime.sendMessage({ callee: 'updateLastImport', args: [now] });
};

const removeEmptySites = (sites: Site[]) => sites.filter(site => site.cssSelectors.length || !site.enabled || site.domain === AppConstants.AllSites);

export { }
