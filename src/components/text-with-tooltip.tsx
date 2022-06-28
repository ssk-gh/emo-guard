import { Stack, Typography, Tooltip, IconButton } from "@mui/material";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface TextWithTooltipProps {
    text: string;
    tooltipTitle: string;
}

export function TextWithTooltip(props: TextWithTooltipProps) {
    return (
        <Stack direction={'row'} alignItems={'center'}>
            <Typography>
                {props.text}
            </Typography>
            <Tooltip title={props.tooltipTitle}>
                <IconButton size="small" color="primary" sx={{ paddingBottom: '7px' }}>
                    <HelpOutlineIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
        </Stack>
    )
}