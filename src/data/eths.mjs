const eths = [
  { name: "Treasury ETH", id: 'treasury_zettahash_eth_eth', address: "0x5C163de2e97Acf52c5919F7Ffac67871261646D3", currency: "ETH", provider: "SAFE", group_id: "treasury" },
  { name: "Treasury USD-T", id: 'treasury_zettahash_eth_usdt', address: "0x5C163de2e97Acf52c5919F7Ffac67871261646D3", contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7", currency: "USD-T", provider: "SAFE", group_id: "treasury" },
  { name: "Treasury ZH", id: 'treasury_zettahash_eth_zh', address: "0x5C163de2e97Acf52c5919F7Ffac67871261646D3", contract: "0x2c0e15190acb858bf74447928cbd8fb9709dcb19", currency: "ZH", provider: "SAFE", group_id: "treasury" },

  { name: "Pioneers ETH", id: 'pioneers_zettahash_eth_eth', address: "0xD47025B08A6ea67bd0B9f23FEeC3010F30E6c90d", currency: "ETH", provider: "SAFE", group_id: "pioneers" },
  { name: "Pioneers USD-T", id: 'pioneers_zettahash_eth_usdt', address: "0xD47025B08A6ea67bd0B9f23FEeC3010F30E6c90d", contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7", currency: "USD-T", provider: "SAFE", group_id: "pioneers" },
  { name: "Pioneers ZH", id: 'pioneers_zettahash_eth_zh', address: "0xD47025B08A6ea67bd0B9f23FEeC3010F30E6c90d", contract: "0x2c0e15190acb858bf74447928cbd8fb9709dcb19", currency: "ZH", provider: "SAFE", group_id: "pioneers" },
]

const balanceOfABI = [
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        name: "balance",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
]
export { eths, balanceOfABI }