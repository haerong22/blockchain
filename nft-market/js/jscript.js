(function (window, $) {
  "use strict";

  const STORAGE_KEYS = {
    network: "blockChainNetwork",
  };

  // 지원 중인 테스트 네트워크와 체인 메타데이터를 정의한다.
  const NETWORK_META = {
    ETH_SEPOLIA: {
      label: "이더리움 Sepolia",
      chainIdHex: "0xaa36a7",
      chainConfig: {
        chainId: "0xaa36a7",
        addParams: {
          chainId: "0xaa36a7",
          chainName: "Ethereum Sepolia Testnet",
          rpcUrls: ["https://rpc.sepolia.org"],
          nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        },
      },
    },
    KAIA_KAIROS: {
      label: "카이아 Kairos",
      chainIdHex: "0x3e9",
      chainConfig: {
        chainId: "0x3e9",
        addParams: {
          chainId: "0x3e9",
          chainName: "Kaia Kairos Testnet",
          rpcUrls: ["https://public-en-kairos.node.kaia.io"],
          nativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 },
          blockExplorerUrls: ["https://kairos.kaiascan.io"],
        },
      },
    },
  };

  window.accounts = window.accounts || [];

  $(function () {
    registerPageNavigation();
    initNetworkSelector();
  });

  $(window).on("load", initWeb3Context);

  function registerPageNavigation() {
    $("#page_mynft_detail").on("click", function () {
      window.location.href = "./mynft_detail.html";
    });

    $("#page_mynft").on("click", function () {
      window.location.href = "./mynft.html";
    });

    $("#selectNetwork").on("change", function () {
      var selectedNetwork = $("#selectNetwork option:selected").val();
      if (!selectedNetwork) {
        alert("네트워크를 선택해주세요!");
        return;
      }

      localStorage["blockChainNetwork"] = selectedNetwork;
    });
  }

  let previousNetwork = localStorage.getItem(STORAGE_KEYS.network) || "";

  // 네트워크 셀렉터 변경 시 메타마스크 전환을 처리한다.
  function initNetworkSelector() {
    const $select = $("#selectNetwork");
    if (!$select.length) {
      return;
    }

    if (previousNetwork) {
      $select.val(previousNetwork).prop("selected", true);
    }

    $select.on("change", async function () {
      const networkKey = $(this).find("option:selected").val();

      if (!networkKey) {
        alert("네트워크를 선택해주세요!");
        localStorage.removeItem(STORAGE_KEYS.network);
        previousNetwork = "";
        return;
      }

      localStorage.setItem(STORAGE_KEYS.network, networkKey);
      await requestChainSwitch(NETWORK_META[networkKey]);
    });
  }

  // 메타마스크 체인 전환을 시도하고 실패 시 선택값을 복구한다.
  async function requestChainSwitch(meta) {
    const $select = $("#selectNetwork");

    const revertSelection = () => {
      if (previousNetwork) {
        $select.val(previousNetwork).prop("selected", true);
        localStorage.setItem(STORAGE_KEYS.network, previousNetwork);
      } else {
        $select.val("");
        localStorage.removeItem(STORAGE_KEYS.network);
      }
    };

    if (!meta || !meta.chainConfig) {
      revertSelection();
      return;
    }

    if (typeof window.ethereum === "undefined") {
      alert("메타마스크를 찾을 수 없습니다. 브라우저 지갑을 먼저 연결하세요.");
      revertSelection();
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: meta.chainConfig.chainId }],
      });
    } catch (error) {
      if (error.code === 4902 && meta.chainConfig.addParams) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [meta.chainConfig.addParams],
          });
        } catch (addError) {
          console.error("네트워크 추가 실패", addError);
          alert(
            "네트워크를 추가하지 못했습니다. 메타마스크 설정을 확인하세요."
          );
          revertSelection();
          return;
        }
      } else if (error.code === 4001) {
        revertSelection();
        return;
      } else {
        console.error("네트워크 전환 실패", error);
        alert("네트워크 전환에 실패했습니다. 콘솔 로그를 확인하세요.");
        revertSelection();
        return;
      }
    }

    previousNetwork = $select.find("option:selected").val() || "";
    setTimeout(function () {
      window.location.reload();
    }, 300);
  }

  var statusClassMap = {
    info: "text-secondary",
    success: "text-success",
    error: "text-danger",
  };

  var chainIdNetworkMap = {
    "0x13882": {
      key: "POLYGON_AMOY",
      address:
        typeof contractAddress_POLYGON_AMOY !== "undefined"
          ? contractAddress_POLYGON_AMOY
          : null,
    },
    "0x3e9": {
      key: "KAIA_KAIROS",
      address:
        typeof contractAddress_KAIA_KAIROS !== "undefined"
          ? contractAddress_KAIA_KAIROS
          : null,
    },
    "0xaa36a7": {
      key: "ETH_SEPOLIA",
      address:
        typeof contractAddress_ETH_SEPOLIA !== "undefined"
          ? contractAddress_ETH_SEPOLIA
          : null,
    },
  };

  async function initWeb3Context() {
    var contractAddress = null;
    var blockChainNetwork = localStorage.getItem("blockChainNetwork");

    if (blockChainNetwork) {
      $("#selectNetwork").val(blockChainNetwork).prop("selected", true);
    }

    if (
      blockChainNetwork === "POLYGON_AMOY" &&
      typeof contractAddress_POLYGON_AMOY !== "undefined"
    ) {
      contractAddress = contractAddress_POLYGON_AMOY;
    } else if (
      blockChainNetwork === "KAIA_KAIROS" &&
      typeof contractAddress_KAIA_KAIROS !== "undefined"
    ) {
      contractAddress = contractAddress_KAIA_KAIROS;
    } else if (
      blockChainNetwork === "ETH_SEPOLIA" &&
      typeof contractAddress_ETH_SEPOLIA !== "undefined"
    ) {
      contractAddress = contractAddress_ETH_SEPOLIA;
    }

    if (typeof window.ethereum === "undefined") {
      $("#resultbrowsers").text("web3를 찾을 수 없습니다.");
      return;
    }

    $("#resultbrowsers").text("메타마스크를 로그인 해주세요!");

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      window.accounts = accounts;
      $("#showAccount").text(accounts.join(", "));
      window.web3 = new Web3(window.ethereum);

      const chainIdHex = await window.ethereum.request({
        method: "eth_chainId",
      });
      const chainIdDec = parseInt(chainIdHex, 16);
      window.currentChainIdHex = chainIdHex;
      window.currentChainId = chainIdDec;

      if (!contractAddress) {
        var networkMeta = chainIdNetworkMap[chainIdHex];
        if (networkMeta) {
          contractAddress = networkMeta.address;
          if (networkMeta.key) {
            localStorage.setItem("blockChainNetwork", networkMeta.key);
            $("#selectNetwork").val(networkMeta.key).prop("selected", true);
          }
        }
      }

      if (contractAddress) {
        window.mintingEvent = new window.web3.eth.Contract(
          abiobj,
          contractAddress
        );
      }

      $("#resultbrowsers").text(
        "메타마스크가 활성화되었습니다 (Chain ID: " +
          chainIdDec +
          " / " +
          chainIdHex +
          ")"
      );
    } catch (error) {
      console.log("error msg:", error);
      $("#resultbrowsers").text("메타마스크를 로그인 해주세요!");
    }
  }

  // 상태 텍스트 요소에 메시지와 색상을 적용한다.
  const setStatusText = function (selector, message, level) {
    var $target = $(selector);
    if (!$target.length) {
      return;
    }

    var classesToRemove = "";
    for (var key in statusClassMap) {
      if (Object.prototype.hasOwnProperty.call(statusClassMap, key)) {
        classesToRemove += statusClassMap[key] + " ";
      }
    }

    if (classesToRemove) {
      $target.removeClass(classesToRemove.trim());
    }

    var cssClass = statusClassMap[level] || statusClassMap.info;
    $target.addClass(cssClass).html(message || "");
  };

  window.setStatusText = setStatusText;
})(window, jQuery);

// 숫자와 제어 키만 허용하도록 키 입력을 제한한다.
function onlyNumber(e) {
  const evt = e || window.event;
  const key = evt.keyCode || evt.which;

  const isTopRowDigit = key >= 48 && key <= 57;
  const isNumpadDigit = key >= 96 && key <= 105;
  const controlKeys = [8, 9, 13, 27, 37, 39, 46];

  if (isTopRowDigit || isNumpadDigit || controlKeys.indexOf(key) !== -1) {
    return true;
  }

  if (evt.preventDefault) {
    evt.preventDefault();
  }
  evt.returnValue = false;
  return false;
}
