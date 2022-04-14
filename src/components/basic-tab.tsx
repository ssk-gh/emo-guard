import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { TargetPanel } from './target-panel';
import { KeywordPanel } from './keyword-panel';
import BlockIcon from '@mui/icons-material/Block';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import { CssSelector, Site } from '../App';

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
    setKeywords(keywords: string[]): void;
    setSelectors(selectors: CssSelector[]): void;
    setSites(sites: Site[]): void;
    setCurrentSite(site: Site): void;
    setCurrentSiteIndex(index: number): void;
    getJoinedSelector(): string;
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
                <Tabs value={value} onChange={handleChange} variant="fullWidth" aria-label="basic tabs example">
                    <Tab icon={<FindInPageIcon />} {...a11yProps(0)} />
                    <Tab icon={<BlockIcon />} {...a11yProps(1)} />
                </Tabs>
            </Box>
            <TabPanel value={value} index={0}>
                <TargetPanel
                    sites={props.sites}
                    currentSite={props.sites[props.currentSiteIndex]}
                    currentSiteIndex={props.currentSiteIndex}
                    keywords={props.keywords}
                    activeDomain={props.activeDomain}
                    setCurrentSite={props.setCurrentSite}
                    setCurrentSiteIndex={props.setCurrentSiteIndex}
                    setSelectors={props.setSelectors}
                    getJoinedSelector={props.getJoinedSelector}
                    currentIsActiveDomain={props.currentIsActiveDomain}
                ></TargetPanel>
            </TabPanel>
            <TabPanel value={value} index={1}>
                <KeywordPanel
                    keywords={props.keywords}
                    currentSite={props.sites[props.currentSiteIndex]}
                    setKeywords={props.setKeywords}
                ></KeywordPanel>
            </TabPanel>
        </Box>
    );
}