import DOMPurify from "dompurify";
import { CssSelector, Site } from "./App";
import { AppConstants } from "./constants/app-constants";
import { getStorageAsync } from "./utils/chrome-async";
import './content-script.css';

const getSelector = async (hideMode: number, searchMode: number, cssSelectorsAllSite: CssSelector[], cssSelectorsThisSite: CssSelector[], duplicateSelectors: string[]): Promise<string> => {
    const selectorsAllSites = cssSelectorsAllSite
        ?.filter(selector => !selector.visibility && selector.hideMode === hideMode && selector.searchMode === searchMode && !duplicateSelectors.includes(selector.value))
        .map(selector => selector.value);
    const selectorsThisSite = cssSelectorsThisSite
        ?.filter(selector => !selector.visibility && selector.hideMode === hideMode && selector.searchMode === searchMode)
        .map(selector => selector.value);

    return selectorsAllSites.concat(selectorsThisSite).join(',') ?? '';
}

const getRefreshSelector = async (): Promise<{ elementShallowHideSelector: string, elementDeepHideSelector: string, textHideSelector: string }> => {
    const syncData = await chrome.storage.sync.get('sites');
    const localData = await chrome.storage.local.get(['sites', 'autoImportEnabled']);
    const autoImportEnabled = (localData.autoImportEnabled ?? false) as boolean;
    const sites = ((autoImportEnabled ? localData.sites : syncData.sites) ?? []) as Site[];
    const host = window.self === window.parent
        ? window.location.hostname
        : new URL(document.referrer).hostname;

    const cssSelectorsAllSite = sites.find(site => site.domain === AppConstants.AllSites)?.cssSelectors ?? [];
    const cssSelectorsThisSite = sites.find(site => site.domain === host)?.cssSelectors ?? [];
    const selectorsValueAllSite = cssSelectorsAllSite.filter(selector => !selector.visibility).map(selector => selector.value);
    const selectorsValueThisSite = cssSelectorsThisSite.filter(selector => !selector.visibility).map(selector => selector.value);
    const duplicateSelectors = selectorsValueAllSite.filter(selector => selectorsValueThisSite.includes(selector));

    return {
        elementShallowHideSelector: await getSelector(AppConstants.ElementHideMode, AppConstants.shallowSearch, cssSelectorsAllSite, cssSelectorsThisSite, duplicateSelectors),
        elementDeepHideSelector: await getSelector(AppConstants.ElementHideMode, AppConstants.deepSearch, cssSelectorsAllSite, cssSelectorsThisSite, duplicateSelectors),
        textHideSelector: await getSelector(AppConstants.TextHideMode, AppConstants.shallowSearch, cssSelectorsAllSite, cssSelectorsThisSite, duplicateSelectors)
    };
}

interface ContentScriptState {
    enabled: boolean;
    keywords: string[];
    elementShallowHideSelector: string;
    elementDeepHideSelector: string;
    textHideSelector: string;
    emoGuardian: string;
    blockingSpeed: number;
}

class ContentScript {
    toxicMap = new Map<string, HTMLElement>();
    observer!: MutationObserver;
    state: ContentScriptState = {
        enabled: true,
        keywords: [],
        elementShallowHideSelector: '',
        elementDeepHideSelector: '',
        textHideSelector: '',
        emoGuardian: '',
        blockingSpeed: 50
    };

    constructor(enabled: boolean, keywords: string[], elementShallowHideSelector: string, elementDeepHideSelector: string, textHideSelector: string, emoGuardian: string, blockingSpeed: number) {
        const targetNode = document.documentElement;
        if (!targetNode) {
            return;
        }

        this.setState({
            enabled: enabled,
            keywords: keywords,
            elementShallowHideSelector: elementShallowHideSelector,
            elementDeepHideSelector: elementDeepHideSelector,
            textHideSelector: textHideSelector,
            emoGuardian: emoGuardian,
            blockingSpeed: blockingSpeed
        });

        this.observer = this.buildObserver();
        this.observer.observe(targetNode, { childList: true, subtree: true });

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.callee) {
                case 'setState':
                    this.setState(message.args[0]);
                    break;
                case 'refreshSelector':
                    const newState = message.args[0];
                    this.refreshSelector(newState.elementShallowHideSelector, newState.elementDeepHideSelector, newState.textHideSelector);
                    break;
                case 'hideWithKeyword':
                    this.hideElements(this.state.elementShallowHideSelector, message.args[0], this.searchElementsShallow, this.detoxifyElement);
                    this.hideElements(this.state.elementDeepHideSelector, message.args[0], this.searchElementsDeep, this.detoxifyElement);
                    this.hideElements(this.state.textHideSelector, message.args[0], this.searchElementsShallow, this.detoxifyText);
                    break;
                case 'hideElementsShallow':
                    this.hideElements(message.args[0], this.state.keywords, this.searchElementsShallow, this.detoxifyElement);
                    break;
                case 'hideElementsDeep':
                    this.hideElements(message.args[0], this.state.keywords, this.searchElementsDeep, this.detoxifyElement);
                    break;
                case 'hideText':
                    this.hideElements(message.args[0], this.state.keywords, this.searchElementsShallow, this.detoxifyText);
                    break;
                case 'refreshKeyword':
                    this.refreshKeyword(message.args[0]);
                    break;
                case 'togglePower':
                    this.setState({ enabled: message.args[0] });
                    break;
                case 'enableInteractiveMode':
                    this.startInteractiveMode();
                    break;
                case 'disableInteractiveMode':
                    this.endInteractiveMode();
                    break;
                default:
                    break;
            }
            sendResponse();
        });
    }

    public static async build(): Promise<ContentScript> {
        const syncData = await getStorageAsync(['keywords', 'sites', 'emoGuardian']);
        const localData = await chrome.storage.local.get(['keywords', 'sites', 'emoGuardian', 'autoImportEnabled', 'blockingSpeed']);

        const autoImportEnabled = (localData.autoImportEnabled ?? false) as boolean;
        const keywords = ((autoImportEnabled ? localData.keywords : syncData.keywords) ?? []) as string[];
        const emoGuardian = ((autoImportEnabled ? localData.emoGuardian : syncData.emoGuardian) ?? '') as string;
        const cleanedEmoGuardian = DOMPurify.sanitize(emoGuardian);
        const blockingSpeed = (localData.blockingSpeed ?? 50) as number;

        const sites = ((autoImportEnabled ? localData.sites : syncData.sites) ?? []) as Site[];
        const host = window.self === window.parent
            ? window.location.hostname
            : new URL(document.referrer).hostname;

        const thisSite = sites.find(site => site.domain === host);
        const enabled = thisSite ? thisSite.enabled : true;
        const selector = await getRefreshSelector();

        return new ContentScript(enabled, keywords, selector.elementShallowHideSelector, selector.elementDeepHideSelector, selector.textHideSelector, cleanedEmoGuardian, blockingSpeed);
    }

    private buildObserver = (): MutationObserver => {
        let mutationCount = 0;
        let timeoutId: number;
        let lastSet = Date.now();

        const hide = () => {
            this.hideElements(this.state.elementShallowHideSelector, this.state.keywords, this.searchElementsShallow, this.detoxifyElement);
            this.hideElements(this.state.elementDeepHideSelector, this.state.keywords, this.searchElementsDeep, this.detoxifyElement);
            this.hideElements(this.state.textHideSelector, this.state.keywords, this.searchElementsShallow, this.detoxifyText);
        };

        const setHideTimer = (now: number, delay: number) => {
            timeoutId = window.setTimeout(hide, delay);
            lastSet = now;
        };

        return new MutationObserver((mutations, observer) => {
            if (!this.state.enabled) {
                return;
            }
            if (!this.state.keywords.length) {
                return;
            }
            if (mutationCount === 1) {
                hide();
            }

            const now = Date.now();
            if (timeoutId && now < lastSet + this.state.blockingSpeed) {
                clearTimeout(timeoutId);
            }
            setHideTimer(now, this.state.blockingSpeed);
        });
    }

    private setState = (state: ContentScriptState | Object) => {
        for (const [key, value] of Object.entries(state)) {
            if (key in this.state) {
                const typedKey = key as keyof ContentScriptState;
                (this.state[typedKey] as any) = value;
            } else {
                throw new Error(`Uninitialized state: { ${key}: ${value} }`);
            }
        }
    }

    private refreshSelector = (elementShallowHideSelector: string, elementDeepHideSelector: string, textHideSelector: string): void => {
        if (!this.state.enabled) {
            return;
        }

        this.releaseRecursive();
        this.toxicMap.clear();

        this.hideElements(elementShallowHideSelector, this.state.keywords, this.searchElementsShallow, this.detoxifyElement);
        this.hideElements(elementDeepHideSelector, this.state.keywords, this.searchElementsDeep, this.detoxifyElement);
        this.hideElements(textHideSelector, this.state.keywords, this.searchElementsShallow, this.detoxifyText);
    }

    private replaceElement = (elementToHide: HTMLElement, elementToShow: HTMLElement) => {
        const parent = elementToHide.parentElement;
        parent?.insertBefore(elementToShow, elementToHide);
        parent?.removeChild(elementToHide);
    }

    private refreshKeyword = (keywords: string[]): void => {
        if (!this.state.enabled) {
            return;
        }

        this.releaseRecursive();
        this.toxicMap.clear();

        this.hideElements(this.state.elementShallowHideSelector, keywords, this.searchElementsShallow, this.detoxifyElement);
        this.hideElements(this.state.elementDeepHideSelector, keywords, this.searchElementsDeep, this.detoxifyElement);
        this.hideElements(this.state.textHideSelector, keywords, this.searchElementsShallow, this.detoxifyText);
    }

    private releaseRecursive = () => {
        const elements = this.getDocuments().flatMap(document => Array.from(document.querySelectorAll<HTMLElement>('[data-wkb-id]')));
        if (!elements.length) {
            return;
        }

        elements.forEach(element => {
            const id = element.dataset.wkbId!;
            const original = this.toxicMap.get(id)!;
            this.replaceElement(element, original);
        });

        this.releaseRecursive();
    }

    private hideElements = (
        selector: string,
        keywords: string[],
        searchElements: (selector: string, keywords: string[]) => HTMLElement[],
        detoxify: (element: HTMLElement) => void
    ): void => {
        if (!this.state.enabled) {
            return;
        }
        if (!selector || !keywords.length) {
            return;
        }

        searchElements(selector, keywords).forEach(element => detoxify(element))
    }

    private searchToxicElements = (selector: string, keywords: string[]): HTMLElement[] =>
        this.getDocuments()
            .flatMap(document => Array.from(document.querySelectorAll<HTMLElement>(selector)))
            .filter(element =>
                element.style.visibility !== 'hidden' &&
                !element.dataset.wkbId);

    private getDocuments = () => {
        const iframeDocuments = Array
            .from(document.getElementsByTagName('iframe'))
            .filter(iframe => iframe.contentDocument?.body.innerHTML)
            .map(iframe => iframe.contentDocument) ?? [];

        return [document, ...(iframeDocuments as Document[])];
    }

    private searchElementsShallow = (selector: string, keywords: string[]): HTMLElement[] =>
        this.searchToxicElements(selector, keywords)
            .filter(element => this.includesKeywordShallow(element, keywords));

    private searchElementsDeep = (selector: string, keywords: string[]): HTMLElement[] =>
        this.searchToxicElements(selector, keywords)
            .filter(element => this.includesKeywordDeep(element, keywords) || this.includesInnerSafe(element));

    private searchLatestToxicElements = (selector: string, keywords: string[]): HTMLElement[] =>
        this.searchToxicElements(selector, keywords)
            .filter(element => !this.hasDetoxified(element));

    private hasDetoxified = (element: HTMLElement): boolean =>
        element.dataset.wkbId != null && element.dataset.wkbId !== '';

    private includesKeywordShallow = (element: HTMLElement, keywords: string[]): boolean =>
        keywords.some(keyword =>
            this.getDirectTextOf(element).includes(keyword) ||
            this.getJoinedAttribute(element)?.includes(keyword));

    private includesKeywordDeep = (element: HTMLElement, keywords: string[]): boolean =>
        keywords.some(keyword =>
            element.textContent?.includes(keyword) ||
            this.getJoinedAttribute(element)?.includes(keyword));

    private getDirectTextOf = (element: HTMLElement): string =>
        Array.from(element.childNodes).filter(childNode => childNode.nodeType === Node.TEXT_NODE).map(childNode => childNode.textContent).join(',');

    private getJoinedAttribute = (element: HTMLElement): string =>
        Array.from(element.attributes).map(attribute => attribute.value).join(',');

    private includesInnerSafe = (element: HTMLElement): boolean =>
        Array.from(this.toxicMap.keys()).some(id => element.innerHTML.includes(id));

    private detoxifyElement = (element: HTMLElement): void => {
        const newElement = element.tagName === 'IMG'
            ? document.createElement('span')
            : element.cloneNode() as HTMLElement;
        const id = `wkb-${Math.random().toString(32).substring(2)}`;
        newElement.dataset.wkbId = id;
        newElement.innerHTML = this.state.emoGuardian;

        this.toxicMap.set(id, element);
        this.replaceElement(element, newElement);
    }

    private detoxifyText = (element: HTMLElement): void => {
        const newElement = element.cloneNode(true) as HTMLElement;
        const id = `wkb-${Math.random().toString(32).substring(2)}`;
        newElement.dataset.wkbId = id;
        const searchKeyword = new RegExp(this.state.keywords.join('|'), 'gi');
        newElement.innerHTML = newElement.innerHTML.replace(searchKeyword, this.state.emoGuardian);

        this.toxicMap.set(id, element);
        this.replaceElement(element, newElement);
    }

    private startInteractiveMode = () => {
        document.documentElement.addEventListener('mouseover', this.handleMouseOver);
        document.documentElement.addEventListener('mouseout', this.handleMouseOut);
        document.documentElement.addEventListener('click', this.handleClick);
    }

    private endInteractiveMode = () => {
        document.documentElement.removeEventListener('mouseover', this.handleMouseOver);
        document.documentElement.removeEventListener('mouseout', this.handleMouseOut);
        document.documentElement.removeEventListener('click', this.handleClick);
    }

    private handleMouseOver = (event: MouseEvent) => {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }

        const element = event.target;
        element.classList.add('wkb-highlight');

        const selector = this.buildSelectorFrom(element);
        chrome.runtime.sendMessage({ callee: 'setSelector', args: [selector] })
    }

    private handleMouseOut = (event: MouseEvent) => {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }

        const element = event.target;
        element.classList.remove('wkb-highlight');
    }

    private handleClick = async (event: MouseEvent) => {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();

        const element = event.target;
        element.classList.remove('wkb-highlight');

        const selector = this.buildSelectorFrom(element);

        const syncData = await chrome.storage.sync.get('sites');
        const sites = (syncData.sites ?? []) as Site[];
        const host = window.self === window.parent
            ? window.location.hostname
            : new URL(document.referrer).hostname;
        const thisSite = sites.find(site => site.domain === host) ?? {
            domain: host,
            enabled: true,
            cssSelectors: []
        };
        thisSite.cssSelectors = thisSite.cssSelectors.concat([
            { value: selector, hideMode: AppConstants.ElementHideMode, searchMode: AppConstants.shallowSearch, visibility: false }
        ]);

        chrome.storage.sync.set({ sites: sites });

        this.hideElements(selector, this.state.keywords, this.searchElementsShallow, this.detoxifyElement);

        const message = `${chrome.i18n.getMessage("selectorRegistrationAlert")}
------------------------------------------------------------

${selector}

------------------------------------------------------------
by ${AppConstants.AppName}`;
        alert(message);

        this.endInteractiveMode();
    }

    private buildSelectorFrom = (element: HTMLElement) => {
        const id = element.id
            ? `#${element.id}`
            : '';
        const classes = Array.from(element.classList);
        const joinedClass = classes.length
            ? `.${classes.join('.')}`
            : '';

        return `${element.tagName.toLowerCase()}${id}${joinedClass}`;
    }
}

(async () => {
    const contentScript = await ContentScript.build();
})();

export { }
