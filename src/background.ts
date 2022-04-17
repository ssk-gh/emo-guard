import { AppConstants } from "./constants/app-constants";

chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        const sites = [
            {
                domain: AppConstants.AllSites,
                enabled: true,
                cssSelectors: []
            }
        ];
        const emoGuardian = '😭🛡 🗯';
        const defaultTarget = AppConstants.ThisSite;
        chrome.storage.sync.set({
            sites: sites,
            emoGuardian: emoGuardian,
            defaultTarget: defaultTarget
        })
    }
});

export { }
