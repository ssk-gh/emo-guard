import { Site } from "./App";
import { AppConstants } from "./constants/app-constants";
import { getStorageAsync } from "./utils/chrome-async";

class ContentScript {
    toxicMap = new Map<string, HTMLElement>();
    detoxificationQueue: (() => void)[] = [];
    loadingObserver!: MutationObserver;
    idleObserver!: MutationObserver;
    enabled: boolean = true;
    keywords: string[] = [];
    elementHideSelector: string = '';
    textHideSelector: string = '';
    mutationCount: number = 0;
    emoGuardian: string = '';

    constructor(enabled: boolean, keywords: string[], elementHideSelector: string, textHideSelector: string, emoGuardian: string) {
        const targetNode = document.documentElement;
        if (!targetNode) {
            return;
        }

        this.enabled = enabled;
        this.keywords = keywords;
        this.elementHideSelector = elementHideSelector;
        this.textHideSelector = textHideSelector;
        this.emoGuardian = emoGuardian;

        const options: MutationObserverInit = { childList: true, subtree: true };

        this.loadingObserver = this.buildLoadingObserver();
        this.loadingObserver.observe(targetNode, options);

        window.addEventListener('DOMContentLoaded', (event) => {
            this.detoxificationQueue.forEach(detoxify => detoxify());
            this.loadingObserver.disconnect();
            this.hideElements(this.elementHideSelector, this.keywords, this.detoxifyElement);
            this.hideElements(this.textHideSelector, this.keywords, this.detoxifyText);

            this.idleObserver = this.buildIdleObserver();
            this.idleObserver.observe(targetNode, options);
        });

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.callee) {
                case 'handleDeleteSelector':
                    this.handleDeleteSelector(message.args[0]);
                    break;
                case 'hideElements':
                    this.hideElements(message.args[0], message.args[1], this.detoxifyElement);
                    break;
                case 'hideText':
                    this.hideElements(message.args[0], message.args[1], this.detoxifyText);
                    break;
                case 'handleDeleteKeyword':
                    this.handleDeleteKeyword(message.args[0]);
                    break;
                case 'updateEnabled':
                    this.enabled = message.args[0];
                    break;
                case 'updateKeywords':
                    this.keywords = message.args[0];
                    break;
                case 'updateElementHideSelector':
                    this.elementHideSelector = message.args[0];
                    break;
                case 'updateTextHideSelector':
                    this.textHideSelector = message.args[0];
                    break;
                case 'enableInteractiveMode':
                    this.startInteractiveMode();
                    break;
                case 'disableInteractiveMode':
                    this.endInteractiveMode();
                    break;
                default:
                    throw new Error(`Unknown message: ${message}`);
            }
            sendResponse();
        });
    }

    public static async build(): Promise<ContentScript> {
        const data = await getStorageAsync(['keywords', 'sites', 'emoGuardian']);
        const keywords = (data.keywords ?? []) as string[];
        const emoGuardian = data.emoGuardian ?? '';

        const sites = data.sites as Site[];
        const selectorsForAllSites = sites.find(site => site.domain === AppConstants.AllSites)?.cssSelectors;
        const elementHideSelectorsForAllSites = selectorsForAllSites
            ?.filter(selector => !selector.visibility && selector.hideMode === AppConstants.ElementHideMode)
            .map(selector => selector.value)
            ?? [];
        const textHideSelectorsForAllSites = selectorsForAllSites
            ?.filter(selector => !selector.visibility && selector.hideMode === AppConstants.TextHideMode)
            .map(selector => selector.value)
            ?? [];

        const thisSite = sites.find(site => site.domain === window.location.hostname);
        const enabled = thisSite ? thisSite.enabled : true;
        const selectorsForThisSite = thisSite?.cssSelectors ?? [];
        const elementHideSelectorsForThisSite = selectorsForThisSite
            .filter(selector => !selector.visibility && selector.hideMode === AppConstants.ElementHideMode)
            .map(selector => selector.value);
        const textHideSelectorsForThisSite = selectorsForThisSite
            .filter(selector => !selector.visibility && selector.hideMode === AppConstants.TextHideMode)
            .map(selector => selector.value);

        const elementHideSelector = elementHideSelectorsForAllSites.concat(elementHideSelectorsForThisSite).join(',') ?? '';
        const textHideSelector = textHideSelectorsForAllSites.concat(textHideSelectorsForThisSite).join(',') ?? '';

        return new ContentScript(enabled, keywords, elementHideSelector, textHideSelector, emoGuardian);
    }

    private buildLoadingObserver = (): MutationObserver => {
        const addToQueue = (selector: string, detoxify: (element: HTMLElement) => void) => {
            if (!selector) {
                return;
            }

            this.searchLatestToxicElements(selector, this.keywords).forEach(element => {
                element.style.visibility = 'hidden';
                this.detoxificationQueue = this.detoxificationQueue.concat([() => detoxify(element)])
            });
        }

        return new MutationObserver((mutations, observer) => {
            if (!this.enabled) {
                return;
            }
            if (!this.keywords.length) {
                return;
            }
            if (!this.hasElementNode(mutations)) {
                return;
            }

            this.mutationCount++;
            if (this.mutationCount > 5 && this.mutationCount % 10 !== 0) {
                return;
            }

            addToQueue(this.elementHideSelector, this.detoxifyElement);
            addToQueue(this.textHideSelector, this.detoxifyText);
        });
    }

    private buildIdleObserver = (): MutationObserver => {
        const ensureSafety = (selector: string, detoxify: (element: HTMLElement) => void) => {
            if (!selector) {
                return;
            }

            this.searchToxicElements(selector, this.keywords)
                .forEach(element => {
                    const id = element.dataset.wkbId;
                    if (id) {
                        this.replaceElement(element, this.toxicMap.get(id)!);
                    } else {
                        detoxify(element)
                    }
                });
        }

        return new MutationObserver((mutations, observer) => {
            if (!this.enabled) {
                return;
            }
            if (!this.keywords.length) {
                return;
            }
            if (!this.hasElementNode(mutations)) {
                return;
            }

            ensureSafety(this.elementHideSelector, this.detoxifyElement);
            ensureSafety(this.textHideSelector, this.detoxifyText);
        });
    }

    private hasElementNode = (mutations: MutationRecord[]): boolean =>
        mutations
            .filter(mutation => mutation.addedNodes.length)
            .flatMap(mutation => Array.from(mutation.addedNodes))
            .some(node => node.nodeType === Node.ELEMENT_NODE
                && node.textContent
                && /\S/.test(node.textContent));

    private handleDeleteSelector = (selector: string): void => {
        if (!this.enabled) {
            return;
        }
        if (!selector) {
            return;
        }

        this.toxicMap.forEach(element => this.toxify(element, selector));
        this.toxify(document, selector);
    }

    private toxify = (baseElement: Document | HTMLElement, selector: string) =>
        Array
            .from(baseElement.querySelectorAll<HTMLElement>(selector))
            .filter(element => this.hasDetoxified(element))
            .forEach(element => {
                const id = element.dataset.wkbId!;
                this.replaceElement(element, this.toxicMap.get(id)!);
                this.toxicMap.delete(id);
            });

    private replaceElement = (elementToHide: HTMLElement, elementToShow: HTMLElement) => {
        const parent = elementToHide.parentElement;
        parent?.insertBefore(elementToShow, elementToHide);
        parent?.removeChild(elementToHide);
    }

    private handleDeleteKeyword = (keywords: string[]): void => {
        if (!this.enabled) {
            return;
        }

        Array
            .from(this.toxicMap)
            .filter(([id, toxicElement]) => !this.includesKeyword(toxicElement, keywords))
            .forEach(([id, toxicElement]) => {
                const foundElement = document.querySelector<HTMLElement>(`[data-wkb-id="${id}"]`);
                if (!foundElement) {
                    return;
                }

                this.replaceElement(foundElement, toxicElement);
                this.toxicMap.delete(id);
            })
    }

    private hideElements = (selector: string, keywords: string[], detoxify: (element: HTMLElement) => void): void => {
        if (!this.enabled) {
            return;
        }
        if (!selector || !keywords.length) {
            return;
        }

        this.searchLatestToxicElements(selector, keywords)
            .forEach(element => detoxify(element))
    }

    private searchToxicElements = (selector: string, keywords: string[]): HTMLElement[] =>
        Array
            .from(document.querySelectorAll<HTMLElement>(selector))
            .filter(element =>
                element.style.visibility !== 'hidden'
                && (this.includesKeyword(element, keywords) || this.includesInnerSafe(element)));

    private searchLatestToxicElements = (selector: string, keywords: string[]): HTMLElement[] =>
        this.searchToxicElements(selector, keywords)
            .filter(element => !this.hasDetoxified(element));

    private hasDetoxified = (element: HTMLElement): boolean =>
        element.dataset.wkbId != null && element.dataset.wkbId !== '';

    private includesKeyword = (element: HTMLElement, keywords: string[]): boolean =>
        element.textContent != null
        && keywords.some(keyword => element.textContent?.includes(keyword));

    private includesInnerSafe = (element: HTMLElement): boolean =>
        Array.from(this.toxicMap.keys()).some(id => element.innerHTML.includes(id));

    private detoxifyElement = (element: HTMLElement): void => {
        element.style.visibility = 'visible';

        const newElement = element.cloneNode() as HTMLElement;
        const id = `wkb-${Math.random().toString(32).substring(2)}`;
        newElement.dataset.wkbId = id;
        newElement.innerHTML = this.emoGuardian;

        this.toxicMap.set(id, element);
        this.replaceElement(element, newElement);
    }

    private detoxifyText = (element: HTMLElement): void => {
        element.style.visibility = 'visible';

        const newElement = element.cloneNode(true) as HTMLElement;
        const id = `wkb-${Math.random().toString(32).substring(2)}`;
        newElement.dataset.wkbId = id;
        const searchKeyword = new RegExp(this.keywords.join('|'), 'gi');
        newElement.innerHTML = newElement.innerHTML.replace(searchKeyword, this.emoGuardian);

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
        element.style.backgroundColor = '#42a5f5';
        element.style.opacity = '0.7';
        element.style.border = 'solid #1976d2'

        const selector = this.buildSelectorFrom(element);
        chrome.runtime.sendMessage({ callee: 'setSelector', args: [selector] })
    }

    private handleMouseOut = (event: MouseEvent) => {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }

        const element = event.target;
        this.restoreStyle(element);
    }

    private handleClick = (event: MouseEvent) => {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }

        const element = event.target;
        this.restoreStyle(element);

        const selector = this.buildSelectorFrom(element);
        chrome.storage.sync.set({ interactiveSelector: selector });

        this.hideElements(selector, this.keywords, this.detoxifyElement);
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

    private restoreStyle = (element: HTMLElement) => {
        element.style.backgroundColor = '';
        element.style.opacity = '1';
        element.style.border = ''
    }
}

(async () => {
    const contentScript = await ContentScript.build();
})();

export { }
