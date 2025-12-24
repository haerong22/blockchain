// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MintNftToken is ERC721Enumerable, ReentrancyGuard {
    uint256 private _tokenIdCounter;

    constructor() ERC721("iki", "NFT_symbol") {}

    mapping(uint256 => string) public tokenURIs;
    mapping(uint256 => uint256) public nftTokenPrices;
    uint256[] public onSaleNftTokenArray;

    // 이벤트 정의
    event NFTMinted(
        address indexed owner,
        uint256 indexed tokenId,
        string tokenURI
    );
    event NFTListed(
        uint256 indexed tokenId,
        uint256 price,
        address indexed seller
    );

    struct NftTokenData {
        uint256 nftTokenId;
        string nftTokenURI;
        uint256 price;
    }

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
            uint256 tokenPrice = getNftTokenPrice(nftTokenId);
            nftTokenData[i] = NftTokenData(nftTokenId, nftTokenURI, tokenPrice);
        }

        return nftTokenData;
    }

    // 판매 등록
    function setSaleNftToken(uint256 _tokenId, uint256 _price) public {
        address nftTokenOwner = ownerOf(_tokenId);

        require(nftTokenOwner == msg.sender, "Caller is not nft token owner");
        require(_price > 0, "Price must be greater than zero");
        require(
            nftTokenPrices[_tokenId] == 0,
            "This nft token is already on sale"
        );
        require(
            isApprovedForAll(nftTokenOwner, address(this)) ||
                getApproved(_tokenId) == address(this),
            "Contract not approved to transfer token"
        );

        nftTokenPrices[_tokenId] = _price;
        onSaleNftTokenArray.push(_tokenId);

        emit NFTListed(_tokenId, _price, msg.sender);
    }

    // 판매 중인 NFT 목록 조회
    function getSaleNftTokens() public view returns (NftTokenData[] memory) {
        uint256[] memory onSaleNftToken = getSaleNftToken();
        NftTokenData[] memory onSaleNftTokens = new NftTokenData[](
            onSaleNftToken.length
        );

        for (uint256 i = 0; i < onSaleNftToken.length; i++) {
            uint256 tokenId = onSaleNftToken[i];
            uint256 tokenPrice = getNftTokenPrice(tokenId);
            onSaleNftTokens[i] = NftTokenData(
                tokenId,
                tokenURI(tokenId),
                tokenPrice
            );
        }

        return onSaleNftTokens;
    }

    // 판매 중인 토큰 ID 배열 반환
    function getSaleNftToken() public view returns (uint256[] memory) {
        return onSaleNftTokenArray;
    }

    // NFT 가격 조회
    function getNftTokenPrice(uint256 _tokenId) public view returns (uint256) {
        return nftTokenPrices[_tokenId];
    }

    // 현재 토큰 ID 카운터 조회 (디버깅용)
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter;
    }
}
