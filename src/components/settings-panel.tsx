import * as React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormHelperText, Grid, IconButton, InputLabel, Link, List, ListItem, ListItemText, ListSubheader, MenuItem, Paper, Select, SelectChangeEvent, Slider, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { Site } from '../App';
import { AppConstants } from '../constants/app-constants';
import { authorize, createFile, fileExists, revokeToken, updateFile } from '../cloud/dropbox';
import { Dropbox } from 'dropbox';
import { LoadingButton } from '@mui/lab';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DOMPurify from 'dompurify';

interface SettingsPanelProps {
    emoGuardian: string;
    dropboxIntegrationEnabled: boolean;
    autoImportEnabled: boolean;
    autoImportInterval: number;
    lastExport: Date | null;
    lastImport: Date | null;
    blockingSpeed: number;
    alwaysShowKeywords: boolean;
    setEmoGuardian(emoGuardian: string): void;
    setSites(sites: Site[]): void;
    setDropboxIntegrationEnabled(dropboxIntegrationEnabled: boolean): void;
    setAutoImportEnabled(autoImportEnabled: boolean): void;
    setAutoImportInterval(autoImportInterval: number): void;
    setLastExport(lastExport: Date): void;
    setBlockingSpeed(blockingSpeed: number): void;
    setAlwaysShowKeywords(alwaysShowKeywords: boolean): void;
    getSites(): Promise<Site[]>;
    getSyncContents(): Promise<Object>;
}

interface SettingsPanelState {
    subscriptionModeEnabled: boolean;
}

export class SettingsPanel extends React.Component<SettingsPanelProps, SettingsPanelState> {
    state: SettingsPanelState = {
        subscriptionModeEnabled: false
    };

    renderFormHelperText(text: string) {
        return <FormHelperText sx={{ mr: 0, ml: 0 }}>{text}</FormHelperText>;
    }

    render() {
        return (
            <Grid container rowSpacing={3} mt={3} textAlign="left">
                <Grid item xs={12}>
                    <Paper elevation={2}>
                        <RecommendSelector
                            emoGuardian={this.props.emoGuardian}
                            setEmoGuardian={this.props.setEmoGuardian}
                            getSites={this.props.getSites}
                            setSites={this.props.setSites}
                            autoImportEnabled={this.props.autoImportEnabled}
                            blockingSpeed={this.props.blockingSpeed}
                            setBlockingSpeed={this.props.setBlockingSpeed}
                            alwaysShowKeywords={this.props.alwaysShowKeywords}
                            setAlwaysShowKeywords={this.props.setAlwaysShowKeywords}
                        ></RecommendSelector>
                    </Paper>
                </Grid>
                <Grid item xs={12}>
                    <Paper elevation={2}>
                        <DropboxIntegration
                            dropboxIntegrationEnabled={this.props.dropboxIntegrationEnabled}
                            autoImportEnabled={this.props.autoImportEnabled}
                            autoImportInterval={this.props.autoImportInterval}
                            lastExport={this.props.lastExport}
                            lastImport={this.props.lastImport}
                            setDropboxIntegrationEnabled={this.props.setDropboxIntegrationEnabled}
                            setAutoImportEnabled={this.props.setAutoImportEnabled}
                            setAutoImportInterval={this.props.setAutoImportInterval}
                            setLastExport={this.props.setLastExport}
                            getSyncContents={this.props.getSyncContents}
                        ></DropboxIntegration>
                    </Paper>
                </Grid>
                <Grid item xs={12}>
                    <Paper elevation={2}>
                        <Box p={2}>
                            <Typography>{chrome.i18n.getMessage('aboutEmoGuard')}</Typography>
                            <Link href={AppConstants.RepositoryUrl} target="_blank" rel="noopener noreferrer" underline="none">
                                {chrome.i18n.getMessage('repository')}
                            </Link>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        );
    }
}

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

function DropboxIntegration(props: DropboxIntegrationProps) {
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
                <AlertDialog
                    open={dialogOpen}
                    setOpen={setDialogOpen}
                    enableSubscriptionMode={async () => await props.setAutoImportEnabled(true)}
                ></AlertDialog>
            </ListItem>
            <ListItem>
                <ListItemText
                    primary={chrome.i18n.getMessage('autoImportInterval')}
                    secondary={displayLastImport()}
                    secondaryTypographyProps={{ style: { whiteSpace: 'pre-wrap' } }}
                    sx={{ marginRight: 1 }}
                />
                <AutoImportIntervalSelect
                    dropboxIntegrationEnabled={props.dropboxIntegrationEnabled}
                    autoImportEnabled={props.autoImportEnabled}
                    autoImportInterval={props.autoImportInterval}
                    setAutoImportInterval={props.setAutoImportInterval}
                ></AutoImportIntervalSelect>
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

export default function AutoImportIntervalSelect(props: AutoImportIntervalSelectProps) {
    const handleChange = (event: SelectChangeEvent) => {
        const interval = parseInt(event.target.value);
        props.setAutoImportInterval(interval);
        chrome.runtime.sendMessage({ callee: 'updateAutoImportInterval', args: [interval] });
    };

    return (
        <Box sx={{ minWidth: 120 }}>
            <FormControl fullWidth size="small">
                <InputLabel id="demo-simple-select-label">{chrome.i18n.getMessage('interval')}</InputLabel>
                <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
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

interface AlertDialogProps {
    open: boolean;
    setOpen(open: boolean): void;
    enableSubscriptionMode(): void;
}

function AlertDialog(props: AlertDialogProps) {
    const handleClose = () => {
        props.setOpen(false);
    };

    const agree = async () => {
        await props.enableSubscriptionMode();
        chrome.runtime.sendMessage({ callee: 'importBlockList' });
        handleClose();
    };

    return (
        <Dialog
            open={props.open}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                {chrome.i18n.getMessage('autoImportConfirmDialogTitle')}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {chrome.i18n.getMessage('autoImportConfirmDialogText')}
                    <Typography variant='caption' component={'div'} paddingTop={2}>
                        {chrome.i18n.getMessage('integrateWithDropboxNote')}
                    </Typography>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{chrome.i18n.getMessage('cancel')}</Button>
                <Button onClick={agree} autoFocus>OK</Button>
            </DialogActions>
        </Dialog>
    );
}


interface RecommendSelectorProps {
    emoGuardian: string;
    autoImportEnabled: boolean;
    blockingSpeed: number;
    alwaysShowKeywords: boolean;
    getSites(): Promise<Site[]>;
    setSites(sites: Site[]): void;
    setEmoGuardian(emoGuardian: string): void;
    setBlockingSpeed(blockingSpeed: number): void;
    setAlwaysShowKeywords(alwaysShowKeywords: boolean): void;
}

function RecommendSelector(props: RecommendSelectorProps) {
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);

    const resetRecommendSelectors = async () => {
        setIsLoading(true);

        const newSites = (await props.getSites()).slice();
        const allSite = newSites.find(site => site.domain === AppConstants.AllSites);
        if (!allSite) {
            throw Error();
        }

        const recommendSelectors = AppConstants.RecommendCssSelectors.map(recommendSelector => recommendSelector.value);
        const userDefinedSelectors = allSite.cssSelectors.filter(selector => !recommendSelectors.includes(selector.value));
        const newSelectors = AppConstants.RecommendCssSelectors.concat(userDefinedSelectors);
        allSite.cssSelectors = newSelectors;

        props.setSites(newSites);

        setIsLoading(false);
    };

    const saveEmoGuardian = (emoGuardian: string) => {
        const cleanedEmoGuardian = DOMPurify.sanitize(emoGuardian);
        props.setEmoGuardian(cleanedEmoGuardian);
        chrome.storage.sync.set({ emoGuardian: emoGuardian });
    }

    return (
        <List
            sx={{ bgcolor: 'background.paper' }}
            subheader={<ListSubheader>{chrome.i18n.getMessage('appSettings')}</ListSubheader>}
        >
            <ListItem>
                <ListItemText
                    primary={chrome.i18n.getMessage('emoGuardianTextFieldLabel')}
                    secondary={chrome.i18n.getMessage('emoGuardianFormHelperText')}
                />
                <TextField
                    variant="filled"
                    label={chrome.i18n.getMessage("emoGuardianTextFieldLabel")}
                    value={props.emoGuardian}
                    onChange={event => props.setEmoGuardian(event.target.value)}
                    onBlur={event => saveEmoGuardian(event.target.value)}
                    disabled={props.autoImportEnabled}
                    sx={{ width: 120 }}
                />
            </ListItem>
            <ListItem>
                <ListItemText
                    primary={chrome.i18n.getMessage('alwaysShowKeywordList')}
                />
                <Switch
                    edge="end"
                    onChange={(event, checked) => props.setAlwaysShowKeywords(checked)}
                    checked={props.alwaysShowKeywords}
                />
            </ListItem>
            <ListItem>
                <ListItemText
                    primary={(
                        <TextWithTooltip
                            text={chrome.i18n.getMessage('blockingSpeed')}
                            tooltipTitle={chrome.i18n.getMessage('blockingSpeedHint')}
                        ></TextWithTooltip>
                    )}
                    secondary={chrome.i18n.getMessage('blockingSpeedSecondary')}
                    sx={{ marginRight: 1 }}
                />
                <BlockingSpeedSelect
                    blockingSpeed={props.blockingSpeed}
                    setBlockingSpeed={props.setBlockingSpeed}
                ></BlockingSpeedSelect>
            </ListItem>
            <ListItem>
                <ListItemText
                    id="switch-list-label-bluetooth"
                    primary={(
                        <TextWithTooltip
                            text={chrome.i18n.getMessage('resetRecommendSelectorPrimary')}
                            tooltipTitle={`${chrome.i18n.getMessage('resetRecommendSelectorSecondary')}${AppConstants.RecommendCssSelectors.map(selector => selector.value).join(',')}`}
                        ></TextWithTooltip>
                    )}
                    sx={{ marginRight: 1 }}
                />
                <LoadingButton
                    variant="outlined"
                    onClick={() => setDialogOpen(true)}
                    loading={isLoading}
                    sx={{ minWidth: 120 }}
                    disabled={props.autoImportEnabled}
                >
                    {chrome.i18n.getMessage('reset')}
                </LoadingButton>
                <SelectorResetAlertDialog
                    open={dialogOpen}
                    setOpen={setDialogOpen}
                    resetRecommendSelectors={() => resetRecommendSelectors()}
                ></SelectorResetAlertDialog>
            </ListItem>
        </List>
    );
}

interface SelectorResetAlertDialogProps {
    open: boolean;
    setOpen(open: boolean): void;
    resetRecommendSelectors(): void;
}

function SelectorResetAlertDialog(props: SelectorResetAlertDialogProps) {
    const handleClose = () => {
        props.setOpen(false);
    };

    const agree = () => {
        props.resetRecommendSelectors();
        handleClose();
    };

    return (
        <Dialog
            open={props.open}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                {chrome.i18n.getMessage('resetRecommendSelectorConfirmDialogTitle')}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {chrome.i18n.getMessage('resetRecommendSelectorConfirmDialogText')}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{chrome.i18n.getMessage('cancel')}</Button>
                <Button onClick={agree} autoFocus>OK</Button>
            </DialogActions>
        </Dialog>
    );
}

interface BlockingSpeedSelectProps {
    blockingSpeed: number;
    setBlockingSpeed(blockingSpeed: number): void;
}

function BlockingSpeedSelect(props: BlockingSpeedSelectProps) {
    const handleChange = (event: Event, newValue: number | number[]) => {
        const blockingSpeed = newValue as number;
        props.setBlockingSpeed(blockingSpeed);
    };

    const marks = [
        {
            value: 0,
            label: chrome.i18n.getMessage('fast'),
        },
        {
            value: 100,
            label: chrome.i18n.getMessage('slow'),
        },
    ];

    return (
        <Box sx={{ minWidth: 120 }}>
            <Slider
                value={props.blockingSpeed}
                onChange={handleChange}
                defaultValue={50}
                aria-label="Default"
                valueLabelDisplay="auto"
                marks={marks} />
        </Box>
    );
}

interface TextWithTooltipProps {
    text: string;
    tooltipTitle: string;
}

function TextWithTooltip(props: TextWithTooltipProps) {
    return (
        <Stack direction={'row'} alignItems={'center'}>
            <Typography>
                {props.text}
            </Typography>
            <Tooltip title={props.tooltipTitle}>
                <IconButton size="small" color="primary" sx={{ paddingBottom: '7px' }}>
                    <HelpOutlineIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
        </Stack>
    )
}
