// Official Pyth Price Feed IDs  (stored with 0x prefix for reference)
// Source: https://pyth.network/price-feeds
// NOTE: Hermes API requires IDs WITHOUT the 0x prefix in request params.
// Use RAW_IDS (stripped) for all API calls.

export const PRICE_IDS: Record<string, string> = {
  "BTC/USD":   "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "ETH/USD":   "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "SOL/USD":   "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  "BNB/USD":   "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
  "AVAX/USD":  "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  // MATIC rebranded to POL in 2024; using updated Pyth POL/USD feed ID
  "POL/USD":   "0x3728e591097635310760d3f1b43b1e6b31de17bd79d6d869cead52f76f1b0d1",
  "ARB/USD":   "0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
  "OP/USD":    "0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
  "LINK/USD":  "0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
  "UNI/USD":   "0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501",
  "AAVE/USD":  "0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445",
  "CRV/USD":   "0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8",
  // MKR/USD ID deprecated on Hermes (returns 404) — removed until correct ID is sourced from pyth.network/price-feeds
  // "MKR/USD": "0x9375299e...",
  "SNX/USD":   "0x39d020f60982ed892abbcd4a06a276a9f9b7bfbce003204c110b6e488f502da3",
  "DOGE/USD":  "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
  "LTC/USD":   "0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54",
  "XRP/USD":   "0xbec1d1bb88a3bb7888f9a29d7c70cefbe37ed7b2f0ebd955f91b1b4e9d3a5b42",
  "ADA/USD":   "0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
  "DOT/USD":   "0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b",
  "ATOM/USD":  "0xb00b60f88b03a6a625a8d1c048c3f66653edf217439983d037e7222c4e612819",
};

export const SYMBOL_LIST = Object.keys(PRICE_IDS);

// Hermes SSE/REST *responses* return IDs WITHOUT the 0x prefix.
// This map lets us look up symbol by the raw (no-prefix) ID from the response.
export const ID_TO_SYMBOL: Record<string, string> = {};
SYMBOL_LIST.forEach((sym) => {
  const raw = PRICE_IDS[sym].replace(/^0x/, "");
  ID_TO_SYMBOL[raw] = sym;
});

// IDs WITHOUT 0x prefix — this is what the Hermes API requires in URL params.
// Passing 0x-prefixed IDs causes Hermes to return a text error instead of JSON.
export const RAW_IDS = SYMBOL_LIST.map((sym) => PRICE_IDS[sym].replace(/^0x/, ""));

// Benchmarks symbols (Pyth Pro / Benchmarks API format)
export const BENCHMARKS_SYMBOLS: Record<string, string> = {
  "BTC/USD":   "Crypto.BTC/USD",
  "ETH/USD":   "Crypto.ETH/USD",
  "SOL/USD":   "Crypto.SOL/USD",
  "BNB/USD":   "Crypto.BNB/USD",
  "AVAX/USD":  "Crypto.AVAX/USD",
  "POL/USD":   "Crypto.POL/USD",
  "ARB/USD":   "Crypto.ARB/USD",
  "OP/USD":    "Crypto.OP/USD",
  "LINK/USD":  "Crypto.LINK/USD",
  "UNI/USD":   "Crypto.UNI/USD",
};
