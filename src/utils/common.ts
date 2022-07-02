import { AppConstants } from "../constants/app-constants";
import { CssSelector, RefreshSelector, Site } from "../types";

const buildSelector = async (hideMode: number, searchMode: number, cssSelectorsAllSite: CssSelector[], cssSelectorsThisSite: CssSelector[], duplicateSelectors: string[]): Promise<string> => {
    const selectorsAllSites = cssSelectorsAllSite
        .filter(selector => !selector.visibility && selector.hideMode === hideMode && selector.searchMode === searchMode && !duplicateSelectors.includes(selector.value))
        .map(selector => selector.value);
    const selectorsThisSite = cssSelectorsThisSite
        .filter(selector => !selector.visibility && selector.hideMode === hideMode && selector.searchMode === searchMode)
        .map(selector => selector.value);

    return selectorsAllSites.concat(selectorsThisSite).join(',');
}

export const buildRefreshSelector = async (sites: Site[], activeDomain: string): Promise<RefreshSelector> => {
    const cssSelectorsAllSite = sites.find(site => site.domain === AppConstants.AllSites)?.cssSelectors ?? [];
    const cssSelectorsThisSite = sites.find(site => site.domain === activeDomain)?.cssSelectors ?? [];
    const selectorsValueAllSite = cssSelectorsAllSite.filter(selector => !selector.visibility).map(selector => selector.value);
    const selectorsValueThisSite = cssSelectorsThisSite.filter(selector => !selector.visibility).map(selector => selector.value);
    const duplicateSelectors = selectorsValueAllSite.filter(selector => selectorsValueThisSite.includes(selector));

    return {
        elementShallowSelector: await buildSelector(AppConstants.ElementHideMode, AppConstants.shallowSearch, cssSelectorsAllSite, cssSelectorsThisSite, duplicateSelectors),
        elementDeepSelector: await buildSelector(AppConstants.ElementHideMode, AppConstants.deepSearch, cssSelectorsAllSite, cssSelectorsThisSite, duplicateSelectors),
        textSelector: await buildSelector(AppConstants.TextHideMode, AppConstants.shallowSearch, cssSelectorsAllSite, cssSelectorsThisSite, duplicateSelectors)
    };
}

export const removeEmptySites = (sites: Site[]) => sites.filter(site => site.cssSelectors.length || !site.enabled || site.domain === AppConstants.AllSites);

export const isSafari = () => navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') === -1;

export const initializeStorageIfNeeded = async () => {
    const localData = await chrome.storage.local.get('hasInitialized');
    const hasInitialized = (localData.hasInitialized ?? false) as boolean;
    if (!hasInitialized) {
        await initializeStorage();
    }
}

export const initializeStorage = async () => {
    await chrome.storage.sync.set({
        hasInitialized: true,
        emoGuardian: '😎👍',
        sites: [{
            domain: AppConstants.AllSites,
            enabled: true,
            cssSelectors: AppConstants.RecommendCssSelectors
        }]
    });
}