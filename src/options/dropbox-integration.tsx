import { LoadingButton } from "@mui/lab";
import { List, ListSubheader, ListItem, ListItemText, Switch, Typography, Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { Dropbox } from "dropbox";
import React from "react";
import { authorize, revokeToken, fileExists, updateFile, createFile } from "../cloud/dropbox";
import { ConfirmDialog } from "../components/confirm-dialog";
import { TextWithTooltip } from "../components/text-with-tooltip";
import { AppConstants } from "../constants/app-constants";

interface DropboxIntegrationProps {
    dropboxIntegrationEnabled: boolean;
    autoImportEnabled: boolean;
    autoImportInterval: number;
    lastExport: Date | null;
    lastImport: Date | null;
    setDropboxIntegrationEnabled(dropboxIntegrationEnabled: boolean): void;
    setAutoImportEnabled(autoImportEnabled: boolean): void;
    setAutoImportInterval(autoImportInterval: number): void;
    setLastExport(lastExport: Date): void;
    getSyncContents(): Promise<Object>;
}

export function DropboxIntegration(props: DropboxIntegrationProps) {
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [isLoadingExport, setIsLoadingExport] = React.useState(false);
    const [isLoadingIntegration, setIsLoadingIntegration] = React.useState(false);

    const handleToggle = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        if (checked) {
            setDialogOpen(true);
        } else {
            props.setAutoImportEnabled(checked);
        }
    };

    const integrateWithDropbox = async () => {
        setIsLoadingIntegration(true);

        try {
            await authorize();
            props.setDropboxIntegrationEnabled(true);

            setIsLoadingIntegration(false);
        } catch (error) {
            console.error(error);
        }
    };

    const revokeDropboxIntegration = async () => {
        setIsLoadingIntegration(true);

        try {
            await revokeToken();

            props.setDropboxIntegrationEnabled(false);
            props.setAutoImportEnabled(false);

            setIsLoadingIntegration(false);
        } catch (error) {
            console.error(error);
        }
    };

    const exportToDropbox = async () => {
        setIsLoadingExport(true);

        const dropboxAuth = await authorize();
        const dropbox = new Dropbox({ auth: dropboxAuth });
        const fileName = AppConstants.BlockListFileName;
        const syncContents = await props.getSyncContents();

        if (await fileExists(dropbox, dropboxAuth, fileName)) {
            await updateFile(dropbox, dropboxAuth, fileName, syncContents);
        } else {
            await createFile(dropbox, dropboxAuth, fileName, syncContents);
        }
        props.setLastExport(new Date());

        setIsLoadingExport(false);
    };

    const displayLastExport = () => {
        return props.lastExport
            ? `\n${chrome.i18n.getMessage('lastExport')}: ${props.lastExport.toLocaleString()}`
            : '';
    };

    const displayLastImport = () => {
        return props.lastImport
            ? `${chrome.i18n.getMessage('lastImport')}: ${props.lastImport.toLocaleString()}`
            : '';
    };

    return (
        <List
            sx={{ bgcolor: 'background.paper' }}
            subheader={<ListSubheader>{chrome.i18n.getMessage('dropboxIntegration')}</ListSubheader>}
        >
            <ListItem>
                <ListItemText
                    primary={(
                        <TextWithTooltip
                            text={chrome.i18n.getMessage('integrateWithDropboxPrimary')}
                            tooltipTitle={chrome.i18n.getMessage('integrateWithDropboxNote')}
                        ></TextWithTooltip>
                    )}
                    secondary={chrome.i18n.getMessage('integrateWithDropboxSecondary')}
                    secondaryTypographyProps={{ style: { whiteSpace: 'pre-wrap' } }}
                    sx={{ marginRight: 1 }}
                />
                <LoadingButton
                    variant="outlined"
                    onClick={props.dropboxIntegrationEnabled ? revokeDropboxIntegration : integrateWithDropbox}
                    loading={isLoadingIntegration}
                    sx={{ minWidth: 120 }}
                >
                    {props.dropboxIntegrationEnabled ? chrome.i18n.getMessage('revokeDropboxIntegrationButton') : chrome.i18n.getMessage('integrateWithDropboxButton')}
                </LoadingButton>
            </ListItem>
            <ListItem>
                <ListItemText
                    primary={(
                        <TextWithTooltip
                            text={chrome.i18n.getMessage('exportToDropboxPrimary')}
                            tooltipTitle={chrome.i18n.getMessage('exportToDropboxHelp')}
                        ></TextWithTooltip>
                    )}
                    secondary={`${chrome.i18n.getMessage('exportToDropboxSecondary')}${displayLastExport()}`}
                    secondaryTypographyProps={{ style: { whiteSpace: 'pre-wrap' } }}
                    sx={{ marginRight: 1 }}
                />
                <LoadingButton
                    variant="outlined"
                    disabled={!props.dropboxIntegrationEnabled || props.autoImportEnabled}
                    onClick={exportToDropbox}
                    loading={isLoadingExport}
                    sx={{ minWidth: 120 }}
                >
                    {chrome.i18n.getMessage('export')}
                </LoadingButton>
            </ListItem>
            <ListItem>
                <ListItemText
                    primary={chrome.i18n.getMessage('enableAutoImportPrimary')}
                    secondary={chrome.i18n.getMessage('enableAutoImportSecondary')}
                />
                <Switch
                    edge="end"
                    onChange={handleToggle}
                    checked={props.autoImportEnabled}
                    disabled={!props.dropboxIntegrationEnabled}
                />
                <ConfirmDialog
                    title={chrome.i18n.getMessage('autoImportConfirmDialogTitle')}
                    content={(
                        <>
                            {chrome.i18n.getMessage('autoImportConfirmDialogText')}
                            <Typography variant='caption' component={'div'} paddingTop={2}>
                                {chrome.i18n.getMessage('integrateWithDropboxNote')}
                            </Typography>
                        </>
                    )}
                    open={dialogOpen}
                    setOpen={setDialogOpen}
                    okCallback={async () => {
                        await props.setAutoImportEnabled(true)
                        chrome.runtime.sendMessage({ callee: 'importBlockList' });
                    }}
                ></ConfirmDialog>
            </ListItem>
            <ListItem>
                <ListItemText
                    primary={chrome.i18n.getMessage('autoImportInterval')}
                    secondary={displayLastImport()}
                    secondaryTypographyProps={{ style: { whiteSpace: 'pre-wrap' } }}
                    sx={{ marginRight: 1 }}
                />
                <AutoImportIntervalSelect {...props} />
            </ListItem>
        </List>
    );
}

interface AutoImportIntervalSelectProps {
    dropboxIntegrationEnabled: boolean;
    autoImportEnabled: boolean;
    autoImportInterval: number;
    setAutoImportInterval(autoImportInterval: number): void;
}

function AutoImportIntervalSelect(props: AutoImportIntervalSelectProps) {
    const handleChange = (event: SelectChangeEvent) => {
        const interval = parseInt(event.target.value);
        props.setAutoImportInterval(interval);
        chrome.runtime.sendMessage({ callee: 'updateAutoImportInterval', args: [interval] });
    };

    return (
        <Box sx={{ minWidth: 120 }}>
            <FormControl fullWidth size="small">
                <InputLabel id="auto-import-interval-select-label">{chrome.i18n.getMessage('interval')}</InputLabel>
                <Select
                    labelId="auto-import-interval-select-label"
                    id="auto-import-interval-select"
                    value={props.autoImportInterval.toString()}
                    label={chrome.i18n.getMessage('interval')}
                    onChange={handleChange}
                    disabled={!props.dropboxIntegrationEnabled || !props.autoImportEnabled}
                >
                    {AppConstants.AutoImportIntervals.map(interval => (
                        <MenuItem value={interval.value}>
                            {interval.displayName}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}
