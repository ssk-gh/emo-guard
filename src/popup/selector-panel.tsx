import * as React from 'react';
import { ListItem, ListItemText, ListItemSecondaryAction, IconButton, TextField, List, Grid, InputAdornment, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import HighlightAltIcon from '@mui/icons-material/HighlightAlt';
import CodeOffIcon from '@mui/icons-material/CodeOff';
import FontDownloadOffIcon from '@mui/icons-material/FontDownloadOff';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import { getActiveTabAsync, sendMessageToTabAsync } from '../utils/chrome-async';
import { AppConstants } from '../constants/app-constants';
import DOMPurify from 'dompurify';
import { CssSelector, ModeOption, RefreshSelector } from '../types';
import { TextWithTooltip } from '../components/text-with-tooltip';
import ModeMenu from '../components/mode-menu';

interface SelectorPanelProps {
    selectors: CssSelector[];
    keywords: string[];
    listHeight: number;
    autoImportEnabled: boolean;
    canInteract: boolean;
    setSelectors(selectors: CssSelector[]): Promise<void>;
    getRefreshSelector(): Promise<RefreshSelector>;
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
                    break;
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
        this.setState({ selector: '' });

        if (this.state.interactiveModeEnabled) {
            this.toggleInteractiveMode();
        }
        if (!this.props.keywords.length) {
            return;
        }

        refreshSelector(this.props.canInteract, this.props.currentIsActiveDomain, this.props.getRefreshSelector);
    }

    changeSelector(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
        this.setState({ selector: event.target.value });
    }

    async deleteSelector(index: number) {
        const newSelectors = this.props.selectors.slice();
        newSelectors.splice(index, 1);
        await this.props.setSelectors(newSelectors);

        refreshSelector(this.props.canInteract, this.props.currentIsActiveDomain, this.props.getRefreshSelector);
    }

    async toggleVisibility(index: number) {
        const newVisibility = !this.props.selectors[index].visibility;
        const newSelectors = this.props.selectors.slice();
        newSelectors[index].visibility = newVisibility;
        await this.props.setSelectors(newSelectors);

        refreshSelector(this.props.canInteract, this.props.currentIsActiveDomain, this.props.getRefreshSelector);
    }

    async toggleInteractiveMode() {
        this.setState({ interactiveModeEnabled: !this.state.interactiveModeEnabled });
        if (!this.props.canInteract) {
            return;
        }

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

    async handleHideModeMenuItemClick(event: React.MouseEvent<HTMLElement>, menuIndex: number, selectorIndex: number) {
        const newSelectors = this.props.selectors.slice();
        const newSelector = newSelectors[selectorIndex];
        newSelector.hideMode = menuIndex;
        if (menuIndex === AppConstants.TextHideMode) {
            newSelector.searchMode = AppConstants.shallowSearch;
        }

        await this.props.setSelectors(newSelectors);
        refreshSelector(this.props.canInteract, this.props.currentIsActiveDomain, this.props.getRefreshSelector);
    }

    async handleSearchModeMenuItemClick(event: React.MouseEvent<HTMLElement>, menuIndex: number, selectorIndex: number) {
        const newSelectors = this.props.selectors.slice();
        const newSelector = newSelectors[selectorIndex];
        newSelector.searchMode = menuIndex;

        await this.props.setSelectors(newSelectors);
        refreshSelector(this.props.canInteract, this.props.currentIsActiveDomain, this.props.getRefreshSelector);
    }

    generateSelectorListItems() {
        return this.props.selectors.map((cssSelector, index) => (
            <ListItem sx={{ paddingRight: 18, justifyContent: 'center' }}>
                <ListItemText
                    primary={cssSelector.value}
                    primaryTypographyProps={{
                        style: {
                            overflowX: 'auto',
                            whiteSpace: 'pre'
                        }
                    }}
                />
                <ListItemSecondaryAction>
                    <ModeMenu
                        options={hideOptions}
                        selected={this.props.selectors[index].hideMode}
                        tooltipTitle={this.props.selectors[index].hideMode ? chrome.i18n.getMessage('textHide') : chrome.i18n.getMessage('elementHide')}
                        anchorDisabled={this.props.autoImportEnabled}
                        menuItemDisabled={() => false}
                        handleMenuItemClick={(event, menuIndex) => this.handleHideModeMenuItemClick(event, menuIndex, index)}
                    ></ModeMenu>
                    <ModeMenu
                        options={searchOptions}
                        selected={this.props.selectors[index].searchMode}
                        tooltipTitle={this.props.selectors[index].searchMode ? chrome.i18n.getMessage('deepSearch') : chrome.i18n.getMessage('shallowSearch')}
                        anchorDisabled={this.props.autoImportEnabled}
                        menuItemDisabled={(menuIndex) => menuIndex === AppConstants.deepSearch && this.props.selectors[index].hideMode === AppConstants.TextHideMode}
                        handleMenuItemClick={(event, menuIndex) => this.handleSearchModeMenuItemClick(event, menuIndex, index)}
                    ></ModeMenu>
                    <Tooltip enterDelay={600} title={cssSelector.visibility ? chrome.i18n.getMessage('show') : chrome.i18n.getMessage('hide')}>
                        <IconButton
                            onClick={() => this.toggleVisibility(index)}
                            edge="end"
                            aria-label="Visibility"
                            sx={{ marginRight: '-9px' }}
                            disabled={this.props.autoImportEnabled}
                        >
                            {this.getVisibilityIcon(cssSelector)}
                        </IconButton>
                    </Tooltip>
                    <Tooltip enterDelay={600} title={chrome.i18n.getMessage('delete')}>
                        <IconButton
                            onClick={() => this.deleteSelector(index)}
                            edge="end"
                            aria-label="delete"
                            disabled={this.props.autoImportEnabled}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </ListItemSecondaryAction>
            </ListItem>
        ));
    }

    render() {
        return (
            <Grid container rowSpacing={1}>
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
                                    <Tooltip enterDelay={600} title={chrome.i18n.getMessage('interactiveModeTooltip')}>
                                        <IconButton
                                            color={this.state.interactiveModeEnabled ? 'primary' : 'default'}
                                            onClick={() => this.toggleInteractiveMode()}
                                            disabled={this.props.autoImportEnabled || !this.props.canInteract || !this.props.currentIsActiveDomain()}
                                        >
                                            <HighlightAltIcon />
                                        </IconButton>
                                    </Tooltip>
                                </InputAdornment>
                            )
                        }}
                    />
                </Grid>
            </Grid>
        );
    }
}

const hideOptions: ModeOption[] = [
    {
        icon: <CodeOffIcon sx={{ fontSize: '1.4rem' }} />,
        text: chrome.i18n.getMessage('elementHideModeDescription')
    },
    {
        icon: <FontDownloadOffIcon sx={{ fontSize: '1.4rem' }} />,
        text: chrome.i18n.getMessage('textHideModeDescription')
    }
];

const searchOptions: ModeOption[] = [
    {
        icon: <KeyboardArrowDownIcon sx={{ fontSize: '1.4rem' }} />,
        text: (
            <TextWithTooltip
                text={chrome.i18n.getMessage('shallowSearch')}
                tooltipTitle={chrome.i18n.getMessage('shallowSearchModeDescription')}
            ></TextWithTooltip>
        )
    },
    {
        icon: <KeyboardDoubleArrowDownIcon sx={{ fontSize: '1.4rem' }} />,
        text: (
            <TextWithTooltip
                text={chrome.i18n.getMessage('deepSearch')}
                tooltipTitle={chrome.i18n.getMessage('deepSearchModeDescription')}
            ></TextWithTooltip>
        )
    }
];

const refreshSelector = async (
    canInteract: boolean,
    currentIsActiveDomain: () => boolean,
    getRefreshSelector: () => Promise<RefreshSelector>
) => {
    if (!canInteract) {
        return;
    }
    if (!currentIsActiveDomain()) {
        return;
    }
    const activeTab = await getActiveTabAsync();
    if (!activeTab.id) {
        return
    }

    const refreshSelector = await getRefreshSelector();
    await sendMessageToTabAsync(activeTab.id, { callee: 'setState', args: [refreshSelector] });
    sendMessageToTabAsync(activeTab.id, { callee: 'refreshSelector', args: [refreshSelector] });
}

export { SelectorPanel };