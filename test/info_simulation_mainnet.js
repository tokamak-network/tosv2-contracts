
let UniswapV3LiquidityChangerAddress = "0xa839a0e64b27a34ed293d3d81e1f2f8b463c3514";
let lockTOSProxyAddress =  "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79";
let LOG_FLAG = true;
let CHECK_FLAG = {
  scheduleStakingReward: [false, false],
  scheduleRunwayTos: [true, false],
  scheduleTotalTosSupply: [true, false],
  scheduleTreasuryTosBalance : [true, false],
  scheduleMintedTos: [false, false],
  scheduleTosAllocatedToBonder: [false, true],
  scheduleTotalDistribute: [false, true],
  scheduleTosAllocatedToFoundation: [false, false],
  scheduleTosAllocatedToTosDao: [false, false],
  scheduleTosAllocatedToTonDao: [false, false],
  scheduleLtosIndex: [true, false],
  scheduleLtos: [true, false]
};

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

let STATUS = {
  NONE: 0,
  RESERVEDEPOSITOR: 1,
  RESERVESPENDER: 2,
  RESERVETOKEN: 3,
  RESERVEMANAGER: 4,
  LIQUIDITYDEPOSITOR: 5,
  LIQUIDITYTOKEN: 6,
  LIQUIDITYMANAGER: 7,
  REWARDMANAGER: 8,
  BONDER: 9,
  STAKER: 10
}

// Initial minting rate (TOS/ETH)
let InitialMintingRateSchedule = "250000";


// bond
let maxDepositAmountMonth = ethers.utils.parseEther("3");

let bondTosPrice = "3000000000000000000000";
//let bondTosPrice = "2500000000000000000000";
let bondPurchasableTOSAmount = "900000000000000000000";
//let bondCapAmountOfTos = "30400000000000000000000";
let bondCapAmountOfTos = "270000000000000000000000";
let bondCloseTime = 1727464947;

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

let uniswapInfo = {
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

let MintingRateSchedule = [
  "250000.",
  "126848.",
  "85394.",
  "64516.",
  "51915.",
  "43474.",
  "37419.",
  "32861.",
  "29305.",
  "26452.",
  "24111.",
  "22155.",
  "20497.",
  "19073.",
  "17836.",
  "16752.",
  "15793.",
  "14940.",
  "14176.",
  "13486.",
  "12862.",
  "12294.",
  "12000.",
  "12000.",
]


let scheduleBackingRate = [
  "250000.",
  "126847.290640394",
  "85393.9346405229",
  "64515.2224938875",
  "51914.59765625",
  "43473.2016260163",
  "37418.4415041783",
  "32860.7771010962",
  "29304.4166666667",
  "26451.0185004869",
  "24110.2230088496",
  "22154.8134630981",
  "20496.5194610778",
  "19072.1619179986",
  "17835.317769131",
  "16751.1051671733",
  "15792.8054919908",
  "14939.601836845",
  "14175.0373592631",
  "13485.9265921245",
  "12861.5782407407",
  "12293.236853734",
  "11773.6589180051",
  "11297.0745240988",
]

let scheduleTosStaked = [
  "2042499.559867",
"2051499.559867",
"2076633.53142368",
"2101838.28327535",
"2127240.70067379",
"2152841.34026902",
"2178641.75659723",
"2204643.50857237",
"2230848.167334",
"2257257.31628174",
"2283872.55117138",
"2310695.48021134",
"2337727.72415981",
"2364970.9164227",
"2392426.70315235",
"2420096.74334697",
"2447982.7089509",
"2476086.28495563",
"2504409.16950163",
"2532953.07398094",
"2561719.72314058",
"2590710.85518679",
"2619928.22189002",
"2649373.58869083",
]

let scheduleStakingReward = [
  "0.00",
  "16133.9715566837",
  "16331.6371034549",
  "16530.857186416",
  "16731.6440311815",
  "16934.0099595138",
  "17137.9673900797",
  "17343.5288392122",
  "17550.7069216789",
  "17759.5143514558",
  "17969.9639425077",
  "18182.0686095745",
  "18395.8413689637",
  "18611.2953393496",
  "18828.4437425777",
  "19047.2999044765",
  "19267.8772556752",
  "19490.1893324277",
  "19714.2497774437",
  "19940.0723407256",
  "20167.6708804123",
  "20397.0593636298",
  "20628.2518673482",
  "20861.2625792458",
]

let scheduleRunwayTos = [
  "7364734.62074087",
  "7859890.64918419",
  "8100051.25733252",
  "8254204.41993408",
  "8364941.90033885",
  "8449395.53401064",
  "8516174.9620355",
  "8570217.63327387",
  "8614620.75432613",
  "8651456.86943649",
  "8682179.58039653",
  "8707847.10644806",
  "8729254.76418516",
  "8747017.76745551",
  "8761618.83726089",
  "8773443.39165696",
  "8782806.45565223",
  "8789965.08110623",
  "8795136.97662693",
  "8798504.64746729",
  "8800219.53542109",
  "8800416.50871786",
  "8799209.72191705",
  "8797164.57580135",
]

let scheduleTotalTosSupply = [
    "25000000.",
    "25750000.",
    "26130544.",
    "26386726.",
    "26580274.",
    "26736019.",
    "26866441.",
    "26978698.",
    "27077281.",
    "27165196.",
    "27244552.",
    "27316885.",
    "27383350.",
    "27444841.",
    "27502060.",
    "27555568.",
    "27605824.",
    "27653203.",
    "27698023.",
    "27740551.",
    "27781009.",
    "27819595.",
    "27856477.",
    "27892477.",
]

let scheduleTreasuryTosBalance = [
  "10157234.1806079",
"10537778.1806079",
"10793960.1806079",
"10987508.1806079",
"11143253.1806079",
"11273675.1806079",
"11385932.1806079",
"11484515.1806079",
"11572430.1806079",
"11651786.1806079",
"11724119.1806079",
"11790584.1806079",
"11852075.1806079",
"11909294.1806079",
"11962802.1806079",
"12013058.1806079",
"12060437.1806079",
"12105257.1806079",
"12147785.1806079",
"12188243.1806079",
"12226829.1806079",
"12263711.1806079",
"12299711.1806079",
"12335711.1806079",
]

let scheduleMintedTos = [
  "750000.",
  "750000.",
  "380541.871921182",
  "259803.921568627",
  "197167.788791598",
  "159025.463633729",
  "133353.724791616",
  "114888.046152849",
  "100961.849344848",
  "90080.4571975959",
  "81341.0204465559",
  "74165.9020975272",
  "68168.2825884393",
  "63079.3339355076",
  "58706.3898440607",
  "54907.7386429374",
  "51576.8098218492",
  "48631.9081080495",
  "46009.3494340014",
  "43658.7520607271",
  "41539.7324136912",
  "39619.539736641",
  "37871.3323147971",
  "36272.9009499558"
]


let scheduleTosAllocatedToBonder = [
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000.",
  "9000."
]


let scheduleTosAllocatedToTreasury = [
  "511290.",
  "511290.",
  "256363.891625616",
  "173054.705882353",
  "129835.774266203",
  "103517.569907273",
  "85804.070106215",
  "73062.7518454656",
  "63453.6760479451",
  "55945.5154663412",
  "49915.3041081236",
  "44964.4724472938",
  "40826.1149860231",
  "37314.7404155002",
  "34297.4089924019",
  "31676.3396636268",
  "29377.9987770759",
  "27346.0165945542",
  "25536.451109461",
  "23914.5389219017",
  "22452.4153654469",
  "21127.4824182823",
  "19921.21929721",
  "18818.3016554695"
]

let scheduleTotalDistribute = [
  "229710.",
"344888.64",
"421515.06",
"478724.94",
"524215.89",
"561856.71",
"593866.38",
"621637.11",
"646100.76",
"667911.12",
"687544.35",
"705358.5",
"721630.71",
"736578.6",
"750376.08",
"763165.44",
"775062.93",
"786167.13",
"796560.81",
"806312.79",
"815484.45",
"824127.87",
"832497.87",
"840867.87",
]

let scheduleTosAllocatedToFoundation  = [
  "185250.",
  "185250.",
  "92885.4679802952",
  "62700.9803921569",
  "47041.9471978995",
  "37506.3659084323",
  "31088.431197904",
  "26472.0115382122",
  "22990.462336212",
  "20270.114299399",
  "18085.255111639",
  "16291.4755243818",
  "14792.0706471098",
  "13519.8334838769",
  "12426.5974610152",
  "11476.9346607344",
  "10644.2024554623",
  "9907.97702701234",
  "9252.33735850032",
  "8664.68801518177",
  "8134.93310342282",
  "7654.88493416025",
  "7217.83307869928",
  "6818.22523748895"
]

let scheduleTosAllocatedToTosDao = [
  "37050.",
  "37050.",
  "18577.093596059",
  "12540.1960784314",
  "9408.3894395799",
  "7501.27318168647",
  "6217.68623958081",
  "5294.40230764244",
  "4598.0924672424",
  "4054.02285987979",
  "3617.05102232779",
  "3258.29510487636",
  "2958.41412942197",
  "2703.96669677539",
  "2485.31949220303",
  "2295.38693214687",
  "2128.84049109247",
  "1981.59540540247",
  "1850.46747170006",
  "1732.93760303635",
  "1626.98662068456",
  "1530.97698683205",
  "1443.56661573985",
  "1363.64504749779"
]

let scheduleTosAllocatedToTonDao = [
  "7410.",
  "7410.",
  "3715.41871921181",
  "2508.03921568627",
  "1881.67788791598",
  "1500.25463633729",
  "1243.53724791616",
  "1058.88046152849",
  "919.618493448481",
  "810.804571975958",
  "723.410204465558",
  "651.659020975271",
  "591.682825884394",
  "540.793339355078",
  "497.063898440607",
  "459.077386429374",
  "425.768098218494",
  "396.319081080494",
  "370.093494340013",
  "346.587520607271",
  "325.397324136913",
  "306.19539736641",
  "288.713323147971",
  "272.729009499558",
]

let scheduleTosBurn = [
]


let scheduleLtosIndex = [
  "1.",
  "1.00786447722062",
  "1.01579080444319",
  "1.02377946808565",
  "1.03183095839135",
  "1.03994576945915",
  "1.04812439927374",
  "1.0563673497362",
  "1.06467512669481",
  "1.07304823997606",
  "1.08148720341598",
  "1.08999253489164",
  "1.09856475635294",
  "1.10720439385465",
  "1.11591197758869",
  "1.12468804191665",
  "1.13353312540261",
  "1.14244777084616",
  "1.15143252531573",
  "1.16048794018216",
  "1.16961457115253",
  "1.17881297830426",
  "1.1880837261195",
  "1.19742738351975",
]

let scheduleLtos  = [
  "2042499.559867",
"2051499.559867",
"2035491.48346254",
"2044351.57548211",
"2053018.59316005",
"2061617.44166914",
"2070147.69759452",
"2078609.90365919",
"2087004.59089627",
"2095332.28625287",
"2103593.51256389",
"2111788.78858442",
"2119918.62902167",
"2127983.54456654",
"2135984.04192493",
"2143920.62384885",
"2151793.78916729",
"2159604.03281679",
"2167351.84587187",
"2175037.71557513",
"2182662.12536715",
"2190225.55491616",
"2197728.48014752",
"2205171.37327281",
]

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
    bondTosPrice,
    bondPurchasableTOSAmount,
    bondCapAmountOfTos,
    bondCloseTime,
    scheduleBackingRate,
    scheduleTosStaked,
    scheduleStakingReward,
    scheduleRunwayTos,
    scheduleTotalTosSupply,
    scheduleTreasuryTosBalance,
    scheduleMintedTos,
    scheduleTosAllocatedToBonder,
    scheduleTosAllocatedToTreasury,
    scheduleTotalDistribute,
    scheduleTosAllocatedToFoundation,
    scheduleTosAllocatedToTosDao,
    scheduleTosAllocatedToTonDao,
    scheduleTosBurn,
    scheduleLtosIndex,
    scheduleLtos,
    STATUS,
    lockTOSProxyAddress,
    InitialMintingRateSchedule,
    LOG_FLAG,
    maxDepositAmountMonth,
    CHECK_FLAG
}