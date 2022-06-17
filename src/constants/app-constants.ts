import { CssSelector } from "../App";

export class AppConstants {
    static readonly AppName = 'EmoGuard';
    static readonly ThisSite = 'this site';
    static readonly AllSites = 'all sites';
    static readonly ElementHideMode = 0;
    static readonly TextHideMode = 1;
    static readonly AuthRedirectUrl = 'https://ssk-gh.github.io/web-keyword-blocker/';
    static readonly BlockListFileName = 'blocklist.json';
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
            hideMode: 1,
            value: 'h1',
            visibility: false
        },
        {
            hideMode: 1,
            value: 'h2',
            visibility: false
        },
        {
            hideMode: 1,
            value: 'h3',
            visibility: false
        },
        {
            hideMode: 1,
            value: 'h4',
            visibility: false
        },
        {
            hideMode: 1,
            value: 'h5',
            visibility: false
        },
        {
            hideMode: 1,
            value: 'h6',
            visibility: false
        },
        {
            hideMode: 1,
            value: 'p',
            visibility: false
        },
        {
            hideMode: 1,
            value: 'pre',
            visibility: false
        },
        {
            hideMode: 1,
            value: 'a',
            visibility: false
        },
        {
            hideMode: 0,
            value: 'blockquote',
            visibility: false
        },
        {
            hideMode: 0,
            value: 'span',
            visibility: false
        },
        {
            hideMode: 0,
            value: 'li',
            visibility: false
        },
        {
            hideMode: 0,
            value: 'td',
            visibility: false
        },
        {
            hideMode: 0,
            value: 'img',
            visibility: false
        }
    ];
}