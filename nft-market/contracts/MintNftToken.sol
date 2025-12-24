// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MintNftToken is ERC721Enumerable, ReentrancyGuard {
    uint256 private _tokenIdCounter;

    constructor() ERC721("iki", "NFT_symbol") {}

    mapping(uint256 => string) public tokenURIs;

    struct NftTokenData {
        uint256 nftTokenId;
        string nftTokenURI;
    }

    // 이벤트 정의
    event NFTMinted(
        address indexed owner,
        uint256 indexed tokenId,
        string tokenURI
    );

    // tokenURI 오버라이드
    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        require(bytes(tokenURIs[_tokenId]).length > 0, "Token does not exist");
        return tokenURIs[_tokenId];
    }

    // NFT 민팅
    function mintNFT(string memory _tokenURI) public returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        tokenURIs[tokenId] = _tokenURI;
        _mint(msg.sender, tokenId);

        emit NFTMinted(msg.sender, tokenId, _tokenURI);
        return tokenId;
    }

    // 특정 주소가 소유한 NFT 목록 조회
    function getNftTokens(
        address _nftTokenOwner
    ) public view returns (NftTokenData[] memory) {
        uint256 balanceLength = balanceOf(_nftTokenOwner);
        NftTokenData[] memory nftTokenData = new NftTokenData[](balanceLength);

        for (uint256 i = 0; i < balanceLength; i++) {
            uint256 nftTokenId = tokenOfOwnerByIndex(_nftTokenOwner, i);
            string memory nftTokenURI = tokenURI(nftTokenId);
            nftTokenData[i] = NftTokenData(nftTokenId, nftTokenURI);
        }

        return nftTokenData;
    }
}
