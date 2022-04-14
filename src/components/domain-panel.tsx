import * as React from 'react';
import { IconButton, TextField, Grid, Autocomplete } from '@mui/material';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { getActiveTabAsync, sendMessageToTabAsync } from '../utils/chrome-async';
import { CssSelector, Site } from '../App';
import { SelectorPanel } from './selector-panel';

interface DomainPanelProps {
    sites: Site[];
    currentSite: Site;
    currentSiteIndex: number;
    keywords: string[];
    activeDomain: string;
    setCurrentSite(site: Site): void;
    setCurrentSiteIndex(index: number): void;
    setDomainSelectors(selectors: CssSelector[]): void;
    getJoinedSelector(): string;
    currentIsActiveDomain(): boolean;
}

class DomainPanel extends React.Component<DomainPanelProps> {
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
        return (
            <Grid container rowSpacing={2} columnSpacing={{ xs: 1 }} justifyContent="center" alignItems="center">
                <Grid item xs={3}>
                    <IconButton sx={{ width: 80, height: 80 }}>
                        <PowerSettingsNewIcon
                            color={this.props.currentSite.enabled ? 'primary' : 'disabled'}
                            sx={{ fontSize: 70 }}
                            onClick={() => this.toggleEnabled()} />
                    </IconButton>
                </Grid>
                <Grid item xs={9}>
                    <DomainAutocomplete
                        value={{ label: this.props.currentSite.domain, index: this.props.currentSiteIndex }}
                        activeDomain={this.props.activeDomain}
                        sites={this.props.sites}
                        currentSiteIndex={this.props.currentSiteIndex}
                        setCurrentSiteIndex={this.props.setCurrentSiteIndex}>
                    </DomainAutocomplete>
                </Grid>
                <SelectorPanel
                    selectors={this.props.currentSite.cssSelectors}
                    keywords={this.props.keywords}
                    listHeight={330}
                    setSelectors={this.props.setDomainSelectors}
                    getJoinedSelector={this.props.getJoinedSelector}
                    currentIsActiveDomain={this.props.currentIsActiveDomain}
                ></SelectorPanel>
            </Grid>
        );
    }
}

interface DomainAutocompleteProps {
    value: { label: string, index: number };
    activeDomain: string;
    sites: Site[];
    currentSiteIndex: number;
    setCurrentSiteIndex(index: number): void;
}

class DomainAutocomplete extends React.Component<DomainAutocompleteProps> {
    getOptions() {
        return this.props.sites.map((site, index) => ({ label: site.domain, index: index }));
    }

    isActiveDomain(domain: string) {
        return domain === this.props.activeDomain;
    }

    render() {
        return (
            <Autocomplete
                disablePortal
                id="combo-box-demo"
                value={this.props.value}
                onChange={(event, newValue) => {
                    if (newValue) {
                        this.props.setCurrentSiteIndex(newValue.index);
                    }
                }}
                options={this.getOptions()}
                renderOption={(props, option) => (
                    <li {...props} style={this.isActiveDomain(option.label) ? { color: '#1976d2' } : undefined}>
                        {option.label}
                    </li>
                )}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Domain"
                        variant="standard"
                        sx={this.isActiveDomain(this.props.value.label) ? { input: { color: '#1976d2' } } : undefined}
                    />
                )}
            />
        );
    }
}

export { DomainPanel };