import React, { useState } from 'react';
import { Contract, BrowserProvider, formatUnits } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config';
import './App.css';

const Quest = () => {
    const [userAddress, setUserAddress] = useState("");
    const [inputAddress, setInputAddress] = useState("");
    const [status, setStatus] = useState("");

    // Function to connect or switch wallet
    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const provider = new BrowserProvider(window.ethereum);
                const accounts = await provider.send("eth_requestAccounts", []);
                setUserAddress(accounts[0]);
                setStatus(""); // Clear any status when switching accounts
            } catch (error) {
                console.error("Error connecting wallet:", error);
            }
        } else {
            alert("MetaMask not detected. Please install MetaMask to connect.");
        }
    };

    // Function to handle switching wallets by resetting the account
    const handleSwitchWallet = async () => {
      try {
          // Clear the current address
          setUserAddress("");
  
          // Force MetaMask to open the account selection modal
          const provider = new BrowserProvider(window.ethereum);
          const accounts = await provider.send("wallet_requestPermissions", [
              { eth_accounts: {} }
          ]);
          console.log(accounts); 
          connectWallet();
      } catch (error) {
          console.error("Error switching wallet:", error);
          setStatus("An error occurred. Please try again.");
      }
    };

    // Function to check quest eligibility
    const checkQuestEligibility = async (addressToCheck) => {
        if (!addressToCheck || !/^(0x)?[0-9a-fA-F]{40}$/.test(addressToCheck)) {
            setStatus("Please enter a valid wallet address.");
            return;
        }

        try {
            const provider = new BrowserProvider(window.ethereum);
            const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

            // Check token balance
            const balance = await contract.balanceOf(addressToCheck);
            const formattedBalance = parseFloat(formatUnits(balance, 18));
            const hasSufficientBalance = formattedBalance >= 10000;

            // Check transfer count in the last 1000 blocks
            const currentBlock = await provider.getBlockNumber();
            const filter = contract.filters.Transfer(addressToCheck, null);
            const events = await contract.queryFilter(filter, currentBlock - 1000, currentBlock);
            const transferCount = events.length;
            const hasSufficientTransfers = transferCount >= 5;

            // Determine eligibility and set detailed status
            if (hasSufficientBalance && hasSufficientTransfers) {
                setStatus(`Address ${addressToCheck} is eligible for the quest!`);
            } else {
                let failureReason = `Address ${addressToCheck} is not eligible for the quest due to:`;
                if (!hasSufficientBalance) {
                    failureReason += `\n- Insufficient balance (requires 10,000 tokens, has ${formattedBalance})`;
                }
                if (!hasSufficientTransfers) {
                    failureReason += `\n- Insufficient transfer count (requires 5 transfers, has ${transferCount})`;
                }
                setStatus(failureReason);
            }
        } catch (error) {
            console.error("Error checking eligibility:", error);
            setStatus("An error occurred. Please try again.");
        }
    };

    const handleConnectedWalletCheck = () => {
        if (!userAddress) {
            setStatus("Please connect your wallet first.");
            return;
        }
        checkQuestEligibility(userAddress);
    };

    const handleInputAddressCheck = (e) => {
        e.preventDefault();
        checkQuestEligibility(inputAddress);
    };

    return (
        <div className="container">
            <h2>Check Quest Eligibility</h2>

            {/* Connect or Switch MetaMask Wallet */}
            <button onClick={connectWallet}>
                {userAddress ? `Connected: ${userAddress}` : "Connect Wallet"}
            </button>
            {userAddress && (
                <button onClick={handleSwitchWallet} style={{ marginTop: '0.5rem', backgroundColor: '#28a745' }}>
                    Switch Wallet
                </button>
            )}

            {/* Check Eligibility for Connected Wallet */}
            <button onClick={handleConnectedWalletCheck} disabled={!userAddress} style={{ marginTop: '1rem' }}>
                Check Eligibility for Connected Wallet
            </button>

            {/* Form to Enter Any Address Manually */}
            <form onSubmit={handleInputAddressCheck} style={{ marginTop: '1rem' }}>
                <input
                    type="text"
                    placeholder="Enter any wallet address"
                    value={inputAddress}
                    onChange={(e) => setInputAddress(e.target.value)}
                />
                <button type="submit">Check Eligibility for Entered Address</button>
            </form>

            <p className={status.includes("eligible") ? "status-success" : "status-failure"}>{status}</p>
        </div>
    );
};

export default Quest;
