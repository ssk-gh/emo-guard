import * as React from 'react';
import { Box, Grid, Link, Paper, Typography } from '@mui/material';
import { AppConstants } from '../constants/app-constants';
import { Site } from '../types';
import { DropboxIntegration } from './dropbox-integration';
import { AppSettings } from './app-settings';
import { DataManagement } from './data-management';

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
    setKeywords(keywords: string[]): Promise<void>;
    setSites(sites: Site[]): void;
    setDropboxIntegrationEnabled(dropboxIntegrationEnabled: boolean): void;
    setAutoImportEnabled(autoImportEnabled: boolean): void;
    setAutoImportInterval(autoImportInterval: number): void;
    setLastExport(lastExport: Date): void;
    setBlockingSpeed(blockingSpeed: number): void;
    setAlwaysShowKeywords(alwaysShowKeywords: boolean): void;
    getKeywords(): Promise<string[]>;
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

    render() {
        return (
            <Grid container rowSpacing={3} mt={3} textAlign="left">
                <Grid item xs={12}>
                    <Paper elevation={2}>
                        <AppSettings {...this.props} />
                    </Paper>
                </Grid>
                <Grid item xs={12}>
                    <Paper elevation={2}>
                        <DropboxIntegration {...this.props} />
                    </Paper>
                </Grid>
                <Grid item xs={12}>
                    <Paper elevation={2}>
                        <DataManagement {...this.props} />
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
