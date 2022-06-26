import * as React from 'react';
import { Grid, TextField, List, IconButton, ListItem, ListItemSecondaryAction, ListItemText, Typography, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getActiveTabAsync, sendMessageToTabAsync } from '../utils/chrome-async';
import { Site } from '../App';
import DOMPurify from 'dompurify';

interface KeywordProps {
    keywords: string[];
    currentSite: Site;
    autoImportEnabled: boolean;
    alwaysShowKeywords: boolean;
    setKeywords(keywords: string[]): Promise<void>;
}

interface KeywordState {
    keyword: string;
    visible: boolean;
    isError: boolean;
}

class KeywordPanel extends React.Component<KeywordProps, KeywordState> {
    state: KeywordState = {
        keyword: '',
        visible: false,
        isError: false
    };

    changeKeyword(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
        this.setState({ keyword: event.target.value });
    }

    async addKeyword(event: React.KeyboardEvent<HTMLDivElement>) {
        if (!this.state.keyword || event.key !== 'Enter') {
            return;
        }

        const cleanedKeyword = DOMPurify.sanitize(this.state.keyword);
        if (!cleanedKeyword) {
            this.setState({ isError: true });
            return;
        } else {
            this.setState({ isError: false });
        }

        const keywords = this.props.keywords.concat([cleanedKeyword]);
        await this.props.setKeywords(keywords);
        const activeTab = await getActiveTabAsync();
        if (activeTab.id) {
            await sendMessageToTabAsync(activeTab.id, { callee: 'setState', args: [{ keywords: keywords }] });
            sendMessageToTabAsync(activeTab.id, { callee: 'hideWithKeyword', args: [[cleanedKeyword]] });
        }

        this.setState({ keyword: '' });
    }

    async deleteKeyword(index: number) {
        const keywords = this.props.keywords.slice();
        keywords.splice(index, 1);

        await this.props.setKeywords(keywords);

        const activeTab = await getActiveTabAsync();
        if (activeTab.id) {
            await sendMessageToTabAsync(activeTab.id, { callee: 'setState', args: [{ keywords: keywords }] });
            sendMessageToTabAsync(activeTab.id, { callee: 'refreshKeyword', args: [keywords] });
        }
    }

    generateKeywordListItems() {
        return this.props.keywords.map((keyword, index) => (
            <ListItem>
                <ListItemText
                    primary={keyword}
                    primaryTypographyProps={{
                        style: {
                            overflowX: 'auto',
                            whiteSpace: 'pre'
                        }
                    }}
                />
                <ListItemSecondaryAction>
                    <Tooltip enterDelay={600} title={chrome.i18n.getMessage('delete')}>
                        <IconButton
                            onClick={async () => await this.deleteKeyword(index)}
                            edge="end"
                            aria-label="delete"
                            disabled={this.props.autoImportEnabled}>
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </ListItemSecondaryAction>
            </ListItem>
        ));
    }

    renderKeywordList() {
        const height = 390;
        const visibilityIcon = (
            <Grid
                container
                direction="column"
                justifyContent="center"
                alignItems="center"
                sx={{ height: height + 16, maxHeight: height + 16 }}
            >
                <Grid item>
                    <IconButton aria-label="delete" size="large" onClick={() => this.setState({ visible: true })}>
                        <VisibilityIcon sx={{ fontSize: 60 }} />
                    </IconButton>
                </Grid>
                <Grid item>
                    <Typography variant="caption" color={'text.secondary'} component="div">
                        {chrome.i18n.getMessage('showKeywordList')}
                    </Typography>
                </Grid>
            </Grid>
        );

        const keywordList = (
            <List sx={{ height: height, maxHeight: height, overflow: 'auto' }}>
                {this.generateKeywordListItems()}
            </List>
        );

        return this.props.alwaysShowKeywords || this.state.visible
            ? keywordList
            : visibilityIcon;
    }

    render() {
        return (
            <Grid container rowSpacing={1}>
                <Grid item xs={12}>
                    {this.renderKeywordList()}
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label={chrome.i18n.getMessage('keywordTextFieldLabel')}
                        variant='filled'
                        fullWidth
                        value={this.state.keyword}
                        onChange={event => this.changeKeyword(event)}
                        onKeyPress={event => this.addKeyword(event)}
                        error={this.state.isError}
                        helperText={this.state.isError ? chrome.i18n.getMessage('keywordError') : null}
                        disabled={this.props.autoImportEnabled} />
                </Grid>
            </Grid>
        );
    }
}

export { KeywordPanel };
