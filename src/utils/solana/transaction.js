const { Connection, TransactionMessage, VersionedTransaction } = require('@solana/web3.js');

/**
 * Creates a Solana transaction with given instructions.
 * @param {Object} connection 
 * @param {Object} payerKey 
 * @param {Array} instructions 
 * @returns {VersionedTransaction} 
 */
async function createTransaction(connection, payerKey, instructions) {
  const blockhash = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey,
    recentBlockhash: blockhash.blockhash,
    instructions,
  }).compileToV0Message();

  return new VersionedTransaction(message);
}

/**
 * Sends a Solana transaction.
 * @param {Object} connection 
 * @param {VersionedTransaction} transaction 
 * @param {Array} signers 
 * @returns {string} 
 */
async function sendTransaction(connection, transaction, signers) {
  transaction.sign(signers);
  const signature = await connection.sendTransaction(transaction, { preflightCommitment: 'confirmed' });
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

module.exports = {
  createTransaction,
  sendTransaction,
};
