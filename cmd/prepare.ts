import { Tx } from "../main";
import { Tezos, ForgeParams, Signer } from "@taquito/taquito";
// import { InMemorySigner, importKey } from "@taquito/signer";
import { OperationContentsTransaction, OpKind } from "@taquito/rpc";
// import { Estimate } from "@taquito/taquito/dist/types/contract/estimate";
// import * as sodium from "libsodium-wrappers";
// import { b58cencode, b58cdecode, prefix } from "@taquito/utils";

// class NoSecretsSigner implements Signer {
//   constructor(private _publicKey) {}

//   sign(
//     op: {},
//     magicByte?: Uint8Array | undefined
//   ): Promise<{ bytes: string; sig: string; prefixSig: string; sbytes: string }> {
//     throw new Error("Method not implemented.");
//   }
//   async publicKey(): Promise<string> {
//     return this._publicKey;
//   }
//   async publicKeyHash(): Promise<string> {
//     await sodium.ready;
//     //TODO: don't hard-code to tz1 address type.
//     let decodedPubKey = b58cdecode(this._publicKey, prefix.edpk);
//     return b58cencode(sodium.crypto_generichash(20, decodedPubKey), prefix.tz1);
//   }
//   secretKey(): Promise<string | undefined> {
//     throw new Error("Method not implemented.");
//   }
// }

const FAUCET_KEY = {
  mnemonic: [
    "fix",
    "brass",
    "often",
    "boy",
    "craft",
    "ship",
    "woman",
    "verify",
    "vanish",
    "series",
    "letter",
    "neutral",
    "vehicle",
    "emotion",
    "elbow",
  ],
  secret: "bd8c8bbef90c1da9acfec3384b5ad2bd4f1d579b",
  amount: "2404235691",
  pkh: "tz1ZymqRMXjMP34Jnubfv3QprULZbqDHLm2y",
  password: "F9WgyXQLfF",
  email: "gvsxvust.ufmniviq@tezos.example.org",
};

export let prepare = async (publicKey: string, input: Tx[]): Promise<ForgeParams> => {
  Tezos.setProvider({
    rpc: "https://api.tez.ie/rpc/carthagenet",
    // signer: new NoSecretsSigner(publicKey),
  });

  await Tezos.importKey(
    FAUCET_KEY.email,
    FAUCET_KEY.password,
    FAUCET_KEY.mnemonic.join(" "),
    FAUCET_KEY.secret
  );

  // we need the public key and pkh of sender
  // we need to inject a custom signer
  let pkh = await Tezos.signer.publicKeyHash();
  // // //Get counter for source address
  let { counter } = await Tezos.rpc.getContract(pkh);

  if (!counter) {
    throw new Error(`Got undefined counter for source address ${pkh}`);
  }

  // Get latest block hash (aka branch id)
  let hash = (await Tezos.rpc.getBlockHeader()).hash;
  let count = Number.parseInt(counter, 10);
  let transactions: OperationContentsTransaction[] = [];

  //   const est = await Tezos.estimate.transfer({
  //     to: input[0].dst,
  //     amount: input[0].amount,
  //   });
  //   console.log(`burnFeeMutez : ${est.burnFeeMutez},
  //     gasLimit : ${est.gasLimit},
  //     minimalFeeMutez : ${est.minimalFeeMutez},
  //     storageLimit : ${est.storageLimit},
  //     suggestedFeeMutez : ${est.suggestedFeeMutez},
  //     totalCost : ${est.totalCost},
  //     usingBaseFeeMutez : ${est.usingBaseFeeMutez}`);
  // .then((est) => {
  //   console.log(`burnFeeMutez : ${est.burnFeeMutez},
  // gasLimit : ${est.gasLimit},
  // minimalFeeMutez : ${est.minimalFeeMutez},
  // storageLimit : ${est.storageLimit},
  // suggestedFeeMutez : ${est.suggestedFeeMutez},
  // totalCost : ${est.totalCost},
  // usingBaseFeeMutez : ${est.usingBaseFeeMutez}`);
  // })
  // .catch((error) => console.table(`Error: ${JSON.stringify(error, null, 2)}`));

  for (const tx of input) {
    let est = await Tezos.estimate.transfer({ amount: tx.amount, to: tx.dst, source: pkh });

    const result: OperationContentsTransaction = {
      kind: OpKind.TRANSACTION,
      source: pkh,
      amount: tx.amount.toString(),
      destination: tx.dst,
      counter: (++count).toString(),
      gas_limit: est.gasLimit.toString(),
      fee: est.suggestedFeeMutez.toString(),
      storage_limit: est.storageLimit.toString(),
    };
    transactions.push(result);
  }

  return {
    branch: hash,
    //TODO pending refactor of types
    contents: transactions as any,
  };
};
