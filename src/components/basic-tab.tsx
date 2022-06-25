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
import { CssSelector, Site } from '../App';
import { IconButton, Menu, MenuItem } from '@mui/material';

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
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
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
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

interface BasicTabsProps {
    keywords: string[];
    sites: Site[];
    currentSiteIndex: number;
    activeDomain: string;
    autoImportEnabled: boolean;
    setKeywords(keywords: string[]): Promise<void>;
    setSelectors(selectors: CssSelector[]): Promise<void>;
    setSites(sites: Site[]): void;
    setCurrentSite(site: Site): void;
    setCurrentSiteIndex(index: number): void;
    setAutoImportEnabled(autoImportEnabled: boolean): void;
    getRefreshSelector(): Promise<{ elementShallowHideSelector: string, elementDeepHideSelector: string, textHideSelector: string }>;
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
                <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
                    <Tab icon={<FindInPageIcon />} {...a11yProps(0)} />
                    <Tab icon={<BlockIcon />} {...a11yProps(1)} />
                    <MoreVertMenu></MoreVertMenu>
                </Tabs>
            </Box>
            <TabPanel value={value} index={0}>
                <TargetPanel
                    sites={props.sites}
                    currentSite={props.sites[props.currentSiteIndex]}
                    currentSiteIndex={props.currentSiteIndex}
                    keywords={props.keywords}
                    activeDomain={props.activeDomain}
                    autoImportEnabled={props.autoImportEnabled}
                    setCurrentSite={props.setCurrentSite}
                    setCurrentSiteIndex={props.setCurrentSiteIndex}
                    setSelectors={props.setSelectors}
                    getRefreshSelector={props.getRefreshSelector}
                    currentIsActiveDomain={props.currentIsActiveDomain}
                ></TargetPanel>
            </TabPanel>
            <TabPanel value={value} index={1}>
                <KeywordPanel
                    keywords={props.keywords}
                    currentSite={props.sites[props.currentSiteIndex]}
                    autoImportEnabled={props.autoImportEnabled}
                    setKeywords={props.setKeywords}
                ></KeywordPanel>
            </TabPanel>
        </Box>
    );
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
        <Box marginY={'auto'} marginLeft={'auto'} marginRight={'4px'}>
            <IconButton
                id="basic-button"
                aria-controls={open ? 'basic-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
            >
                <MoreVertIcon />
            </IconButton>
            <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'basic-button',
                    style: {
                        padding: 0
                    }
                }}
            >
                <MenuItem onClick={() => chrome.runtime.openOptionsPage()}>
                    {chrome.i18n.getMessage('options')}
                </MenuItem>
            </Menu>
        </Box>
    );
}