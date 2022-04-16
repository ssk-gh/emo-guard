import * as React from 'react';
import { IconButton, TextField, Grid, Autocomplete, Box } from '@mui/material';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import AllOutIcon from '@mui/icons-material/AllOut';
import { getActiveTabAsync, sendMessageToTabAsync } from '../utils/chrome-async';
import { CssSelector, Site } from '../App';
import { SelectorPanel } from './selector-panel';

interface TargetPanelProps {
    sites: Site[];
    currentSite: Site;
    currentSiteIndex: number;
    keywords: string[];
    activeDomain: string;
    setCurrentSite(site: Site): void;
    setCurrentSiteIndex(index: number): void;
    setSelectors(selectors: CssSelector[]): void;
    getJoinedSelector(): string;
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

        const activeTab = await getActiveTabAsync();
        if (activeTab.id) {
            await sendMessageToTabAsync(activeTab.id, { callee: 'updateEnabled', args: [newCurrentSite.enabled] });
        }

        this.props.setCurrentSite(newCurrentSite);
    }

    render() {
        const currentIsAllSites = this.props.currentSite.domain === 'All sites';
        const powerSettingsButton = currentIsAllSites
            ? (
                <IconButton sx={{ padding: 0, mr: 1 }} disabled>
                    <AllOutIcon sx={{ fontSize: 60 }} color={'secondary'} />
                </IconButton>
            )
            : (
                <IconButton sx={{ padding: 0, mr: 1 }}>
                    <PowerSettingsNewIcon
                        color={this.props.currentSite.enabled ? 'primary' : 'disabled'}
                        sx={{ fontSize: 60 }}
                        onClick={() => this.toggleEnabled()} />
                </IconButton>
            );

        return (
            <Grid container rowSpacing={2}>
                <Grid item xs={12}>
                    <Box justifyContent="center" sx={{ display: 'flex', alignItems: 'center' }}>
                        {powerSettingsButton}
                        <TargetAutocomplete
                            value={{ label: this.props.currentSite.domain, index: this.props.currentSiteIndex }}
                            activeDomain={this.props.activeDomain}
                            sites={this.props.sites}
                            currentSiteIndex={this.props.currentSiteIndex}
                            setCurrentSiteIndex={this.props.setCurrentSiteIndex}>
                        </TargetAutocomplete>
                    </Box>
                </Grid>
                <SelectorPanel
                    selectors={this.props.currentSite.cssSelectors}
                    keywords={this.props.keywords}
                    listHeight={330}
                    setSelectors={this.props.setSelectors}
                    getJoinedSelector={this.props.getJoinedSelector}
                    currentIsActiveDomain={this.props.currentIsActiveDomain}
                ></SelectorPanel>
            </Grid>
        );
    }
}

interface TargetAutocompleteProps {
    value: { label: string, index: number };
    activeDomain: string;
    sites: Site[];
    currentSiteIndex: number;
    setCurrentSiteIndex(index: number): void;
}

interface TargetAutocompleteState {
    inputValue: string;
}

class TargetAutocomplete extends React.Component<TargetAutocompleteProps, TargetAutocompleteState> {
    state: TargetAutocompleteState = {
        inputValue: ''
    };

    getOptions() {
        return this.props.sites.map((site, index) => ({ label: site.domain, index: index }));
    }

    isActiveDomain(domain: string) {
        return domain === this.props.activeDomain;
    }

    getFontColor(domain: string) {
        switch (domain) {
            case this.props.activeDomain:
                return { color: '#1976d2' };
            case 'All sites':
                return { color: '#9c27b0' };
            default:
                return undefined;
        }
    }

    getInputFontColor(domain: string) {
        const fontColor = this.getFontColor(domain);
        return fontColor
            ? { input: fontColor }
            : undefined;
    }

    render() {
        return (
            <Autocomplete
                disablePortal
                disableClearable
                id="combo-box-demo"
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
                    <li {...props} style={this.getFontColor(option.label)}>
                        {option.label}
                    </li>
                )}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Target"
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
