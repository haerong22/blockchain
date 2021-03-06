package com.example.artcoin.repository;

import com.example.artcoin.blockchain.ArtChain;
import com.example.artcoin.core.*;
import com.example.artcoin.exception.ArtChainException;
import com.example.artcoin.utils.StringUtil;
import org.springframework.stereotype.Repository;

import javax.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;

@Repository
public class WalletRepository {

    private static final Map<String, Wallet> walletList = new HashMap<>();
    public static final Wallet coinbase = new Wallet();
    public static final Wallet admin = new Wallet();

    // 초기값 새성
    @PostConstruct
    public void init() {

        //유저1, 유저2 지갑 생성
        Wallet user1 = new Wallet();
        Wallet user2 = new Wallet();

        // 지갑리스트에 저장
        walletList.put(StringUtil.getStringFromKey(coinbase.publicKey), coinbase);
        walletList.put(StringUtil.getStringFromKey(admin.publicKey), admin);
        walletList.put(StringUtil.getStringFromKey(user1.publicKey), user1);
        walletList.put(StringUtil.getStringFromKey(user2.publicKey), user2);
        System.out.println("admin.publicKey = " + StringUtil.getStringFromKey(admin.publicKey));
        System.out.println("user1.publicKey = " + StringUtil.getStringFromKey(user1.publicKey));
        System.out.println("user2.publicKey = " + StringUtil.getStringFromKey(user2.publicKey));

        // 최초 트랜잭션 생성
        Transaction genesisTransaction = new Transaction(coinbase.publicKey, admin.publicKey, 1000f, null, "1000");
        genesisTransaction.generateSignature(coinbase.privateKey);
        genesisTransaction.transactionId = "0";
        genesisTransaction.outputs.add(new TransactionOutput(genesisTransaction.reciepient, genesisTransaction.value, genesisTransaction.transactionId, genesisTransaction.artId));

        // 최초 블록 생성
        ArtChain.UTXOs.put(genesisTransaction.outputs.get(0).id, genesisTransaction.outputs.get(0));
        Block genesis = new Block("0");
        if (genesis.addTransaction(genesisTransaction)) {
            ArtChain.addBlock(genesis);
        } else {
            throw new ArtChainException("first block generated fail");
        }

        Block block = new Block(genesis.hash);
        // 어드민 -> 유저1  코인 전송 value : 100 , artId : 1000
        Transaction transaction = admin.sendFunds(user1.publicKey, 100f, "1000");
        block.addTransaction(transaction);
        // 어드민 -> 유저2  코인 전송 value : 200 , artId : 1000
        Transaction transaction2 = admin.sendFunds(user2.publicKey, 200f, "1000");
        block.addTransaction(transaction2);

        // 블럭 추가
        ArtChain.addBlock(block);
    }

    // 지갑 생성
    public Wallet createWallet() {
        Wallet wallet = new Wallet();
        walletList.put(StringUtil.getStringFromKey(wallet.publicKey), wallet);
        return wallet;
    }

    // 지갑 조회
    public Wallet findWallet(String wallet) {
        return walletList.get(wallet);
    }
}
