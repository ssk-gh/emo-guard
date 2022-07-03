import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";

interface ConfirmDialogProps {
    title: string;
    content: React.ReactNode;
    okButton?: React.ReactNode;
    open: boolean;
    setOpen(open: boolean): void;
    okCallback?(): void;
    closeCallback?(): void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
    const handleClose = () => {
        if (props.closeCallback) {
            props.closeCallback();
        }
        props.setOpen(false);
    };

    const agree = async () => {
        if (props.okCallback) {
            props.okCallback();
        }
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
                {
                    props.okButton
                        ? props.okButton
                        : <Button onClick={agree} autoFocus>OK</Button>
                }
            </DialogActions>
        </Dialog>
    );
}