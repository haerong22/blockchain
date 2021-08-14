package com.example.artcoin.service;

import com.example.artcoin.blockchain.ArtChain;
import com.example.artcoin.core.Block;
import com.example.artcoin.core.Transaction;
import com.example.artcoin.core.TransactionOutput;
import com.example.artcoin.core.Wallet;
import com.example.artcoin.dto.BlockInfo;
import com.example.artcoin.dto.ReqTransaction;
import com.example.artcoin.dto.TransactionDto;
import com.example.artcoin.dto.WalletInfo;
import com.example.artcoin.repository.WalletRepository;
import com.example.artcoin.utils.StringUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ArtCoinService {

    private final WalletRepository walletRepository;

    public WalletInfo createWallet() {
        Wallet wallet = walletRepository.createWallet();
        return new WalletInfo(wallet);
    }

    public void transaction(ReqTransaction reqTransaction) {
        Wallet sendWallet = walletRepository.findWallet(reqTransaction.getSendWallet());
        Wallet receiveWallet = walletRepository.findWallet(reqTransaction.getReceiveWallet());

        Transaction transaction = sendWallet.sendFunds(receiveWallet.publicKey, reqTransaction.getValue(), reqTransaction.getArtId());
        Block block1 = new Block(ArtChain.blockchain.get(ArtChain.blockchain.size()).hash);
        System.out.println("\nWalletA's balance is: " + receiveWallet.getBalance());
        System.out.println("\nWalletA is Attempting to send funds (40) to WalletB...");
        block1.addTransaction(transaction);
        ArtChain.addBlock(block1);
        //        ArtChain.txPool.add(transaction);
    }

    public Map<String, Float> getBalance(String address) {
        Wallet wallet = walletRepository.findWallet(address);
        return wallet.getBalance();
    }

    public List<Transaction> getTransactions() {
        List<Transaction> transactions = new ArrayList<>();
        ArtChain.blockchain.forEach(block -> {
            transactions.addAll(block.transactions);
        });
        return transactions;
    }

    public List<BlockInfo> getBlocks() {
        return ArtChain.blockchain.stream().map(BlockInfo::new).collect(Collectors.toList());
    }
}
