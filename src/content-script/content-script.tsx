import DOMPurify from "dompurify";
import { AppConstants } from "../constants/app-constants";
import '../styles/content-script.css';
import { Site } from "../types";
import { buildRefreshSelector, isSafari } from "../utils/common";

interface ContentScriptState {
    enabled: boolean;
    keywords: string[];
    elementShallowSelector: string;
    elementDeepSelector: string;
    textSelector: string;
    emoGuardian: string;
    blockingSpeed: number;
}

class ContentScript {
    jailMap = new Map<string, HTMLElement>();
    observer!: MutationObserver;
    state: ContentScriptState = {
        enabled: true,
        keywords: [],
        elementShallowSelector: '',
        elementDeepSelector: '',
        textSelector: '',
        emoGuardian: '',
        blockingSpeed: 50
    };

    constructor(enabled: boolean, keywords: string[], elementShallowSelector: string, elementDeepSelector: string, textSelector: string, emoGuardian: string, blockingSpeed: number) {
        const targetNode = document.documentElement;
        if (!targetNode) {
            return;
        }

        this.setState({
            enabled: enabled,
            keywords: keywords,
            elementShallowSelector: elementShallowSelector,
            elementDeepSelector: elementDeepSelector,
            textSelector: textSelector,
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
                    this.refresh(newState.elementShallowSelector, newState.elementDeepSelector, newState.textSelector, this.state.keywords);
                    break;
                case 'hideWithKeyword':
                    this.guardAll(this.state.elementShallowSelector, this.state.elementDeepSelector, this.state.textSelector, message.args[0]);
                    break;
                case 'hideElementsShallow':
                    this.guardBy(message.args[0], this.state.keywords, this.searchShallow, this.hideElement);
                    break;
                case 'hideElementsDeep':
                    this.guardBy(message.args[0], this.state.keywords, this.searchDeep, this.hideElement);
                    break;
                case 'hideText':
                    this.guardBy(message.args[0], this.state.keywords, this.searchShallow, this.hideText);
                    break;
                case 'refreshKeyword':
                    this.refresh(this.state.elementShallowSelector, this.state.elementDeepSelector, this.state.textSelector, message.args[0]);
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
        const syncData = await chrome.storage.sync.get(['keywords', 'sites', 'emoGuardian']);
        const localData = await chrome.storage.local.get(['keywords', 'sites', 'emoGuardian', 'autoImportEnabled', 'blockingSpeed']);

        const autoImportEnabled = (localData.autoImportEnabled ?? false) as boolean;
        const keywords = ((autoImportEnabled ? localData.keywords : syncData.keywords) ?? []) as string[];
        const emoGuardian = ((autoImportEnabled ? localData.emoGuardian : syncData.emoGuardian) ?? '') as string;
        const cleanedEmoGuardian = DOMPurify.sanitize(emoGuardian);
        const blockingSpeed = (localData.blockingSpeed ?? 50) as number;

        const sites = ((autoImportEnabled ? localData.sites : syncData.sites) ?? []) as Site[];
        const host = getHost();

        const thisSite = sites.find(site => site.domain === host);
        const enabled = thisSite ? thisSite.enabled : true;
        const selector = await buildRefreshSelector(sites, host);

        return new ContentScript(enabled, keywords, selector.elementShallowSelector, selector.elementDeepSelector, selector.textSelector, cleanedEmoGuardian, blockingSpeed);
    }

    private buildObserver = (): MutationObserver => {
        let mutationCount = 0;
        let timeoutId: number;
        let lastSet = Date.now();

        const guard = () => {
            this.guardAll(this.state.elementShallowSelector, this.state.elementDeepSelector, this.state.textSelector, this.state.keywords);
        };

        const setTimer = (now: number, delay: number) => {
            timeoutId = window.setTimeout(guard, delay);
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
                guard();
            }

            const now = Date.now();
            if (timeoutId && now < lastSet + this.state.blockingSpeed) {
                clearTimeout(timeoutId);
            }
            setTimer(now, this.state.blockingSpeed);
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

    private guardAll = (elementShallowSelector: string, elementDeepSelector: string, textSelector: string, keywords: string[]): void => {
        this.guardBy(elementShallowSelector, keywords, this.searchShallow, this.hideElement);
        this.guardBy(elementDeepSelector, keywords, this.searchDeep, this.hideElement);
        this.guardBy(textSelector, keywords, this.searchShallow, this.hideText);
    }

    private guardBy = (
        selector: string,
        keywords: string[],
        searchElements: (selector: string, keywords: string[]) => HTMLElement[],
        hide: (element: HTMLElement) => void
    ): void => {
        if (!this.state.enabled) {
            return;
        }
        if (!selector || !keywords.length) {
            return;
        }

        searchElements(selector, keywords).forEach(element => hide(element))
    }

    private refresh = (elementShallowSelector: string, elementDeepSelector: string, textSelector: string, keywords: string[]): void => {
        if (!this.state.enabled) {
            return;
        }

        this.releaseAll();
        this.jailMap.clear();

        this.guardAll(elementShallowSelector, elementDeepSelector, textSelector, keywords);
    }

    private releaseAll = () => {
        const elements = this.getDocuments().flatMap(document => Array.from(document.querySelectorAll<HTMLElement>('[data-wkb-id]')));
        if (!elements.length) {
            return;
        }

        elements.forEach(element => {
            const id = element.dataset.wkbId!;
            const original = this.jailMap.get(id)!;
            this.replaceElement(element, original);
        });

        this.releaseAll();
    }

    private searchShallow = (selector: string, keywords: string[]): HTMLElement[] =>
        this.searchElements(selector, keywords)
            .filter(element => this.includesKeywordShallow(element, keywords));

    private searchDeep = (selector: string, keywords: string[]): HTMLElement[] =>
        this.searchElements(selector, keywords)
            .filter(element => this.includesKeywordDeep(element, keywords) || this.includesInnerGuardian(element));

    private searchElements = (selector: string, keywords: string[]): HTMLElement[] =>
        this.getDocuments()
            .flatMap(document => Array.from(document.querySelectorAll<HTMLElement>(selector)))
            .filter(element =>
                element.style.visibility !== 'hidden' &&
                !element.dataset.wkbId);

    private getDocuments = () => {
        const iframeDocuments = Array
            .from(document.getElementsByTagName('iframe'))
            .filter(iframe => iframe.contentDocument?.body?.innerHTML)
            .map(iframe => iframe.contentDocument) ?? [];

        return [document, ...(iframeDocuments as Document[])];
    }

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

    private includesInnerGuardian = (element: HTMLElement): boolean =>
        Array.from(this.jailMap.keys()).some(id => element.innerHTML.includes(id));

    private hideElement = (element: HTMLElement): void => {
        const newElement = element.tagName === 'IMG'
            ? document.createElement('span')
            : element.cloneNode() as HTMLElement;
        const id = `wkb-${Math.random().toString(32).substring(2)}`;
        newElement.dataset.wkbId = id;
        newElement.innerHTML = this.state.emoGuardian;

        this.jailMap.set(id, element);
        this.replaceElement(element, newElement);
    }

    private hideText = (element: HTMLElement): void => {
        const newElement = element.cloneNode(true) as HTMLElement;
        const id = `wkb-${Math.random().toString(32).substring(2)}`;
        newElement.dataset.wkbId = id;
        const searchKeyword = new RegExp(this.state.keywords.join('|'), 'gi');
        newElement.innerHTML = newElement.innerHTML.replace(searchKeyword, this.state.emoGuardian);

        this.jailMap.set(id, element);
        this.replaceElement(element, newElement);
    }

    private replaceElement = (elementToHide: HTMLElement, elementToShow: HTMLElement) => {
        const parent = elementToHide.parentElement;
        parent?.insertBefore(elementToShow, elementToHide);
        parent?.removeChild(elementToHide);
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
        const host = getHost();
        const thisSite = sites.find(site => site.domain === host) ?? {
            domain: host,
            enabled: true,
            cssSelectors: []
        };
        thisSite.cssSelectors = thisSite.cssSelectors.concat([
            { value: selector, hideMode: AppConstants.ElementHideMode, searchMode: AppConstants.shallowSearch, visibility: false }
        ]);
        chrome.storage.sync.set({ sites: sites });

        this.guardBy(selector, this.state.keywords, this.searchShallow, this.hideElement);

        const message = this.getRegistrationMessage(selector);
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

    private getRegistrationMessage = (selector: string) =>
        `${chrome.i18n.getMessage("selectorRegistrationAlert")}
------------------------------------------------------------

${selector}

------------------------------------------------------------
by ${AppConstants.AppName}`;
}

const getHost = () =>
    isIframe()
        ? new URL(window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]).hostname
        : window.location.hostname;

const isIframe = () => window.self !== window.parent;

const detectAuthFlow = () => {
    const url = window.location.href;
    if (!url.startsWith(AppConstants.AuthRedirectUrl)) {
        return;
    }

    const authCode = new URL(url).searchParams.get('code');
    if (!authCode || !isSafari()) {
        return;
    }

    chrome.runtime.sendMessage({ callee: 'setAuthCode', args: [authCode] });
}

(async () => {
    const origin = window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1];
    if (isIframe() && !origin.startsWith('http')) {
        return;
    }

    detectAuthFlow();

    const contentScript = await ContentScript.build();
})();

export { }
