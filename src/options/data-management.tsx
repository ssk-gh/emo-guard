import { LoadingButton } from "@mui/lab";
import { List, ListSubheader, ListItem, ListItemText, FormControl, Button, RadioGroup, FormControlLabel, FormLabel, Radio, Alert } from "@mui/material";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import React from "react";
import { ConfirmDialog } from "../components/confirm-dialog";
import { TextWithTooltip } from "../components/text-with-tooltip";
import { Site } from "../types";
import { download, throwIfInvalidType } from "../utils/common";

interface DataManagementProps {
    getSites(): Promise<Site[]>;
    setSites(sites: Site[]): void;
    getKeywords(): Promise<string[]>;
    setKeywords(keywords: string[]): Promise<void>;
    getSyncContents(): Promise<Object>;
}

export function DataManagement(props: DataManagementProps) {
    const [importDialogOpen, setImportDialogOpen] = React.useState(false);
    const [importRadioValue, setImportRadioValue] = React.useState('current');
    const [isImportError, setIsImportError] = React.useState(false);
    const [hasCompletedImport, setHasCompletedImport] = React.useState(false);

    const exportToLocal = async () => {
        const fileName = `emoguard_blocklist_${format(new Date(), 'yyyyMMddHHmmss')}.json`;
        const contents = await props.getSyncContents();
        download(fileName, contents);
    }

    const importFromLocal = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) {
            return;
        }

        const file = event.target.files[0];
        if (!/^emoguard_blocklist_.*\.json$/.test(file.name)) {
            setIsImportError(true);
            return;
        }

        const currentKeywords = await props.getKeywords();
        const currentSites = await props.getSites();

        try {
            const text = await file.text();
            const contents = JSON.parse(text) as { keywords: string[], sites: Site[] };

            const importKeywords = contents.keywords.map(keyword => {
                throwIfInvalidType(keyword, 'string');
                return DOMPurify.sanitize(keyword);
            });
            const mergedKeywords = [...new Set(currentKeywords.concat(importKeywords))];
            props.setKeywords(mergedKeywords);

            const importSites = contents.sites;
            importSites.forEach(site => {
                throwIfInvalidType(site.enabled, 'boolean');
                throwIfInvalidType(site.domain, 'string');

                site.domain = DOMPurify.sanitize(site.domain);
                site.cssSelectors.forEach(selector => {
                    throwIfInvalidType(selector.hideMode, 'number');
                    throwIfInvalidType(selector.searchMode, 'number');
                    throwIfInvalidType(selector.visibility, 'boolean');
                    throwIfInvalidType(selector.value, 'string');

                    selector.value = DOMPurify.sanitize(selector.value);
                });
            });

            switch (importRadioValue) {
                case 'current': {
                    const mergedSites = mergeSites(currentSites, importSites, false);
                    props.setSites(mergedSites);
                    break;
                }
                case 'overwrite': {
                    const mergedSites = mergeSites(currentSites, importSites, true);
                    props.setSites(mergedSites);
                    break;
                }
            }

            setIsImportError(false);
            setImportDialogOpen(false);
            setHasCompletedImport(true);
        } catch (error) {
            console.error(error);
            setIsImportError(true);

            props.setKeywords(currentKeywords);
            props.setSites(currentSites);
        }
    }

    const mergeSites = (currentSites: Site[], importSites: Site[], overwrite: boolean): Site[] => {
        currentSites = JSON.parse(JSON.stringify(currentSites));

        const updatedSites = currentSites.map(currentSite => {
            const importSite = importSites.find(importSite => importSite.domain === currentSite.domain);
            if (!importSite) {
                return currentSite;
            }

            const updatedSelectors = overwrite
                ? currentSite.cssSelectors.map(currentSelector => {
                    const importSelector = importSite.cssSelectors.find(importSelector => importSelector.value === currentSelector.value);
                    if (!importSelector) {
                        return currentSelector;
                    }

                    return importSelector;
                })
                : currentSite.cssSelectors;

            const addedSelectors = importSite
                .cssSelectors
                .filter(importSelector => currentSite.cssSelectors.every(currentSelector => currentSelector.value !== importSelector.value));
            currentSite.cssSelectors = updatedSelectors.concat(addedSelectors);

            return currentSite;
        });

        const addedSites = importSites.filter(importSite => currentSites.every(currentSite => currentSite.domain !== importSite.domain));
        return updatedSites.concat(addedSites);
    }

    return (
        <List
            sx={{ bgcolor: 'background.paper' }}
            subheader={<ListSubheader>{chrome.i18n.getMessage('dataManagement')}</ListSubheader>}
        >
            <ListItem>
                <ListItemText
                    primary={chrome.i18n.getMessage('import')}
                    secondary={chrome.i18n.getMessage('importSecondary')}
                    sx={{ marginRight: 1 }}
                />
                <LoadingButton
                    variant="outlined"
                    onClick={(event) => setImportDialogOpen(true)}
                    sx={{ minWidth: 120 }}
                >
                    {chrome.i18n.getMessage('import')}
                </LoadingButton>
                <ConfirmDialog
                    title={chrome.i18n.getMessage('import')}
                    content={(
                        <>
                            <FormControl>
                                <FormLabel id="import-radio-group">{chrome.i18n.getMessage('importRadioLabel')}</FormLabel>
                                <RadioGroup
                                    aria-labelledby="import-radio-group"
                                    name="controlled-import-radio-group"
                                    value={importRadioValue}
                                    onChange={(event, value) => setImportRadioValue(value)}
                                >
                                    <FormControlLabel value="current" control={<Radio />} label={chrome.i18n.getMessage('prioritizeCurrentImport')} />
                                    <FormControlLabel value="overwrite" control={<Radio />} label={chrome.i18n.getMessage('overwriteImport')} />
                                </RadioGroup>
                            </FormControl>
                            {
                                isImportError
                                    ? <Alert severity="error">{chrome.i18n.getMessage('importError')}</Alert>
                                    : null
                            }
                        </>
                    )}
                    okButton={
                        <label htmlFor="import-button" style={{ marginLeft: 15, marginRight: 10 }}>
                            <input id="import-button" type="file" accept="application/json" onChange={(event) => importFromLocal(event)} style={{ display: 'none' }} />
                            <Button variant="contained" component="span">
                                {chrome.i18n.getMessage('chooseFile')}
                            </Button>
                        </label>
                    }
                    open={importDialogOpen}
                    setOpen={setImportDialogOpen}
                    closeCallback={() => setIsImportError(false)}
                ></ConfirmDialog>
            </ListItem>
            {
                hasCompletedImport
                    ? (
                        <ListItem>
                            <ListItemText
                                primary={
                                    <Alert onClose={() => setHasCompletedImport(false)}>{chrome.i18n.getMessage('importCompleted')}</Alert>
                                }
                            />
                        </ListItem>
                    )
                    : null
            }
            <ListItem>
                <ListItemText
                    primary={
                        <TextWithTooltip
                            text={chrome.i18n.getMessage('export')}
                            tooltipTitle={chrome.i18n.getMessage('exportHelp')}
                        ></TextWithTooltip>
                    }
                    secondary={chrome.i18n.getMessage('exportSecondary')}
                    sx={{ marginRight: 1 }}
                />
                <LoadingButton
                    variant="outlined"
                    onClick={exportToLocal}
                    sx={{ minWidth: 120 }}
                >
                    {chrome.i18n.getMessage('export')}
                </LoadingButton>
            </ListItem>
        </List>
    );
}
