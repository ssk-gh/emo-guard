import * as React from 'react';
import { FormControl, FormControlLabel, FormHelperText, FormLabel, Grid, Radio, RadioGroup, TextField } from '@mui/material';
import { DefaultTarget } from '../App';
import { AppConstants } from '../constants/app-constants';

interface SettingsPanelProps {
    emoGuardian: string;
    defaultTarget: DefaultTarget;
    setEmoGuardian(emoGuardian: string): void;
    setDefaultTarget(defaultTarget: DefaultTarget): void;
}

export class SettingsPanel extends React.Component<SettingsPanelProps> {
    renderFormHelperText(text: string) {
        return <FormHelperText sx={{ mr: 0, ml: 0 }}>{text}</FormHelperText>;
    }

    render() {
        return (
            <Grid container rowSpacing={3} textAlign="left">
                <Grid item xs={12}>
                    <TextField
                        variant="filled"
                        label={chrome.i18n.getMessage("emoGuardianTextFieldLabel")}
                        value={this.props.emoGuardian}
                        onChange={event => this.props.setEmoGuardian(event.target.value)}
                        onBlur={event => chrome.storage.sync.set({ emoGuardian: event.target.value })}
                    />
                    {this.renderFormHelperText(chrome.i18n.getMessage('emoGuardianFormHelperText'))}
                </Grid>
                <Grid item xs={12}>
                    <FormControl>
                        <FormLabel>{chrome.i18n.getMessage('defaultTargetFormLabel')}</FormLabel>
                        {this.renderFormHelperText(chrome.i18n.getMessage('defaultTargetFormHelperText'))}
                        <RadioGroup
                            aria-labelledby="demo-radio-buttons-group-label"
                            defaultValue={AppConstants.ThisSite}
                            name="radio-buttons-group"
                            value={this.props.defaultTarget}
                            onChange={event => this.props.setDefaultTarget(event.target.value as DefaultTarget)}
                        >
                            <FormControlLabel value={AppConstants.ThisSite} control={<Radio />} label={chrome.i18n.getMessage('thisSiteRadioButtonLabel')} />
                            <FormControlLabel value={AppConstants.AllSites} control={<Radio />} label={chrome.i18n.getMessage('allSitesRadioButtonLabel')} />
                        </RadioGroup>
                    </FormControl>
                </Grid>
            </Grid>
        );
    }
}
