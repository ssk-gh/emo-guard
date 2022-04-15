import * as React from 'react';
import { ListItem, ListItemText, ListItemSecondaryAction, IconButton, TextField, List, Grid, InputAdornment } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import HighlightAltIcon from '@mui/icons-material/HighlightAlt';
import { getActiveTabAsync, sendMessageToTabAsync } from '../utils/chrome-async';
import { CssSelector } from '../App';

interface SelectorPanelProps {
    selectors: CssSelector[];
    keywords: string[];
    listHeight: number;
    setSelectors(selectors: CssSelector[]): void;
    getJoinedSelector(): string;
    currentIsActiveDomain(): boolean;
}

interface SelectorPanelState {
    selector: string;
    interactiveModeEnabled: boolean;
}

class SelectorPanel extends React.Component<SelectorPanelProps, SelectorPanelState> {
    state: SelectorPanelState = {
        selector: '',
        interactiveModeEnabled: false
    };

    async componentDidMount() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.callee) {
                case 'setSelector':
                    this.setState({ selector: message.args[0] });
                    break;
                default:
                    throw new Error(`Unknown message: ${message}`);
            }
            sendResponse();
        });
    }

    async addSelector(event: React.KeyboardEvent<HTMLDivElement>) {
        if (this.state.selector && event.key === 'Enter') {
            const newSelectors = this.props.selectors.concat([
                { value: this.state.selector, visibility: false }
            ]);

            this.props.setSelectors(newSelectors);

            if (this.props.currentIsActiveDomain()) {
                const activeTab = await getActiveTabAsync();
                if (activeTab.id) {
                    if (!this.props.keywords.length) {
                        return;
                    }
                    const joinedSelector = this.props.getJoinedSelector();
                    await sendMessageToTabAsync(activeTab.id, { callee: 'updateJoinedSelector', args: [joinedSelector] });
                    sendMessageToTabAsync(activeTab.id, { callee: 'hideElements', args: [this.state.selector, this.props.keywords] });
                    if (this.state.interactiveModeEnabled) {
                        this.toggleInteractiveMode();
                    }
                }
            }

            this.setState({ selector: '' });
        }
    }

    changeSelector(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
        this.setState({ selector: event.target.value });
    }

    async deleteSelector(index: number) {
        const newSelectors = this.props.selectors.slice();
        const deletedSelector = newSelectors[index];
        newSelectors.splice(index, 1);

        this.props.setSelectors(newSelectors);

        if (this.props.currentIsActiveDomain()) {
            const activeTab = await getActiveTabAsync();
            if (activeTab.id) {
                const joinedSelector = this.props.getJoinedSelector();
                await sendMessageToTabAsync(activeTab.id, { callee: 'updateJoinedSelector', args: [joinedSelector] })
                sendMessageToTabAsync(activeTab.id, { callee: 'handleDeleteSelector', args: [deletedSelector.value] });
            }
        }
    }

    async toggleVisibility(index: number) {
        const newVisibility = !this.props.selectors[index].visibility;
        const newSelectors = this.props.selectors.slice();
        newSelectors[index].visibility = newVisibility;

        this.props.setSelectors(newSelectors);

        if (this.props.currentIsActiveDomain()) {
            const activeTab = await getActiveTabAsync();
            if (activeTab.id) {
                const joinedSelector = this.props.getJoinedSelector();
                await sendMessageToTabAsync(activeTab.id, { callee: 'updateJoinedSelector', args: [joinedSelector] })
                if (newVisibility) {
                    sendMessageToTabAsync(activeTab.id, { callee: 'handleDeleteSelector', args: [newSelectors[index].value] });
                } else {
                    if (!this.props.keywords.length) {
                        return;
                    }
                    sendMessageToTabAsync(activeTab.id, { callee: 'hideElements', args: [newSelectors[index].value, this.props.keywords] });
                }
            }
        }
    }

    async toggleInteractiveMode() {
        this.setState({ interactiveModeEnabled: !this.state.interactiveModeEnabled });
        const activeTab = await getActiveTabAsync();
        if (activeTab.id) {
            if (this.state.interactiveModeEnabled) {
                sendMessageToTabAsync(activeTab.id, { callee: 'enableInteractiveMode', args: [] });
            } else {
                sendMessageToTabAsync(activeTab.id, { callee: 'disableInteractiveMode', args: [] });
            }
        }
    }

    getVisibilityIcon(cssSelector: CssSelector) {
        return cssSelector.visibility
            ? <VisibilityIcon />
            : <VisibilityOffIcon />
    }

    generateSelectorListItems() {
        return this.props.selectors.map((cssSelector, index) => (
            <ListItem sx={{ paddingRight: 10 }}>
                <ListItemText
                    primary={cssSelector.value}
                    primaryTypographyProps={{
                        style: {
                            overflowWrap: 'break-word'
                        }
                    }}
                />
                <ListItemSecondaryAction>
                    <IconButton
                        onClick={() => this.toggleVisibility(index)}
                        edge="end"
                        aria-label="Visibility">
                        {this.getVisibilityIcon(cssSelector)}
                    </IconButton>
                    <IconButton
                        onClick={() => this.deleteSelector(index)}
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
                    <List sx={{ height: this.props.listHeight, maxHeight: this.props.listHeight, overflow: 'auto' }}>
                        {this.generateSelectorListItems()}
                    </List>
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="CSSセレクタを追加"
                        variant='filled'
                        fullWidth
                        value={this.state.selector}
                        onChange={event => this.changeSelector(event)}
                        onKeyPress={event => this.addSelector(event)}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        color={this.state.interactiveModeEnabled ? 'primary' : 'default'}
                                        onClick={() => this.toggleInteractiveMode()}>
                                        <HighlightAltIcon />
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                </Grid>
            </Grid>
        );
    }
}

export { SelectorPanel };