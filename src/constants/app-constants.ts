import { CssSelector } from "../App";

export class AppConstants {
    static readonly AppName = 'EmoGuard';
    static readonly ThisSite = 'this site';
    static readonly AllSites = 'all sites';
    static readonly ElementHideMode = 0;
    static readonly TextHideMode = 1;
    static readonly shallowSearch = 0;
    static readonly deepSearch = 1;
    static readonly AuthRedirectUrl = 'https://ssk-gh.github.io/web-keyword-blocker/';
    static readonly BlockListFileName = 'blocklist.json';
    static readonly RepositoryUrl = 'https://github.com/ssk-gh/web-keyword-blocker';
    static readonly AutoImportIntervals = [
        {
            value: 5,
            displayName: chrome.i18n.getMessage('fiveMinutes')
        },
        {
            value: 15,
            displayName: chrome.i18n.getMessage('fifteenMinutes')
        },
        {
            value: 30,
            displayName: chrome.i18n.getMessage('thirtyMinutes')
        },
        {
            value: 60,
            displayName: chrome.i18n.getMessage('oneHour')
        },
        {
            value: 360,
            displayName: chrome.i18n.getMessage('sixHours')
        },
        {
            value: 1440,
            displayName: chrome.i18n.getMessage('1Day')
        }
    ];
    static readonly RecommendCssSelectors: CssSelector[] = [
        {
            value: 'a',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'article',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'b',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'blockquote',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'dd',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'div',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'dt',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'em',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'h1',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'h2',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'h3',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'h4',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'h5',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'h6',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'i',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'img',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'li',
            hideMode: this.ElementHideMode,
            searchMode: this.deepSearch,
            visibility: false
        },
        {
            value: 'p',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'pre',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 's',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'section',
            hideMode: this.TextHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'span',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'strong',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'td',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'th',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        },
        {
            value: 'u',
            hideMode: this.ElementHideMode,
            searchMode: this.shallowSearch,
            visibility: false
        }
    ];
}