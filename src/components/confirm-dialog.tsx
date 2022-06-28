import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";

interface ConfirmDialogProps {
    title: string;
    content: React.ReactNode;
    open: boolean;
    setOpen(open: boolean): void;
    callback(): void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
    const handleClose = () => {
        props.setOpen(false);
    };

    const agree = async () => {
        props.callback();
        handleClose();
    };

    return (
        <Dialog
            open={props.open}
            onClose={handleClose}
        >
            <DialogTitle>
                {props.title}
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {props.content}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{chrome.i18n.getMessage('cancel')}</Button>
                <Button onClick={agree} autoFocus>OK</Button>
            </DialogActions>
        </Dialog>
    );
}