import * as React from 'react';
import { FormControl, FormControlLabel, FormHelperText, FormLabel, Grid, Radio, RadioGroup, TextField } from '@mui/material';
import { DefaultTarget } from '../App';

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
                        label="EmoGuardian"
                        value={this.props.emoGuardian}
                        onChange={event => this.props.setEmoGuardian(event.target.value)}
                        onBlur={event => chrome.storage.sync.set({ emoGuardian: event.target.value })}
                    />
                    {this.renderFormHelperText('入力された絵文字で要素や文字列を隠します。')}
                </Grid>
                <Grid item xs={12}>
                    <FormControl>
                        <FormLabel>デフォルトターゲット</FormLabel>
                        {this.renderFormHelperText('拡張機能を開いた時のターゲットを指定します。')}
                        <RadioGroup
                            aria-labelledby="demo-radio-buttons-group-label"
                            defaultValue="this site"
                            name="radio-buttons-group"
                            value={this.props.defaultTarget}
                            onChange={event => this.props.setDefaultTarget(event.target.value as DefaultTarget)}
                        >
                            <FormControlLabel value="this site" control={<Radio />} label="閲覧中のサイト" />
                            <FormControlLabel value="all sites" control={<Radio />} label="全てのサイト" />
                        </RadioGroup>
                    </FormControl>
                </Grid>
            </Grid>
        );
    }
}
