import { DropboxAuth, Dropbox } from "dropbox";
import { AppConstants } from "../constants/app-constants";
import { getActiveTabAsync } from "../utils/chrome-async";

const ClientId = process.env.DROPBOX_CLIENT_ID!;

interface AccessTokenResult {
    access_token: string;
    refresh_token: string;
}

export const authorize = async (): Promise<DropboxAuth> => {
    const tokens = await chrome.storage.local.get(['accessToken', 'refreshToken']);
    const isAuthenticated = tokens.accessToken && tokens.refreshToken;
    if (isAuthenticated) {
        return new DropboxAuth({
            clientId: ClientId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });
    }

    try {
        const dropboxAuth = new DropboxAuth({ clientId: ClientId });
        const authUrl = (await dropboxAuth.getAuthenticationUrl(AppConstants.AuthRedirectUrl, undefined, 'code', 'offline', undefined, undefined, true)).toString();
        const redirectUrl = await launchAuthFlow(authUrl);
        const authorizationCode = new URL(redirectUrl).searchParams.get('code');
        if (!authorizationCode) {
            throw new Error('Authorization code not found.');
        }

        const response = await dropboxAuth.getAccessTokenFromCode(AppConstants.AuthRedirectUrl, authorizationCode);
        const result = response.result as AccessTokenResult;
        dropboxAuth.setAccessToken(result.access_token);
        dropboxAuth.setRefreshToken(result.refresh_token);
        chrome.storage.local.set({
            accessToken: result.access_token,
            refreshToken: result.refresh_token
        });

        return dropboxAuth;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

const launchAuthFlow = async (authUrl: string): Promise<string> => {
    const openerTab = await getActiveTabAsync();
    if (!openerTab.id) {
        throw new Error('Opener tab lost.');
    }

    const authTab = await chrome.tabs.create({ openerTabId: openerTab.id, url: authUrl });
    if (!authTab) {
        throw new Error('Authentication tab could not be created.');
    }

    return new Promise<string>((resolve, reject) => {
        const onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void => {
            if (tabId === authTab.id && tab.url?.startsWith(AppConstants.AuthRedirectUrl)) {
                resolve(tab.url);
                chrome.tabs.onUpdated.removeListener(onUpdated);
                chrome.tabs.onRemoved.removeListener(onRemoved);
                void chrome.tabs.update({ openerTabId: openerTab.id, active: true }).then(() => chrome.tabs.remove(tabId));
            }
        };
        const onRemoved = (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo): void => {
            if (tabId === authTab.id) {
                reject(new Error('Authentication tab unexpectedly closed.'));
                chrome.tabs.onUpdated.removeListener(onUpdated);
                chrome.tabs.onRemoved.removeListener(onRemoved);
                void chrome.tabs.update({ openerTabId: openerTab.id, active: true });
            }
        };

        chrome.tabs.onUpdated.addListener(onUpdated);
        chrome.tabs.onRemoved.addListener(onRemoved);
    });
}

export const revokeToken = async () => {
    const dropboxAuth = await authorize();
    const dropbox = new Dropbox({ auth: dropboxAuth });
    await dropbox.authTokenRevoke();

    chrome.storage.local.set({
        accessToken: '',
        refreshToken: ''
    });
}

const refreshStorageAccessToken = async (dropboxAuth: DropboxAuth) => {
    const oldAccessToken = (await chrome.storage.local.get(['accessToken'])).accessToken;
    const currentAccessToken = dropboxAuth.getAccessToken();
    if (oldAccessToken === currentAccessToken) {
        return;
    }

    chrome.storage.local.set({ accessToken: currentAccessToken });
}

export const fileExists = async (dropbox: Dropbox, dropboxAuth: DropboxAuth, fileName: string) => {
    try {
        const path = ``;
        const response = await dropbox.filesListFolder({ path: path });
        return response.result.entries.some(metadata => metadata.name === fileName);
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        refreshStorageAccessToken(dropboxAuth);
    }
}

export const createFile = async (dropbox: Dropbox, dropboxAuth: DropboxAuth, fileName: string, contents: Object) => {
    try {
        const path = `/${fileName}`;
        await dropbox.filesUpload({ path: path, contents: JSON.stringify(contents), mode: { ".tag": "add" }, autorename: false, client_modified: undefined, mute: true, strict_conflict: false });
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        refreshStorageAccessToken(dropboxAuth);
    }
}

export const fetchFile = async (dropbox: Dropbox, dropboxAuth: DropboxAuth, fileName: string): Promise<{ [key: string]: any; }> => {
    try {
        const path = `/${fileName}`;
        const response = await dropbox.filesDownload({ path: path });
        const blob: Blob = (response as any).result.fileBlob;
        const text = await blob.text();
        return JSON.parse(text);
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        refreshStorageAccessToken(dropboxAuth);
    }
}

export const updateFile = async (dropbox: Dropbox, dropboxAuth: DropboxAuth, fileName: string, contents: Object) => {
    try {
        const path = `/${fileName}`;
        await dropbox.filesUpload({ path: path, contents: JSON.stringify(contents), mode: { ".tag": "overwrite" } });
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        refreshStorageAccessToken(dropboxAuth);
    }
}

export { }