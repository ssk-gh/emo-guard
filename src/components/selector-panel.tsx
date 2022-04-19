import * as React from 'react';
import { ListItem, ListItemText, ListItemSecondaryAction, IconButton, TextField, List, Grid, InputAdornment, MenuItem, SelectChangeEvent, Menu } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import HighlightAltIcon from '@mui/icons-material/HighlightAlt';
import HideSourceIcon from '@mui/icons-material/HideSource';
import FontDownloadOffIcon from '@mui/icons-material/FontDownloadOff';
import { getActiveTabAsync, sendMessageToTabAsync } from '../utils/chrome-async';
import { CssSelector } from '../App';
import { AppConstants } from '../constants/app-constants';

interface SelectorPanelProps {
    selectors: CssSelector[];
    keywords: string[];
    listHeight: number;
    setSelectors(selectors: CssSelector[]): void;
    getElementHideSelector(): string;
    getTextHideSelector(): string;
    currentIsActiveDomain(): boolean;
}

interface SelectorPanelState {
    selector: string;
    hideMode: string;
    interactiveModeEnabled: boolean;
}

class SelectorPanel extends React.Component<SelectorPanelProps, SelectorPanelState> {
    state: SelectorPanelState = {
        selector: '',
        hideMode: '',
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
                { value: this.state.selector, hideMode: AppConstants.ElementHideMode, visibility: false }
            ]);

            this.props.setSelectors(newSelectors);

            if (this.props.currentIsActiveDomain()) {
                const activeTab = await getActiveTabAsync();
                if (activeTab.id) {
                    if (!this.props.keywords.length) {
                        return;
                    }
                    const elementHideSelector = this.props.getElementHideSelector();
                    await sendMessageToTabAsync(activeTab.id, { callee: 'updateElementHideSelector', args: [elementHideSelector] });
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
                const selectorUpdateMessage = deletedSelector.hideMode === AppConstants.ElementHideMode
                    ? { callee: 'updateElementHideSelector', args: [this.props.getElementHideSelector()] }
                    : { callee: 'updateTextHideSelector', args: [this.props.getTextHideSelector()] };
                await sendMessageToTabAsync(activeTab.id, selectorUpdateMessage);

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
                const selectorUpdateMessage = newSelectors[index].hideMode === AppConstants.ElementHideMode
                    ? { callee: 'updateElementHideSelector', args: [this.props.getElementHideSelector()] }
                    : { callee: 'updateTextHideSelector', args: [this.props.getTextHideSelector()] };
                await sendMessageToTabAsync(activeTab.id, selectorUpdateMessage);

                if (newVisibility) {
                    sendMessageToTabAsync(activeTab.id, { callee: 'handleDeleteSelector', args: [newSelectors[index].value] });
                } else {
                    if (!this.props.keywords.length) {
                        return;
                    }

                    const hide = newSelectors[index].hideMode === AppConstants.ElementHideMode
                        ? 'hideElements'
                        : 'hideText';
                    sendMessageToTabAsync(activeTab.id, { callee: hide, args: [newSelectors[index].value, this.props.keywords] });
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
            <ListItem sx={{ paddingRight: 10, justifyContent: 'center' }}>
                <ListItemText
                    primary={cssSelector.value}
                    primaryTypographyProps={{
                        style: {
                            overflowWrap: 'break-word'
                        }
                    }}
                />
                <ListItemSecondaryAction>
                    <HideModeMenu
                        selectors={this.props.selectors}
                        selectorIndex={index}
                        keywords={this.props.keywords}
                        setSelectors={this.props.setSelectors}
                        getElementHideSelector={this.props.getElementHideSelector}
                        getTextHideSelector={this.props.getTextHideSelector}
                    ></HideModeMenu>
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
                        label={chrome.i18n.getMessage('selectorTextFieldLabel')}
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

interface HideModeProps {
    selectors: CssSelector[];
    selectorIndex: number;
    keywords: string[];
    setSelectors(selectors: CssSelector[]): void;
    getElementHideSelector(): string;
    getTextHideSelector(): string;
}

const options = [
    {
        icon: <HideSourceIcon sx={{ fontSize: '1.4rem' }} />,
        text: chrome.i18n.getMessage('elementHideModeDescription')
    },
    {
        icon: <FontDownloadOffIcon sx={{ fontSize: '1.4rem' }} />,
        text: chrome.i18n.getMessage('textHideModeDescription')
    }
];

export default function HideModeMenu(props: HideModeProps) {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const selector = props.selectors[props.selectorIndex];

    const handleClickListItem = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuItemClick = async (
        event: React.MouseEvent<HTMLElement>,
        index: number,
    ) => {
        const newSelectors = props.selectors.slice();
        const newSelector = newSelectors[props.selectorIndex];
        newSelector.hideMode = index;
        props.setSelectors(newSelectors);

        const activeTab = await getActiveTabAsync();
        if (activeTab.id) {
            await sendMessageToTabAsync(activeTab.id, { callee: 'updateElementHideSelector', args: [props.getElementHideSelector()] });
            await sendMessageToTabAsync(activeTab.id, { callee: 'updateTextHideSelector', args: [props.getTextHideSelector()] });
            await sendMessageToTabAsync(activeTab.id, { callee: 'handleDeleteSelector', args: [newSelector.value] });

            const hide = newSelector.hideMode === AppConstants.ElementHideMode
                ? 'hideElements'
                : 'hideText';
            sendMessageToTabAsync(activeTab.id, { callee: hide, args: [newSelector.value, props.keywords] });
        }

        setAnchorEl(null);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <>
            <IconButton
                edge="end"
                aria-label="more"
                id="long-button"
                aria-controls={open ? 'long-menu' : undefined}
                aria-expanded={open ? 'true' : undefined}
                aria-haspopup="true"
                onClick={handleClickListItem}
                sx={{ marginRight: '-9px' }}
            >
                {options[selector.hideMode ?? 0].icon}
            </IconButton>
            <Menu
                id="lock-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'lock-button',
                    role: 'listbox',
                    style: {
                        padding: 0
                    }
                }}
            >
                {options.map((option, index) => (
                    <MenuItem
                        key={index}
                        selected={index === selector.hideMode}
                        onClick={(event) => handleMenuItemClick(event, index)}
                    >
                        {option.icon}
                        <span style={{ marginLeft: 9 }}>{option.text}</span>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}

export { SelectorPanel };