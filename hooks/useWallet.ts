'use client';

import { useState, useEffect, useCallback } from 'react';
import { requestAccess, getAddress } from '@stellar/freighter-api';

interface WalletState {
  address: string | null;
  walletType: 'freighter' | 'sandbox' | null;
  balance: string | null;
  secretKey: string | null; // only for sandbox
  isLoading: boolean;
  error: string | null;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    walletType: null,
    balance: null,
    secretKey: null,
    isLoading: false,
    error: null,
  });

  // Load sandbox keypair if it exists in localStorage
  useEffect(() => {
    const savedType = localStorage.getItem('stellar_wallet_type') as 'freighter' | 'sandbox' | null;
    const savedAddress = localStorage.getItem('stellar_wallet_address');
    const savedSecret = localStorage.getItem('stellar_wallet_secret');

    if (savedType === 'sandbox' && savedAddress && savedSecret) {
      setWallet(prev => ({
        ...prev,
        address: savedAddress,
        walletType: 'sandbox',
        secretKey: savedSecret,
      }));
      fetchBalance(savedAddress);
    } else if (savedType === 'freighter') {
      // Reconnect Freighter if still authorized
      getAddress().then(res => {
        if (res && res.address) {
          setWallet(prev => ({
            ...prev,
            address: res.address,
            walletType: 'freighter',
          }));
          fetchBalance(res.address);
        }
      }).catch(() => {
        // Ignored
      });
    }
  }, []);

  const fetchBalance = async (address: string) => {
    try {
      const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
      if (response.ok) {
        const data = await response.json();
        const nativeBalance = data.balances.find((b: any) => b.asset_type === 'native');
        if (nativeBalance) {
          setWallet(prev => ({ ...prev, balance: Number(nativeBalance.balance).toFixed(2) }));
          return;
        }
      }
      // Set default balance if account doesn't exist on ledger yet
      setWallet(prev => ({ ...prev, balance: '0.00' }));
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const fundSandbox = async (address: string) => {
    try {
      const response = await fetch(`https://friendbot.stellar.org?addr=${address}`);
      if (response.ok) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // wait for ledger sync
        await fetchBalance(address);
        return true;
      }
    } catch (err) {
      console.error('Error funding sandbox:', err);
    }
    return false;
  };

  const connect = useCallback(async (type: 'freighter' | 'sandbox') => {
    setWallet(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (type === 'freighter') {
        const isFreighterConnected = await requestAccess();
        if (isFreighterConnected) {
          const res = await getAddress();
          if (res && res.address) {
            const pubKey = res.address;
            setWallet({
              address: pubKey,
              walletType: 'freighter',
              balance: '0.00',
              secretKey: null,
              isLoading: false,
              error: null,
            });
            localStorage.setItem('stellar_wallet_type', 'freighter');
            localStorage.setItem('stellar_wallet_address', pubKey);
            localStorage.removeItem('stellar_wallet_secret');
            fetchBalance(pubKey);
          } else {
            throw new Error(res?.error || 'Could not retrieve public key from Freighter.');
          }
        } else {
          throw new Error('Freighter access denied. Please ensure the extension is installed and unlocked.');
        }
      } else {
        // Sandbox wallet creation
        // Dynamically import StellarSdk to avoid SSR issues
        const { Keypair } = await import('stellar-sdk');
        
        // Generate new keypair or reload existing
        let secret = localStorage.getItem('stellar_wallet_secret');
        let pair;
        if (secret) {
          pair = Keypair.fromSecret(secret);
        } else {
          pair = Keypair.random();
          secret = pair.secret();
        }

        const address = pair.publicKey();

        setWallet({
          address,
          walletType: 'sandbox',
          balance: '0.00',
          secretKey: secret,
          isLoading: false,
          error: null,
        });

        localStorage.setItem('stellar_wallet_type', 'sandbox');
        localStorage.setItem('stellar_wallet_address', address);
        localStorage.setItem('stellar_wallet_secret', secret);

        // Fetch balance, if 0, attempt funding via friendbot
        await fetchBalance(address);
        
        // Auto fund if account is new
        const checkResp = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
        if (!checkResp.ok) {
          setWallet(prev => ({ ...prev, isLoading: true }));
          const funded = await fundSandbox(address);
          if (funded) {
            setWallet(prev => ({ ...prev, isLoading: false }));
          } else {
            setWallet(prev => ({
              ...prev,
              isLoading: false,
              error: 'Failed to fund Sandbox wallet with Friendbot. Using offline sandbox mode.',
            }));
          }
        }
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setWallet(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to connect wallet.',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      walletType: null,
      balance: null,
      secretKey: null,
      isLoading: false,
      error: null,
    });
    localStorage.removeItem('stellar_wallet_type');
    localStorage.removeItem('stellar_wallet_address');
    localStorage.removeItem('stellar_wallet_secret');
  }, []);

  const refreshBalance = useCallback(async () => {
    if (wallet.address) {
      await fetchBalance(wallet.address);
    }
  }, [wallet.address]);

  return {
    ...wallet,
    connect,
    disconnect,
    refreshBalance,
    fundSandbox: async () => {
      if (wallet.walletType === 'sandbox' && wallet.address) {
        return await fundSandbox(wallet.address);
      }
      return false;
    }
  };
}
