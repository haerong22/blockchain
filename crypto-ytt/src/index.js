import Caver from "caver-js";
import { Spinner } from 'spin.js';

const config = {
  rpcURL: 'https://api.baobab.klaytn.net:8651'
}
const cav = new Caver(config.rpcURL);
const yttContract = new cav.klay.Contract(DEPLOYED_ABI, DEPLOYED_ADDRESS);
const tsContract = new cav.klay.Contract(DEPLOYED_ABI_TOKENSALES, DEPLOYED_ADDRESS_TOKENSALES);

let ipfsClient = require('ipfs-http-client');
let ipfs = ipfsClient({host:'ipfs.infura.io', port:'5001', protocol:'https'})
const App = {
  auth: {
    accessType: 'keystore',
    keystore: '',
    password: ''
  },

  //#region 계정 인증
  
  start: async function () {
    const walletFromSession = sessionStorage.getItem('walletInstance');
    if(walletFromSession) {
      try {
        cav.klay.accounts.wallet.add(JSON.parse(walletFromSession));
        this.changeUI(JSON.parse(walletFromSession));
      } catch (e) {
        sessionStorage.removeItem('walletInstance');
      }
    }
  },

  handleImport: async function () {
    const fileReader = new FileReader();
    fileReader.readAsText(event.target.files[0]);
    fileReader.onload = (event) => {
      try {
        if(!this.checkValidKeystore(event.target.result)) {
          $('#message').text('유효하지 않은 keystore 파일입니다.');
          return;
        }
        this.auth.keystore = event.target.result;
        $('#message').text('keystore 통과. 비밀번호를 입력하세요.');
        document.querySelector('#input-password').focus();
      } catch (event) {
        $('#message').text('유효하지 않은 keystore 파일입니다.');
        return;
      }
    }
  },

  handlePassword: async function () {
    this.auth.password = event.target.value;
  },

  handleLogin: async function () {
    if(this.auth.accessType === 'keystore') {
      try {
        const privateKey = cav.klay.accounts.decrypt(this.auth.keystore, this.auth.password).privateKey;
        this.integrateWallet(privateKey);
      } catch (e) {
        $('#message').text('비밀번호가 일치하지 않습니다.');
      }
    }
  },

  handleLogout: async function () {
    this.removeWallet();
    location.reload();
  }, 

  getWallet: function () {
    if(cav.klay.accounts.wallet.length) {
      return cav.klay.accounts.wallet[0];
    }
  },

  checkValidKeystore: function (keystore) {
    const parsedKeystore = JSON.parse(keystore);
    const isValidKeystore = 
      parsedKeystore.version &&
      parsedKeystore.id &&
      parsedKeystore.address &&
      parsedKeystore.keyring;

    return isValidKeystore;
  },

  integrateWallet: function (privateKey) {
    const walletInstance = cav.klay.accounts.privateKeyToAccount(privateKey);
    cav.klay.accounts.wallet.add(walletInstance);
    sessionStorage.setItem('walletInstance', JSON.stringify(walletInstance));
    this.changeUI(walletInstance);
  },

  reset: function () {
    this.auth = {
      keystore: '',
      password: ''
    }
  },

  changeUI: async function (walletInstance) {
    $('#loginModal').modal('hide');
    $("#login").hide();
    $('#logout').show();
    $('.afterLogin').show();
    $('#address').append('<br>' + '<p>' + '내 계정 주소: ' + walletInstance.address + '</p>');  
    
    await this.displayMyTokensAndSale(walletInstance);
    await this.displayAllTokens(walletInstance);
    await this.checkApproval(walletInstance);
  },

  removeWallet: function () {
    cav.klay.accounts.wallet.clear();
    sessionStorage.removeItem('walletInstance');
    this.reset();
  },

  showSpinner: function () {
    let target = document.getElementById("spin");
    return new Spinner(opts).spin(target);
  },
  //#endregion

  checkTokenExists: async function () {   
    let videoId = $('#video-id').val();
    let result = await this.isTokenAlreadyCreated(videoId);

    if(result) {
      $('#t-message').text('이미 토큰화된 썸네일 입니다.');
    } else {
      $('#t-message').text('토큰화 가능한 썸네일 입니다..');
      $('.btn-create').prop("disabled", false);
    }
  },

  createToken: async function () {   
    let spinner = this.showSpinner();

    let videoId = $('#video-id').val();
    let title = $('#title').val();
    let author = $('#author').val();
    let dateCreated = $('#date-created').val();

    if(!videoId || !title || !author || !dateCreated) {
      spinner.stop();
      return;
    }

    try {
      const metadata = this.getERC721MetadataSchema(videoId, title, `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
      let res = await ipfs.add(Buffer.from(JSON.stringify(metadata)));
      await this.mintYTT(videoId, author, dateCreated, res[0].hash);
    } catch (err) {
      console.log(err);
    }
  },  

  mintYTT: async function (videoId, author, dateCreated, hash) {    
    const sender = this.getWallet();
    const feePayer = cav.klay.accounts.wallet.add('0x8c6bf2f94cf942dd94c2f2071a60ff0b136b1d5250d5a863bc47989d2e838e2c')

    const { rawTransaction: senderRawTransaction } = await cav.klay.accounts.signTransaction({
      type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
      from: sender.address,
      to: DEPLOYED_ADDRESS,
      data: yttContract.methods.mintYTT(videoId, author, dateCreated, "https://ipfs.infura.io/ipfs/" + hash).encodeABI(),
      gas: '500000',
      value: cav.utils.toPeb('0', 'KLAY'),
    }, sender.privateKey)
    
    cav.klay.sendTransaction({
      senderRawTransaction: senderRawTransaction,
      feePayer: feePayer.address,
    })
    .then((receipt) => {
      if (receipt.transactionHash) {
        console.log("https://ipfs.infura.io/ipfs/" + hash);
        alert(receipt.transactionHash);
        location.reload();
      }
    });
  },    
  
  displayMyTokensAndSale: async function (walletInstance) {       
    let balance = parseInt(await this.getBalanceOf(walletInstance.address));

    if (balance === 0) {
      $('#myTokens').text("현재 보유한 토큰이 없습니다.");
    } else {
      let isApproved = await this.isApprovedForAll(walletInstance.address, DEPLOYED_ADDRESS_TOKENSALES)
      for (let i = 0; i < balance; i++) {
        (async () => {
          let tokenId = await this.getTokenOfOwnerByIndex(walletInstance.address, i);
          let tokenUri = await this.getTokenUri(tokenId);
          let ytt = await this.getYTT(tokenId);
          let metadata = await this.getMetadata(tokenUri);
          let price = await this.getTokenPrice(tokenId);
          this.renderMyTokens(tokenId, ytt, metadata, isApproved, price);
          if (parseInt(price) > 0) {
            this.renderMyTokensSale(tokenId, ytt, metadata, price);
          }
        })();        
      }
    }
  },   

  displayAllTokens: async function (walletInstance) {   
    let totalSupply = parseInt(await this.getTotalSupply());

    if (totalSupply === 0) {
      $('#allTokens').text("현재 발행된 토큰이 없습니다.");
    } else {
      for (let i = 0; i < totalSupply; i++) {
        (async () => {
          let tokenId = await this.getTokenByIndex(i);
          let tokenUri = await this.getTokenUri(tokenId);
          let ytt = await this.getYTT(tokenId);
          let metadata = await this.getMetadata(tokenUri);
          let price = await this.getTokenPrice(tokenId);
          let owner = await this.getOwnerOf(tokenId);
          this.renderAllTokens(tokenId, ytt, metadata, price, owner, walletInstance);
        })();          
      }
    }
  },
   
  renderMyTokens: function (tokenId, ytt, metadata, isApproved, price) {    
    let tokens = $('#myTokens');
    let template = $('#MyTokensTemplate');
    
    this.getBasicTemplate(template, tokenId, ytt, metadata)

    if (isApproved) {
      if (parseInt(price) > 0) {
        template.find('.sell-token').hide();
      } else {
        template.find('.sell-token').show();
      }
    }

    tokens.append(template.html());
  },

  renderMyTokensSale: function (tokenId, ytt, metadata, price) { 
    let tokens = $('#myTokensSale');
    let template = $('#MyTokensSaleTemplate');
    
    this.getBasicTemplate(template, tokenId, ytt, metadata)
    
    template.find('.on-sale').text(cav.utils.fromPeb(price, 'KLAY') + " KLAY에 판매중");
    tokens.append(template.html());
  },

  renderAllTokens: function (tokenId, ytt, metadata, price, owner, walletInstance) {   
    let tokens = $('#allTokens');
    let template = $('#AllTokensTemplate');
    
    this.getBasicTemplate(template, tokenId, ytt, metadata)

    if (parseInt(price) > 0) {
      template.find('.buy-token').show();
      template.find('.token-price').text(cav.utils.fromPeb(price, 'KLAY') + "KLAY");
      if (owner.toUpperCase() === walletInstance.address.toUpperCase()) {
        template.find('.btn-buy').attr('disabled', true);
      } else {
        template.find('.btn-buy').attr('disabled', false);
      }
    } else {
      template.find('.buy-token').hide();
    }
    tokens.append(template.html());
  },    

  approve: function () {
    this.showSpinner();
    const walletInstance = this.getWallet();

    yttContract.methods.setApprovalForAll(DEPLOYED_ADDRESS_TOKENSALES, true).send({
      from: walletInstance.address,
      gas: '250000',
    })
    .then((receipt) => {
      if (receipt.transactionHash) {
        location.reload();
      }
    });
  },

  cancelApproval: async function () {
    this.showSpinner();
    const walletInstance = this.getWallet();

    const receipt = await yttContract.methods.setApprovalForAll(DEPLOYED_ADDRESS_TOKENSALES, false).send({
      from: walletInstance.address,
      gas: '250000',
    });

    if (receipt.transactionHash) {
      await this.onCancelApprovalSuccess(walletInstance);
      location.reload();
    }
  },

  checkApproval: async function(walletInstance) {
    let isApproved = await this.isApprovedForAll(walletInstance.address, DEPLOYED_ADDRESS_TOKENSALES);
    if (isApproved) {
      $('#approve').hide();
    } else {
      $('#cancelApproval').hide();
    }
  },

  sellToken: async function (button) {    
    let divInfo = $(button).closest('.panel-primary');
    let tokenId = divInfo.find('.panel-heading').text();
    let amount = divInfo.find('.amount').val();

    if (amount <= 0) {
      return;
    }

    try {
      let spinner = this.showSpinner();

      const sender = this.getWallet();
      const feePayer = cav.klay.accounts.wallet.add('0x8c6bf2f94cf942dd94c2f2071a60ff0b136b1d5250d5a863bc47989d2e838e2c')

      const { rawTransaction: senderRawTransaction } = await cav.klay.accounts.signTransaction({
        type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
        from: sender.address,
        to: DEPLOYED_ADDRESS_TOKENSALES,
        data: tsContract.methods.setForSale(tokenId, cav.utils.toPeb(amount, 'KLAY')).encodeABI(),
        gas: '500000',
        value: cav.utils.toPeb('0', 'KLAY'),
      }, sender.privateKey)
      
      cav.klay.sendTransaction({
        senderRawTransaction: senderRawTransaction,
        feePayer: feePayer.address,
      })
      .then((receipt) => {
        if (receipt.transactionHash) {
          alert(receipt.transactionHash);
          location.reload();
        }
      });
    } catch (err) {
      console.error(err);
      spinner.stop();
    }
  },

  buyToken: async function (button) {
    let divInfo = $(button).closest('.panel-primary');
    let tokenId = divInfo.find('.panel-heading').text();
    let price = await this.getTokenPrice(tokenId);

    if (price <= 0) {
      return;
    }

    try {
      let spinner = this.showSpinner();

      const sender = this.getWallet();
      const feePayer = cav.klay.accounts.wallet.add('0x8c6bf2f94cf942dd94c2f2071a60ff0b136b1d5250d5a863bc47989d2e838e2c')

      const { rawTransaction: senderRawTransaction } = await cav.klay.accounts.signTransaction({
        type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
        from: sender.address,
        to: DEPLOYED_ADDRESS_TOKENSALES,
        data: tsContract.methods.purchaseToken(tokenId).encodeABI(),
        gas: '500000',
        value: price,
      }, sender.privateKey)
      
      cav.klay.sendTransaction({
        senderRawTransaction: senderRawTransaction,
        feePayer: feePayer.address,
      })
      .then((receipt) => {
        if (receipt.transactionHash) {
          alert(receipt.transactionHash);
          location.reload();
        }
      });
    } catch (err) {
      console.error(err);
      spinner.stop();
    }
  },

  onCancelApprovalSuccess: async function (walletInstance) {
    let balance = parseInt(await this.getBalanceOf(walletInstance.address));

    if (balance > 0) {
      let tokensOnSale = [];
      for (let i = 0; i < balance; i++) {
        let tokenId = await this.getTokenOfOwnerByIndex(walletInstance.address, i);
        let price = await this.getTokenPrice(tokenId);

        if (parseInt(price) > 0) {
          tokensOnSale.push(tokenId);
        }
      }

      if (tokensOnSale.length > 0) {
        const receipt = await tsContract.methods.removeTokenOnSale(tokensOnSale).send({
          from: walletInstance.address,
          gas: '250000',
        });

        if (receipt.transactionHash) {
          alert(receipt.transactionHash);
        }
      }
    }
  },     

  isTokenAlreadyCreated: async function (videoId) {
    return await yttContract.methods.isTokenAlreadyCreated(videoId).call();
  },

  getERC721MetadataSchema: function (videoId, title, imgUrl) {
    return {
      "title": "Asset Metadata",
      "type": "object",
      "properties": {
        "name": {
            "type": "string",
            "description": videoId
        },
        "description": {
            "type": "string",
            "description": title
        },
        "image": {
            "type": "string",
            "description": imgUrl
        }
      }
    } 
  },

  getBalanceOf: async function (address) {
    return await yttContract.methods.balanceOf(address).call();
  },

  getTokenOfOwnerByIndex: async function (address, index) {
    return await yttContract.methods.tokenOfOwnerByIndex(address, index).call();
  },

  getTokenUri: async function (tokenId) {
    return await yttContract.methods.tokenURI(tokenId).call();
  },

  getYTT: async function (tokenId) {
    return await yttContract.methods.getYTT(tokenId).call();
  },

  getMetadata: function (tokenUri) {
    return new Promise((resolve) => {
      $.getJSON(tokenUri, data => {
        resolve(data);
      })
    })
  },

  getTotalSupply: async function () {
    return await yttContract.methods.totalSupply().call();
  },

  getTokenByIndex: async function (index) {
    return await yttContract.methods.tokenByIndex(index).call();
  },  

  isApprovedForAll: async function (owner, operator) {
    return await yttContract.methods.isApprovedForAll(owner, operator).call();
  },  

  getTokenPrice: async function (tokenId) {
    return await tsContract.methods.tokenPrice(tokenId).call();
  },  

  getOwnerOf: async function (tokenId) {
    return await yttContract.methods.ownerOf(tokenId).call();
  },

  getBasicTemplate: function(template, tokenId, ytt, metadata) {  
    template.find('.panel-heading').text(tokenId);
    template.find('img').attr('src', metadata.properties.image.description);
    template.find('img').attr('title', metadata.properties.description.description);
    template.find('.video-id').text(metadata.properties.name.description);
    template.find('.author').text(ytt[0]);
    template.find('.date-created').text(ytt[1]);
  }
};

window.App = App;

window.addEventListener("load", function () {
  App.start(); 
  $("#tabs").tabs().css({'overflow': 'auto'});
});

var opts = {
  lines: 10, // The number of lines to draw
  length: 30, // The length of each line
  width: 17, // The line thickness
  radius: 45, // The radius of the inner circle
  scale: 1, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  color: '#5bc0de', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: 'spinner-line-fade-quick', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  className: 'spinner', // The CSS class to assign to the spinner
  top: '50%', // Top position relative to parent
  left: '50%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  position: 'absolute' // Element positioning
};