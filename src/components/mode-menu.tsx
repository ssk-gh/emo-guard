import { Tooltip, IconButton, Menu, MenuItem } from "@mui/material";
import React from "react";
import { ModeOption } from "../types";

interface ModeProps {
    options: ModeOption[];
    selected: number;
    tooltipTitle: string;
    anchorDisabled: boolean;
    menuItemDisabled: (index: number) => boolean;
    handleMenuItemClick: (event: React.MouseEvent<HTMLElement>, index: number) => void;
}

export default function ModeMenu(props: ModeProps) {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClickListItem = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuItemClick = (
        event: React.MouseEvent<HTMLElement>,
        index: number,
    ) => {
        props.handleMenuItemClick(event, index);
        setAnchorEl(null);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <>
            <Tooltip enterDelay={600} title={props.tooltipTitle}>
                <IconButton
                    edge="end"
                    aria-label="more"
                    id="mode-icon-button"
                    aria-controls={open ? 'mode-icon-menu' : undefined}
                    aria-expanded={open ? 'true' : undefined}
                    aria-haspopup="true"
                    onClick={handleClickListItem}
                    sx={{ marginRight: '-9px' }}
                    disabled={props.anchorDisabled}
                >
                    {props.options[props.selected].icon}
                </IconButton>
            </Tooltip>
            <Menu
                id="mode-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'mode-button',
                    role: 'listbox',
                    style: {
                        padding: 0
                    }
                }}
            >
                {props.options.map((option, index) => (
                    <MenuItem
                        key={index}
                        selected={index === props.selected}
                        onClick={(event) => handleMenuItemClick(event, index)}
                        disabled={props.menuItemDisabled(index)}
                    >
                        {option.icon}
                        <span style={{ marginLeft: 9 }}>{option.text}</span>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}