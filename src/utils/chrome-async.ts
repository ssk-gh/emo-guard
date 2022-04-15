export const getStorageAsync = (keys: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }> => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, items => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }

            resolve(items);
        });
    })
}

export const sendMessageToTabAsync = (tabId: number, message: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }

            resolve(response);
        });
    })
}

export const sendMessageToExtensionAsync = (message: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, response => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }

            resolve(response);
        });
    })
}

export const getActiveTabAsync = async (): Promise<chrome.tabs.Tab> => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}