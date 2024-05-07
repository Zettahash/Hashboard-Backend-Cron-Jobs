import { Web3 } from "web3"
import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws'
neonConfig.webSocketConstructor = ws;
import { addressFromExtPubKey, addressesFromExtPubKey } from '@swan-bitcoin/xpub-lib/lib/derivation.js'

import { eths, balanceOfABI } from "../data/eths.mjs"
import { xpubs } from "../data/btc.mjs"

let timestamp = Date.now()

const exchanges = async function (env) {
  const client = neon(env.PSQL_CONNECTION, { fullResults: true });
  const coincapIOAPI = `https://api.coincap.io/v2/assets?ids=bitcoin,tether,ethereum`
  const dextoolsAPIZH = 'https://open-api.dextools.io/free/v2/token/ether/0x2c0e15190acb858bf74447928cbd8fb9709dcb19/price'
  const moralisEndpoint = 'https://deep-index.moralis.io/api/v2.2/erc20/0x2c0e15190acb858bf74447928cbd8fb9709dcb19/price?chain=eth&include=percent_change&exchange=uniswapv3'
  const currencies_q = client`SELECT name FROM currencues_available where disabled=false`
  const [currencies_result] = await client.transaction([currencies_q], { isolationLevel: 'RepeatableRead', readOnly: true, })

  let jsonb_obj = {}
  // Every 5 minutes
  const response = await fetch((coincapIOAPI), { method: "get", redirect: 'follow' })
  let resp = await response.text()
  let respPayload = JSON.parse(resp).data
  let currencies = []
  let preparedStatements = []
  for (const c of currencies_result.rows) { currencies.push(c.name) }
  for (const item of respPayload) {
    if (currencies.indexOf(item.symbol) >= 0) {
      jsonb_obj[item.symbol] = item
      preparedStatements.push(client(`insert into coin_price_history (id, usd, data, modified) values($1,$2,$3,$4)`, [item.symbol, item.priceUsd, item, timestamp]))
      continue
    }
  }
  // FETCH PRICE FOR ZH
  try {
    const moralis = await fetch(moralisEndpoint, { method: 'GET', headers: { 'X-API-Key': env.MORALIS_KEY } })
    let moralisResp = await moralis.json()
    if (moralisResp.nativePrice) {
      let price = Number(moralisResp.nativePrice.value) / Math.pow(10, moralisResp.nativePrice.decimals)
      preparedStatements.push(client(`insert into coin_price_history (id, usd, data, modified) values($1,$2,$3,$4)`, [moralisResp.tokenSymbol, price, moralisResp, timestamp]))
      jsonb_obj[moralisResp.tokenSymbol] = { id: "zettahash token", name: "Zettahash Token", symbol: moralisResp.tokenSymbol, priceUsd: price }
    }
  } catch (e) {
    console.log("moralis Fetch error: ", e)
  }

  preparedStatements.push(client(`INSERT INTO payload_cache (key, value, modified) values($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value=$2, modified=$3`, ['exr', jsonb_obj, timestamp]))
  await client.transaction(preparedStatements)
}

const getBitcoin = async function (env) {
  const client = neon(env.PSQL_CONNECTION, { fullResults: true });
  let timeStart = Date.now()
  let debug = {}
  let btcPayload = {}
  let insertOperations = []
  const assetCounter = 10
  let coinsCounted = 0
  const allAddressesStatementResult = await client(`SELECT * FROM wallets where type='btc'`)
  let results = allAddressesStatementResult.rows
  for (const xpub of xpubs) {
    if (xpub.xpub && !xpub.address) {
      //HD WALLETS ONLY BEYOND HERE
      const countStatementResult = await client(`SELECT count(*) as count FROM wallets where xpub=$1`, [xpub.xpub]);
      let addressCount = countStatementResult.rowCount > 0 ? countStatementResult.rows[0].count : 0
      //IF FIRST RUN AND THERE IS 0 ADDRESSES (I.E. LESS THAN 10)
      if (addressCount < assetCounter) {
        console.log("Need to fetch more BTC addresses for HD wallet")
        let addresses = addressesFromExtPubKey({
          extPubKey: xpub.xpub,
          addressCount: assetCounter,
          network: "mainnet"
        })
        for (let i = addressCount; i < addresses.length; i++) {
          let entry = addresses[i]
          let group_id = xpub.id.replace(/ /g, "_").toLowerCase()
          insertOperations.push(client(`INSERT INTO wallets	(wallet_id, name, address, balance, type, currency, xpub, data, modified, group_id) values('${entry.address}','${xpub.id}', '${entry.address}', '0', 'btc', 'BTC', '${xpub.xpub}', '${JSON.stringify({ path: btoa(entry.path) })}', '${timestamp}','${group_id}') ON CONFLICT (wallet_id) DO NOTHING`))
        }
      }
      //FOR ORDINARY RUNS WE CHECK THAT WE HAVE AT LEAST ONE ADDRESS WITH A ZERO BALANCE (I.E. AN UNUSED ADDRESS)
      else {
        console.log("We have enough addresses for this xpub")
        const balanceStatementResult = await client(`SELECT balance FROM wallets where wallet_id='${xpub.id}' and type='btc' order by balance asc`);
        let balances = balanceStatementResult.rows
        for (let i = 0; i < balances.length; i++) {
          let balance = balances[i]
          if (Number(balance.balance) === 0) {
            console.log("balance for this address is 0. skipping...")
            continue
          }
          if ((i / balances.length) < .9) {
            console.log("balances:?????", i, balances.length)
            let addresses = addressesFromExtPubKey({
              extPubKey: xpub.xpub,
              addressCount: assetCounter + balances.length,
              network: "mainnet"
            })
            for (let i = balances.length; i < (assetCounter + balances.length); i++) {
              let entry = addresses[i]
              let group_id = xpub.id.replace(/ /g, "_").toLowerCase()

              insertOperations.push(client(`INSERT INTO wallets (wallet_id, name, address, balance, type, currency, xpub, data, modified, group_id) values('${entry.address}','${xpub.id}', '${entry.address}', '0', 'btc', 'BTC', '${xpub.xpub}', '${JSON.stringify({ path: btoa(entry.path) })}', '${timestamp}', '${group_id}') ON CONFLICT (wallet_id) DO NOTHING`))
            }
            break;
          }
        }
      }
    }
    console.log("refreshing BTC")

    if (!xpub.xpub && xpub.address) {
      console.log("no xpub", xpub.address)
      let blockcypher = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${xpub.address}/balance`, {
        method: 'GET', headers: {},
      })
      let blockcypherResp = await blockcypher.json()
      let balance = blockcypherResp.balance ? blockcypherResp.balance : '0'
      let group_id = xpub.id.replace(/ /g, "_").toLowerCase()

      insertOperations.push(client(`INSERT INTO wallets	(wallet_id, name, address, balance, type, currency, data, modified, group_id) values($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (wallet_id) DO UPDATE SET balance=$4, modified=$8, data=$7`, [xpub.id, xpub.name, xpub.address, balance, 'btc', 'BTC', blockcypherResp, timestamp, group_id]))
    }

    let apiQueryAddresses = ``
    let index = 0
    let count = 0
    for (const result of results) {
      apiQueryAddresses += result.address + "|"
      index++
      count++
      if (count != results.length) { continue }
      apiQueryAddresses = apiQueryAddresses.substring(0, apiQueryAddresses.length - 1)
      let apiQuery = `https://blockchain.info/multiaddr?active=${apiQueryAddresses}`
      const response = await fetch((apiQuery), { method: "get", })
      let resp = await response.json()
      for (const item of resp.addresses) {
        {
          const dataObjectStatementResult = await client(`SELECT data FROM wallets where wallet_id=$1 AND data!=NULL`, [xpub.id]);
          if (dataObjectStatementResult.rowCount == 1) {
            let data = dataObjectStatementResult.rows[0].data ? JSON.parse(dataObjectStatementResult.rows[0].data) : {}
            data['balance-tx-query'] = item
            client(`update wallets set balance=$2, data=$3 where address=$1`, [item.address, item.final_balance, data])
            coinsCounted += (Number(item.final_balance))///100000000}
          }
          apiQueryAddresses = ``
          index = 0
        }

      }
    }
    let balance = 0
    if (!xpub.xpub && xpub.address) {
      //FETCH WALLETS WHICH ARE NOT HD
      const sumStatementNonHDResult = await client(`SELECT balance, modified FROM wallets where type='btc' and address=$1`, [xpub.address]);
      balance = sumStatementNonHDResult.rowCount > 0 ? sumStatementNonHDResult.rows[0].balance : 0
    } else {
      const sumStatementResult = await client(`SELECT sum(balance::REAL) as balance FROM wallets where type='btc' and xpub=$1`, [xpub.xpub]);
      balance = sumStatementResult.rowCount > 0 ? sumStatementResult.rows[0].balance : 0
    }
    btcPayload[xpub.id] = { name: xpub.name, currency: xpub.currency, balance: balance, xpub: xpub.xpub, address: xpub.address, provider: xpub.provider, group_id: xpub.group_id, timestamp: 'modified' }
  }
  debug.duration = Date.now() - timeStart
  insertOperations.push(client(`INSERT INTO payload_cache (key, value, modified) values($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value=$2, modified=$3`, ['btc', btcPayload, timestamp]))
  await client.transaction(insertOperations)
}

const getEth = async function (env) {
  const client = neon(env.PSQL_CONNECTION, { fullResults: true });
  let timeStart = Date.now()
  let ethPayload = {}
  let debug = {}
  let insertOperations = []
  //REFRESH BALANCES EVERY .5 HOURS OR LONGER
  console.log("refreshing ETH")
  for (const eth of eths) {
    const web3 = new Web3(new Web3.providers.HttpProvider(`https://eth-mainnet.g.alchemy.com/v2/${env.ALCHEMY_KEY}`,),)
    if (eth.contract) {
      const contract = new web3.eth.Contract(balanceOfABI, eth.contract);
      const result = await contract.methods.balanceOf(eth.address).call();
      const formattedResult = web3.utils.fromWei(result, "ether");
      let resultData = { base64: btoa(result) }
      insertOperations.push(client(`INSERT INTO wallets (wallet_id, address, name, provider, group_id, balance, type, currency, contract, data, modified) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (wallet_id) DO UPDATE SET balance = $6, modified=$11`, [eth.id, eth.address, eth.name, eth.provider, eth.group_id, formattedResult, 'erc-20', eth.currency, eth.contract, resultData, timestamp]))
    } else {
      let result = await web3.eth.getBalance(eth.address)
      const formattedResult = web3.utils.fromWei(result, "ether");
      let resultData = { base64: btoa(result) }
      insertOperations.push(client(`INSERT INTO wallets (wallet_id, address, name, provider, group_id, balance, type, currency, data, modified) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (wallet_id) DO UPDATE SET balance = $6, modified=$10`, [eth.id, eth.address, eth.name, eth.provider, eth.group_id, formattedResult, 'eth', 'eth', resultData, timestamp]))
    }
  }
  for (const eth of eths) {
    const sumStatementResult = await client(`SELECT sum(balance::REAL) as balance FROM wallets where wallet_id=$1`, [eth.id]);
    let balance = sumStatementResult.rowCount > 0 ? sumStatementResult.rows[0].balance : 0

    ethPayload[eth.id] = { name: eth.name, currency: eth.currency, balance: balance, address: eth.address, provider: eth.provider, group_id: eth.group_id, timestamp: 'modified' }
  }
  debug.duration = Date.now() - timeStart
  insertOperations.push(client(`INSERT INTO payload_cache (key, value, modified) values($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value=$2, modified=$3`, ['eth', ethPayload, timestamp]))
  await client.transaction(insertOperations)
}

export { exchanges, getBitcoin, getEth }