import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { TargetPanel } from './target-panel';
import { KeywordPanel } from './keyword-panel';
import BlockIcon from '@mui/icons-material/Block';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { Site, CssSelector, RefreshSelector } from '../types';

interface BasicTabsProps {
    keywords: string[];
    sites: Site[];
    currentSiteIndex: number;
    activeDomain: string;
    autoImportEnabled: boolean;
    alwaysShowKeywords: boolean;
    canInteract: boolean;
    setKeywords(keywords: string[]): Promise<void>;
    setSelectors(selectors: CssSelector[]): Promise<void>;
    setSites(sites: Site[]): void;
    setCurrentSite(site: Site): void;
    setCurrentSiteIndex(index: number): void;
    setAutoImportEnabled(autoImportEnabled: boolean): void;
    getRefreshSelector(): Promise<RefreshSelector>;
    currentIsActiveDomain(): boolean;
}

export default function BasicTabs(props: BasicTabsProps) {
    const [value, setValue] = React.useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={value} onChange={handleChange} aria-label="tabs">
                    <Tab icon={<FindInPageIcon />} {...a11yProps(0)} />
                    <Tab icon={<BlockIcon />} {...a11yProps(1)} />
                    <MoreVertMenu></MoreVertMenu>
                </Tabs>
            </Box>
            <TabPanel value={value} index={0}>
                <TargetPanel
                    {...props}
                    currentSite={props.sites[props.currentSiteIndex]}
                ></TargetPanel>
            </TabPanel>
            <TabPanel value={value} index={1}>
                <KeywordPanel
                    {...props}
                    currentSite={props.sites[props.currentSiteIndex]}
                ></KeywordPanel>
            </TabPanel>
        </Box>
    );
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `tab-${index}`,
        'aria-controls': `tabpanel-${index}`,
    };
}

function MoreVertMenu() {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <Box marginY={'auto'} marginLeft={'auto'} marginRight={'6px'}>
            <IconButton
                id="more-vert-button"
                aria-controls={open ? 'more-vert-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
            >
                <MoreVertIcon />
            </IconButton>
            <Menu
                id="more-vert-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'more-vert-button',
                    style: {
                        padding: 0
                    }
                }}
            >
                <MenuItem onClick={() => chrome.runtime.openOptionsPage.bind(chrome.runtime)()}>
                    {chrome.i18n.getMessage('options')}
                </MenuItem>
            </Menu>
        </Box>
    );
}