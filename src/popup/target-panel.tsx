import * as React from 'react';
import { IconButton, TextField, Grid, Autocomplete, Box, Tooltip } from '@mui/material';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import AllOutIcon from '@mui/icons-material/AllOut';
import { getActiveTabAsync, sendMessageToTabAsync } from '../utils/chrome-async';
import { SelectorPanel } from './selector-panel';
import { AppConstants } from '../constants/app-constants';
import { Site, CssSelector, RefreshSelector } from '../types';

interface TargetPanelProps {
    sites: Site[];
    currentSite: Site;
    currentSiteIndex: number;
    keywords: string[];
    activeDomain: string;
    autoImportEnabled: boolean;
    canInteract: boolean;
    setCurrentSite(site: Site): void;
    setCurrentSiteIndex(index: number): void;
    setSelectors(selectors: CssSelector[]): Promise<void>;
    getRefreshSelector(): Promise<RefreshSelector>;
    currentIsActiveDomain(): boolean;
}

class TargetPanel extends React.Component<TargetPanelProps> {
    getPowerSettingsIcon(enabled: boolean) {
        return enabled
            ? <PowerSettingsNewIcon color="primary" sx={{ fontSize: 80 }} onClick={() => this.toggleEnabled()} />
            : <PowerSettingsNewIcon color="disabled" sx={{ fontSize: 80 }} />;
    }

    async toggleEnabled() {
        const newCurrentSite = Object.assign({}, this.props.currentSite);
        newCurrentSite.enabled = !this.props.currentSite.enabled;
        this.props.setCurrentSite(newCurrentSite);

        const activeTab = await getActiveTabAsync();
        if (!activeTab.id || !this.props.canInteract) {
            return;
        }

        await sendMessageToTabAsync(activeTab.id, { callee: 'togglePower', args: [newCurrentSite.enabled] });
    }

    render() {
        const currentIsAllSites = this.props.currentSite.domain === AppConstants.AllSites;
        const powerSettingsButton = currentIsAllSites
            ? (
                <IconButton sx={{ padding: 0, mr: 1 }} disabled>
                    <AllOutIcon sx={{ fontSize: 60 }} color={'secondary'} />
                </IconButton>
            )
            : (
                <Tooltip enterDelay={600} title={this.props.currentSite.enabled ? chrome.i18n.getMessage('disablePowerTooltip') : chrome.i18n.getMessage('enablePowerTooltip')}>
                    <IconButton sx={{ padding: 0, mr: 1 }}>
                        <PowerSettingsNewIcon
                            color={this.props.currentSite.enabled ? 'primary' : 'disabled'}
                            sx={{ fontSize: 60 }}
                            onClick={() => this.toggleEnabled()} />
                    </IconButton>
                </Tooltip>
            );

        return (
            <Grid container rowSpacing={2}>
                <Grid item xs={12}>
                    <Box justifyContent="center" sx={{ display: 'flex', alignItems: 'center' }}>
                        {powerSettingsButton}
                        <TargetAutocomplete
                            {...this.props}
                            value={{
                                id: this.props.currentSite.domain,
                                label: this.props.currentSite.domain === AppConstants.AllSites
                                    ? chrome.i18n.getMessage('allSites')
                                    : this.props.currentSite.domain,
                                index: this.props.currentSiteIndex
                            }}
                        ></TargetAutocomplete>
                    </Box>
                </Grid>
                <SelectorPanel
                    {...this.props}
                    listHeight={330}
                    selectors={this.props.currentSite.cssSelectors}
                ></SelectorPanel>
            </Grid>
        );
    }
}

interface TargetAutocompleteProps {
    value: { id: string, label: string, index: number };
    activeDomain: string;
    sites: Site[];
    currentSiteIndex: number;
    setCurrentSiteIndex(index: number): void;
}

interface TargetAutocompleteState {
    inputValue: string;
    allSiteLabel: string;
}

class TargetAutocomplete extends React.Component<TargetAutocompleteProps, TargetAutocompleteState> {
    state: TargetAutocompleteState = {
        inputValue: '',
        allSiteLabel: chrome.i18n.getMessage('allSites')
    };

    getOptions() {
        return this.props.sites.map((site, index) => {
            const label = site.domain === AppConstants.AllSites
                ? this.state.allSiteLabel
                : site.domain;
            return { id: site.domain, label: label, index: index };
        });
    }

    isActiveDomain(domain: string) {
        return domain === this.props.activeDomain;
    }

    getFontColor(id: string) {
        switch (id) {
            case this.props.activeDomain:
                return { color: '#1976d2' };
            case AppConstants.AllSites:
                return { color: '#9c27b0' };
            default:
                return undefined;
        }
    }

    getInputFontColor(inputValue: string) {
        const id = inputValue === this.state.allSiteLabel
            ? AppConstants.AllSites
            : inputValue;
        const fontColor = this.getFontColor(id);
        return fontColor
            ? { input: fontColor }
            : undefined;
    }

    render() {
        return (
            <Autocomplete
                disablePortal
                disableClearable
                id="target-autocomplete"
                value={this.props.value}
                onChange={(event, newValue) => {
                    if (newValue) {
                        this.props.setCurrentSiteIndex(newValue.index);
                    }
                }}
                onInputChange={(event, newInputValue) => {
                    this.setState({ inputValue: newInputValue });
                }}
                options={this.getOptions()}
                renderOption={(props, option) => (
                    <li {...props} style={this.getFontColor(option.id)}>
                        {option.label}
                    </li>
                )}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={chrome.i18n.getMessage('target')}
                        variant="standard"
                        sx={this.getInputFontColor(this.state.inputValue)}
                    />
                )}
                sx={{ width: '100%' }}
            />
        );
    }
}

export { TargetPanel };
