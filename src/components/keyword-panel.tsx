import * as React from 'react';
import { Grid, TextField, List, IconButton, ListItem, ListItemSecondaryAction, ListItemText } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getActiveTabAsync, sendMessageToTabAsync } from '../utils/chrome-async';
import { Site } from '../App';

interface KeywordProps {
    keywords: string[];
    currentSite: Site;
    setKeywords(keywords: string[]): void;
}

interface KeywordState {
    keyword: string;
}

class KeywordPanel extends React.Component<KeywordProps, KeywordState> {
    state: KeywordState = {
        keyword: ''
    };

    changeKeyword(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
        this.setState({ keyword: event.target.value });
    }

    async addKeyword(event: React.KeyboardEvent<HTMLDivElement>) {
        if (this.state.keyword && event.key === 'Enter') {
            const keywords = this.props.keywords.concat([this.state.keyword]);
            const activeTab = await getActiveTabAsync();
            if (activeTab.id) {
                await sendMessageToTabAsync(activeTab.id, { callee: 'updateKeywords', args: [keywords] });

                const selector = this.props.currentSite?.cssSelectors.filter(selector => !selector.visibility).map(selector => selector.value).join(',');
                sendMessageToTabAsync(activeTab.id, { callee: 'hideElements', args: [selector, [this.state.keyword]] });
            }

            this.setState({ keyword: '' });
            this.props.setKeywords(keywords);
        }
    }

    async deleteKeyword(index: number) {
        const keywords = this.props.keywords.slice();
        keywords.splice(index, 1);

        const activeTab = await getActiveTabAsync();
        if (activeTab.id) {
            await sendMessageToTabAsync(activeTab.id, { callee: 'updateKeywords', args: [keywords] });
            sendMessageToTabAsync(activeTab.id, { callee: 'handleDeleteKeyword', args: [keywords] });
        }

        this.props.setKeywords(keywords);
    }

    generateKeywordListItems() {
        return this.props.keywords.map((keyword, index) => (
            <ListItem>
                <ListItemText
                    primary={keyword}
                    primaryTypographyProps={{
                        style: {
                            overflowWrap: 'break-word'
                        }
                    }}
                />
                <ListItemSecondaryAction>
                    <IconButton
                        onClick={() => this.deleteKeyword(index)}
                        edge="end"
                        aria-label="delete">
                        <DeleteIcon />
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>
        ));
    }

    render() {
        return (
            <Grid container>
                <Grid item xs={12}>
                    <List sx={{ height: 390, maxHeight: 390, overflow: 'auto' }}>
                        {this.generateKeywordListItems()}
                    </List>
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label={chrome.i18n.getMessage('keywordTextFieldLabel')}
                        variant='filled'
                        fullWidth
                        value={this.state.keyword}
                        onChange={event => this.changeKeyword(event)}
                        onKeyPress={event => this.addKeyword(event)} />
                </Grid>
            </Grid>
        );
    }
}

export { KeywordPanel };
