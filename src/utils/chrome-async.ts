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

export const getActiveTabAsync = async (): Promise<chrome.tabs.Tab> => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}