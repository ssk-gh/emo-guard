import { LoadingButton } from "@mui/lab";
import { List, ListSubheader, ListItem, ListItemText, TextField, Switch, Box, Slider } from "@mui/material";
import DOMPurify from "dompurify";
import React from "react";
import { ConfirmDialog } from "../components/confirm-dialog";
import { TextWithTooltip } from "../components/text-with-tooltip";
import { AppConstants } from "../constants/app-constants";
import { Site } from "../types";

interface AppSettingsProps {
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

export function AppSettings(props: AppSettingsProps) {
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
                <BlockingSpeedSlider {...props} />
            </ListItem>
            <ListItem>
                <ListItemText
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
                <ConfirmDialog
                    title={chrome.i18n.getMessage('resetRecommendSelectorConfirmDialogTitle')}
                    content={chrome.i18n.getMessage('resetRecommendSelectorConfirmDialogText')}
                    open={dialogOpen}
                    setOpen={setDialogOpen}
                    callback={() => resetRecommendSelectors()}
                ></ConfirmDialog>
            </ListItem>
        </List>
    );
}

interface BlockingSpeedSliderProps {
    blockingSpeed: number;
    setBlockingSpeed(blockingSpeed: number): void;
}

function BlockingSpeedSlider(props: BlockingSpeedSliderProps) {
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