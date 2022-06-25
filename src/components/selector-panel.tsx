import * as React from 'react';
import { ListItem, ListItemText, ListItemSecondaryAction, IconButton, TextField, List, Grid, InputAdornment, MenuItem, Menu } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import HighlightAltIcon from '@mui/icons-material/HighlightAlt';
import CodeOffIcon from '@mui/icons-material/CodeOff';
import FontDownloadOffIcon from '@mui/icons-material/FontDownloadOff';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import { getActiveTabAsync, sendMessageToTabAsync } from '../utils/chrome-async';
import { CssSelector } from '../App';
import { AppConstants } from '../constants/app-constants';
import DOMPurify from 'dompurify';

interface SelectorPanelProps {
    selectors: CssSelector[];
    keywords: string[];
    listHeight: number;
    autoImportEnabled: boolean;
    setSelectors(selectors: CssSelector[]): Promise<void>;
    getRefreshSelector(): Promise<{ elementShallowHideSelector: string, elementDeepHideSelector: string, textHideSelector: string }>;
    currentIsActiveDomain(): boolean;
}

interface SelectorPanelState {
    selector: string;
    hideMode: string;
    isError: boolean;
    errorMessage: string;
    interactiveModeEnabled: boolean;
}

class SelectorPanel extends React.Component<SelectorPanelProps, SelectorPanelState> {
    state: SelectorPanelState = {
        selector: '',
        hideMode: '',
        isError: false,
        errorMessage: '',
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

    isValidSelector(selector: string) {
        try {
            document.createDocumentFragment().querySelector(selector);
            return true;
        } catch (error) {
            return false;
        }
    }

    async addSelector(event: React.KeyboardEvent<HTMLDivElement>) {
        if (!this.state.selector || event.key !== 'Enter') {
            return;
        }

        const cleanedSelector = DOMPurify.sanitize(this.state.selector);
        if (!cleanedSelector) {
            this.setState({ isError: true, errorMessage: chrome.i18n.getMessage('selectorFormatError') });
            return;
        }
        if (!this.isValidSelector(cleanedSelector)) {
            this.setState({ isError: true, errorMessage: chrome.i18n.getMessage('selectorFormatError') });
            return;
        }

        const referenceSelectors = this.props.selectors.map(selector => selector.value);
        if (referenceSelectors.includes(cleanedSelector)) {
            this.setState({ isError: true, errorMessage: chrome.i18n.getMessage('selectorAlreadyExistsError') });
            return;
        }

        this.setState({ isError: false, errorMessage: '' });

        const newSelectors = this.props.selectors.concat([
            { value: cleanedSelector, hideMode: AppConstants.ElementHideMode, searchMode: AppConstants.shallowSearch, visibility: false }
        ]);

        await this.props.setSelectors(newSelectors);

        if (this.props.currentIsActiveDomain()) {
            const activeTab = await getActiveTabAsync();
            if (activeTab.id) {
                if (!this.props.keywords.length) {
                    return;
                }
                const refreshSelector = await this.props.getRefreshSelector();
                await sendMessageToTabAsync(activeTab.id, { callee: 'setState', args: [refreshSelector] });
                sendMessageToTabAsync(activeTab.id, { callee: 'refreshSelector', args: [refreshSelector] });
                if (this.state.interactiveModeEnabled) {
                    this.toggleInteractiveMode();
                }
            }
        }

        this.setState({ selector: '' });
    }

    changeSelector(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
        this.setState({ selector: event.target.value });
    }

    async deleteSelector(index: number) {
        const newSelectors = this.props.selectors.slice();
        newSelectors.splice(index, 1);

        await this.props.setSelectors(newSelectors);

        if (this.props.currentIsActiveDomain()) {
            const activeTab = await getActiveTabAsync();
            if (activeTab.id) {
                const refreshSelector = await this.props.getRefreshSelector();
                await sendMessageToTabAsync(activeTab.id, { callee: 'setState', args: [refreshSelector] });
                sendMessageToTabAsync(activeTab.id, { callee: 'refreshSelector', args: [refreshSelector] });
            }
        }
    }

    async toggleVisibility(index: number) {
        const newVisibility = !this.props.selectors[index].visibility;
        const newSelectors = this.props.selectors.slice();
        newSelectors[index].visibility = newVisibility;

        await this.props.setSelectors(newSelectors);

        if (this.props.currentIsActiveDomain()) {
            const activeTab = await getActiveTabAsync();
            if (activeTab.id) {
                const refreshSelector = await this.props.getRefreshSelector();
                await sendMessageToTabAsync(activeTab.id, { callee: 'setState', args: [refreshSelector] });
                sendMessageToTabAsync(activeTab.id, { callee: 'refreshSelector', args: [refreshSelector] });
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
                        autoImportEnabled={this.props.autoImportEnabled}
                        setSelectors={this.props.setSelectors}
                        getRefreshSelector={this.props.getRefreshSelector}
                    ></HideModeMenu>
                    <SearchModeMenu
                        selectors={this.props.selectors}
                        selectorIndex={index}
                        keywords={this.props.keywords}
                        autoImportEnabled={this.props.autoImportEnabled}
                        setSelectors={this.props.setSelectors}
                        getRefreshSelector={this.props.getRefreshSelector}
                    ></SearchModeMenu>
                    <IconButton
                        onClick={() => this.toggleVisibility(index)}
                        edge="end"
                        aria-label="Visibility"
                        disabled={this.props.autoImportEnabled}
                    >
                        {this.getVisibilityIcon(cssSelector)}
                    </IconButton>
                    <IconButton
                        onClick={() => this.deleteSelector(index)}
                        edge="end"
                        aria-label="delete"
                        disabled={this.props.autoImportEnabled}
                    >
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
                        error={this.state.isError}
                        helperText={this.state.isError ? this.state.errorMessage : null}
                        disabled={this.props.autoImportEnabled}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        color={this.state.interactiveModeEnabled ? 'primary' : 'default'}
                                        onClick={() => this.toggleInteractiveMode()}
                                        disabled={this.props.autoImportEnabled}
                                    >
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
    autoImportEnabled: boolean;
    setSelectors(selectors: CssSelector[]): Promise<void>;
    getRefreshSelector(): Promise<{ elementShallowHideSelector: string, elementDeepHideSelector: string, textHideSelector: string }>;
}

const options = [
    {
        icon: <CodeOffIcon sx={{ fontSize: '1.4rem' }} />,
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
        if (index === AppConstants.TextHideMode) {
            newSelector.searchMode = AppConstants.shallowSearch;
        }

        await props.setSelectors(newSelectors);

        const activeTab = await getActiveTabAsync();
        if (activeTab.id) {
            const refreshSelector = await props.getRefreshSelector();
            await sendMessageToTabAsync(activeTab.id, { callee: 'setState', args: [refreshSelector] });
            sendMessageToTabAsync(activeTab.id, { callee: 'refreshSelector', args: [refreshSelector] });
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
                disabled={props.autoImportEnabled}
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

interface SearchModeProps {
    selectors: CssSelector[];
    selectorIndex: number;
    keywords: string[];
    autoImportEnabled: boolean;
    setSelectors(selectors: CssSelector[]): Promise<void>;
    getRefreshSelector(): Promise<{ elementShallowHideSelector: string, elementDeepHideSelector: string, textHideSelector: string }>;
}

const searchOptions = [
    {
        icon: <KeyboardArrowDownIcon sx={{ fontSize: '1.4rem' }} />,
        text: chrome.i18n.getMessage('shallowSearchModeDescription')
    },
    {
        icon: <KeyboardDoubleArrowDownIcon sx={{ fontSize: '1.4rem' }} />,
        text: chrome.i18n.getMessage('deepSearchModeDescription')
    }
];

function SearchModeMenu(props: SearchModeProps) {
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
        newSelector.searchMode = index;
        await props.setSelectors(newSelectors);

        const activeTab = await getActiveTabAsync();
        if (activeTab.id) {
            const refreshSelector = await props.getRefreshSelector();
            await sendMessageToTabAsync(activeTab.id, { callee: 'setState', args: [refreshSelector] });
            sendMessageToTabAsync(activeTab.id, { callee: 'refreshSelector', args: [refreshSelector] });
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
                disabled={props.autoImportEnabled}
            >
                {searchOptions[selector.searchMode ?? 0].icon}
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
                {searchOptions.map((option, index) => (
                    <MenuItem
                        key={index}
                        selected={index === selector.searchMode}
                        onClick={async (event) => await handleMenuItemClick(event, index)}
                        disabled={index === AppConstants.deepSearch && props.selectors[props.selectorIndex].hideMode === AppConstants.TextHideMode}
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