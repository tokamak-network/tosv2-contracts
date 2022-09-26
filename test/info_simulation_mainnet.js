
let UniswapV3LiquidityChangerAddress = "0xa839a0e64b27a34ed293d3d81e1f2f8b463c3514";

let stosMigrationBlockNumber = "15586015";
let stosMigrationSet_adminAddress = "0xa839a0e64b27a34ed293d3d81e1f2f8b463c3514";
let foundation_info = {
    address: [
        "0x5b6e72248b19F2c5b88A4511A6994AD101d0c287",
        "0x3b9878Ef988B086F13E5788ecaB9A35E74082ED9",
        "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303"
      ],
      percentages: [
        ethers.BigNumber.from("2500"),
        ethers.BigNumber.from("500"),
        ethers.BigNumber.from("100"),
      ],
}

let totalTosSupplyTarget = ethers.utils.parseEther("25000000");
let tosAdmin = "0x12a936026f072d4e97047696a9d11f97eae47d21";
let lockTosAdmin = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1";
let burnTosContractList = [
  "0xbede575486e1f103fbe258a00d046f09e837fa17",
  "0xa13eec91b9e0ee4cf96d8040b3ecc729a37882be",
  "0x14de03d4629c9c4d3bfc38f222b03ada675f64b1",
  "0xb9845e926256dcd54de112e06daa49f53b4f4830",
  "0xe8960d506fec3ec3e2736bf72b495f1ec5a63cc6",
  "0x0620492babe0a2ce13688025f8b783b8d6c28955" // airdrop 용, 아직 결정 안됨.
]

let burnTosAddressList = [
  "0x70115ba3b49d60776aaa2976adffb5cfabf31689",
  "0x065fb9cc1bc59c9ed74e504e0491e8bc08b9a960",
  "0xa615864e084e369ab2bbe226077f4ae376bb9205",
  "0x9d60f292b049a7655f0b48a2a8d4d27ee66a9329",
  "0x178c2037d085ec47dee56cd16e603202a8b9dd62",
  "0x7c514f4a08ab59d90a1262595d57a69870584568",
  "0xa7c1767c2dd44d34eace5adbb7ed0bd1db61c1b9",
  "0x31a8da16f83d2a155981df1e41f77b823439c8b5",
  "0x18e622d66c63d395720fbabebcba62a560fe49a2",
  "0x3ccfbbc2eebdc793a88db0f824f6bef7f7ee12d5",
  "0xa63b141a6834c05cc3c9fae478661ed18e8fdea5",
  "0x1e26634945a6e756098585335a88882b13d0ad67",
  "0xd213118151117445f8c4c8447fa533213f2f80e8",
  "0xcb585d90c047f5f39b52a96154e02948db0a3178"
]

// 24 회 deposit
let depositSchedule = [
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
  ]
  let MintingRateSchedule = [
    '250000.0000000000000',
    '126847.2906403940000',
    '85393.9276860169000',
    '64515.2167603404000',
    '51914.5884868364000',
    '43473.1919849118000',
    '37418.4298700216000',
    '32860.7648432224000',
    '29304.4050117048000',
    '26451.0062763879000',
    '24110.2092607783000',
    '22154.7989395473000',
    '20496.5056057489000',
    '19072.1480236954000',
    '17835.3031453754000',
    '16751.0901882097000',
    '15792.7898341931000',
    '14939.5867097094000',
    '14175.0223949853000',
    '13485.9109513788000',
    '12861.5632221483000',
    '12293.2219396848000',
    '12000.0000000000000',
    '12000.0000000000000',
    '12000.0000000000000',
    '12000.0000000000000',
  ]

let eventCreatedMarket ="CreatedMarket(uint256,address,uint256[4])";
let eventETHDeposited ="ETHDeposited(address,uint256,uint256,uint256,uint256)";
let eventETHDepositWithSTOS ="ETHDepositedWithSTOS(address,uint256,uint256,uint256,uint256,uint256)";
let eventDeposited ="Deposited(address,uint256,uint256,uint256,bool,uint256)";

let eventStakedGetStosByBond ="StakedGetStosByBond(address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)";

let eventStaked ="Staked(address,uint256,uint256)";
let eventStakedGetStos ="StakedGetStos(address,uint256,uint256,uint256,uint256,uint256)";
let eventIncreasedAmountForSimpleStake ="IncreasedAmountForSimpleStake(address,uint256,uint256)";
let eventResetStakedGetStosAfterLock ="ResetStakedGetStosAfterLock(address,uint256,uint256,uint256,uint256,uint256,uint256)";
let eventIncreasedBeforeEndOrNonEnd ="IncreasedBeforeEndOrNonEnd(address,uint256,uint256,uint256,uint256,uint256)";

let uniswapInfo={
  poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  wethUsdcPool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
  tosethPool: "0x2ad99c938471770da0cd60e08eaf29ebff67a92a",
  wtonWethPool: "0xc29271e3a68a7647fd1399298ef18feca3879f59",
  wtonTosPool: "0x1c0ce9aaa0c12f53df3b4d8d77b82d6ad343b4e4",
  tosDOCPool: "0x369bca127b8858108536b71528ab3befa1deb6fc",
  wton: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
  tos: "0x409c4D8cd5d2924b9bc5509230d16a61289c8153",
  weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  doc: "0x0e498afce58de8651b983f136256fa3b8d9703bc",
  _fee: "3000",
  NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3"
}

module.exports = {
    stosMigrationBlockNumber,
    uniswapInfo,
    UniswapV3LiquidityChangerAddress,
    stosMigrationSet_adminAddress,
    foundation_info,
    totalTosSupplyTarget,
    tosAdmin,
    lockTosAdmin,
    burnTosContractList,
    burnTosAddressList,
    depositSchedule,
    MintingRateSchedule,
    eventCreatedMarket,
    eventETHDeposited,
    eventETHDepositWithSTOS,
    eventDeposited,
    eventStakedGetStosByBond,
    eventStaked,
    eventStakedGetStos,
    eventIncreasedAmountForSimpleStake,
    eventResetStakedGetStosAfterLock,
    eventIncreasedBeforeEndOrNonEnd,
}