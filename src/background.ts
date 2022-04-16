chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        const sites = [
            {
                domain: 'All sites',
                enabled: true,
                cssSelectors: []
            }
        ];
        const emoGuardian = '😭🛡 🗯';
        const defaultTarget = 'this site';
        chrome.storage.sync.set({
            sites: sites,
            emoGuardian: emoGuardian,
            defaultTarget: defaultTarget
        })
    }
});

export { }
