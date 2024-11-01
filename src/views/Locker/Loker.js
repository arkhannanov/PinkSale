import React, { useState, useEffect } from 'react';
import { makeStyles } from "@material-ui/core/styles";
import GridItem from "../../components/Grid/GridItem.js";
import GridContainer from "../../components/Grid/GridContainer.js";
import Card from "../../components/Card/Card.js";
import CardHeader from "../../components/Card/CardHeader.js";
import CardBody from "../../components/Card/CardBody.js";
import CardFooter from "../../components/Card/CardFooter.js";
import CustomInput from "../../components/CustomInput/CustomInput.js";
import Button from "../../components/CustomButtons/Button.js";
import Danger from "../../components/Typography/Danger.js";
import Info from "../../components/Typography/Info.js";
import { TextField, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Box } from '@mui/material';
import { AlarmAdd as AddAlarmIcon, ForwardToInbox as ForwardToInboxIcon, Error as ErrorIcon } from '@mui/icons-material';
import { Contract, ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import coinAddressValidator from 'coin-address-validator';
import { getDefaultProvider } from "../../components/WalletConnector.js";
import { TOKENLOCK_ADDRESS, LIQUIDITYLOCK_ADDRESS, STANDARD_TOKEN_ABI, TOKEN_LOCK_ABI, LIQUIDITY_LOCK_ABI } from '../../Config/config.js';
import CardIcon from "../../components/Card/CardIcon";

const styles = {
    cardCategoryWhite: {
        color: "rgba(255,255,255,.62)",
        margin: "0",
        fontSize: "14px",
        marginTop: "0",
        marginBottom: "0",
    },
    cardTitleWhite: {
        color: "#FFFFFF",
        marginTop: "0px",
        minHeight: "auto",
        fontWeight: "300",
        fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
        marginBottom: "3px",
        textDecoration: "none",
    },
};

const useStyles = makeStyles(styles);

export default function Locker() {
    const classes = useStyles();
    const [state, setState] = useState({
        tokenbalance: '0',
        lockallowance: '0',
        tokenlockedamount: '0',
        progressFlag: false,
        transactiveFlag: false,
        erroflag: false,
        errlabel: '',
        tokenstaddr: '',
        price: '0',
        penalFee: '0',
        symbol: '',
        name: '',
        unlocktime: '0',
        approve_flag: true,
        lock_flag: true,
        unlock_flag: true,
        opendis: false,
        isToken: true,
    });

    const { account, library } = useWeb3React();

    useEffect(() => {
        if (account) getPrice();
    }, [account, library]);

    const getPrice = async () => {
        if (!account) return;

        const lockContract = createContract(state.isToken ? TOKENLOCK_ADDRESS.eth : LIQUIDITYLOCK_ADDRESS.eth, TOKEN_LOCK_ABI);

        try {
            const tprice = await lockContract.price();
            const tpenaltyfee = await lockContract.penaltyfee();
            setState(prevState => ({
                ...prevState,
                price: ethers.utils.formatUnits(tprice, 18),
                penalFee: tpenaltyfee.toString(),
            }));
        } catch (error) {
            console.error("Error getting price or penalty fee:", error);
        }
    };

    const getTokenOrLpBalance = async () => {
        if (!state.tokenstaddr || !account) {
            setState(prevState => ({ ...prevState, errlabel: "Address or account info missing", erroflag: true, }));
            return;
        }

        setState(prevState => ({ ...prevState, progressFlag: true, transactiveFlag: false, erroflag: false }));
        let balance, allowance, lockedamount, tsymbol, tname, unlocktime;
        try {
            const contract = createContract(state.tokenstaddr, STANDARD_TOKEN_ABI);
            const lockContract = createContract(state.isToken ? TOKENLOCK_ADDRESS.eth : LIQUIDITYLOCK_ADDRESS.eth, TOKEN_LOCK_ABI);

            balance = await contract.balanceOf(account);
            allowance = await contract.allowance(account, (state.isToken ? TOKENLOCK_ADDRESS.eth : LIQUIDITYLOCK_ADDRESS.eth));
            lockedamount = await lockContract.GetBalance(state.tokenstaddr);
            tsymbol = await contract.symbol();
            tname = await contract.name();
            unlocktime = await lockContract.GetUnlockTime(state.tokenstaddr);
        } catch (error) {
            setState(prevState => ({
                ...prevState,
                errlabel: 'Ошибка получения информации',
                progressFlag: false,
                erroflag: true
            }));
            return;
        }

        const date = new Date(unlocktime.toNumber() * 1000);

        setState(prevState => ({
            ...prevState,
            tokenbalance: ethers.utils.formatUnits(balance),
            lockallowance: ethers.utils.formatUnits(allowance),
            tokenlockedamount: ethers.utils.formatUnits(lockedamount),
            symbol: tsymbol,
            name: tname,
            unlocktime: date.toLocaleString('en-GB'),
            approve_flag: parseFloat(ethers.utils.formatUnits(balance)) === 0,
            lock_flag: parseFloat(ethers.utils.formatUnits(allowance)) === 0,
            unlock_flag: parseFloat(ethers.utils.formatUnits(lockedamount)) === 0,
            progressFlag: false,
            transactiveFlag: true
        }));
    };

    const createContract = (address, abi) => {
        const provider = getDefaultProvider();
        if (!coinAddressValidator.validate(address, 'eth', 'prod')) {
            throw new Error('Invalid address');
        }

        let tempContract = new Contract(address, abi, provider);

        if (library) {
            const signer = library.getSigner();
            tempContract = tempContract.connect(signer);
        }

        return tempContract;
    };

    const handleAddrChange = (addr) => {
        setState(prevState => ({ ...prevState, tokenstaddr: addr }));
        getTokenOrLpBalance(addr);
    };

    const handleDlogClose = () => setState(prevState => ({ ...prevState, opendis: false }));

    return (
        <GridContainer justifyContent="center">
            <GridItem xs={12} sm={12} md={8}>
                <Card>
                    <CardHeader color="primary">
                        <h4 className={classes.cardTitleWhite}>Locker</h4>
                        <p className={classes.cardCategoryWhite}>
                            Manage your tokens and liquidity with a single interface
                        </p>
                    </CardHeader>
                    <CardBody>
                        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                            <ForwardToInboxIcon sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
                            <TextField
                                fullWidth
                                value={state.tokenstaddr}
                                onChange={(e) => handleAddrChange(e.target.value)}
                                label="Input token or LP address"
                                variant="standard"
                            />
                        </Box>
                        {state.progressFlag && <GridContainer justifyContent="center">
                            <Box sx={{ display: 'flex' }}>
                                <CircularProgress />
                            </Box>
                        </GridContainer>}
                        {state.erroflag && (
                            <Danger>
                                <ErrorIcon />
                                {state.errlabel}
                            </Danger>
                        )}
                        {state.transactiveFlag && (
                            <div>
                                <GridContainer justifyContent="center">
                                    <GridItem xs={10} sm={10} md={4}>
                                        <p>Token Balance:</p><Danger><h3>{state.tokenbalance}</h3></Danger>
                                    </GridItem>
                                    <GridItem xs={12} sm={12} md={4}>
                                        <p>Possible Amount:</p><Danger><h3>{state.lockallowance}</h3></Danger>
                                    </GridItem>
                                    <GridItem xs={12} sm={12} md={4}>
                                        <p>Locked Amount:</p><Danger><h3>{state.tokenlockedamount}</h3></Danger>
                                    </GridItem>
                                </GridContainer>
                                <GridContainer justifyContent="center">
                                    <GridItem xs={12} sm={12} md={4}>
                                        <CustomInput
                                            labelText="Amount"
                                            id="idamount"
                                            formControlProps={{
                                                fullWidth: true,
                                            }}
                                        />
                                    </GridItem>
                                    <GridItem xs={12} sm={12} md={4}>
                                        <TextField
                                            id="idlocktime"
                                            type="datetime-local"
                                            defaultValue={new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                                            disabled={state.lock_flag}
                                            sx={{ width: 215 }}
                                            InputLabelProps={{
                                                shrink: true,
                                            }}
                                        />
                                    </GridItem>
                                </GridContainer>
                            </div>
                        )}
                    </CardBody>
                    {state.transactiveFlag && (
                        <CardFooter>
                            <Button disabled={state.approve_flag} onClick={() => { /* Handle approve logic */ }} color="primary">Approve</Button>
                            <Button disabled={state.lock_flag} onClick={() => { /* Handle lock logic */ }} color="primary">Lock</Button>
                            <Button disabled={state.unlock_flag} onClick={() => { /* Handle unlock logic */ }} color="primary">Unlock</Button>
                        </CardFooter>
                    )}
                </Card>
            </GridItem>
            <GridItem xs={12} sm={6} md={3}>
                <Card>
                    <CardHeader color="primary" stats icon>
                        <CardIcon color="success">
                            <AddAlarmIcon />
                        </CardIcon>
                    </CardHeader>
                    <CardBody>
                        <Info><small>Token:</small></Info><Danger>{state.name}({state.symbol})</Danger>
                        <br />
                        <Info><small>Fee:</small></Info><Danger>{state.price} coin</Danger>
                        <br />
                        <Info><small>PFee:</small></Info><Danger>{state.penalFee}</Danger>
                        <br />
                        <Info><small>Unlock time:</small></Info><Danger>{state.unlocktime}</Danger>
                    </CardBody>
                </Card>
            </GridItem>
            <Dialog open={state.opendis} onClose={handleDlogClose}>
                <DialogTitle>Force unlock</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Do you agree to unlock tokens by removing penalty fee?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { /* Handle panic withdraw logic */ }} color="primary">OK</Button>
                    <Button onClick={handleDlogClose} color="primary" autoFocus>Cancel</Button>
                </DialogActions>
            </Dialog>
        </GridContainer>
    );
}
