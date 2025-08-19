import crypto from 'crypto';
import QuantumResistantCrypto from './quantumCrypto';
import logger from '../utils/logger';

interface QuantumBlock {
  index: number;
  timestamp: number;
  data: any;
  previousHash: string;
  hash: string;
  nonce: number;
  quantumSignature: string;
  merkleRoot: string;
  difficulty: number;
}

interface QuantumTransaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  quantumSignature: string;
  hash: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
}

class QuantumResistantBlockchain {
  private static readonly DIFFICULTY = 4; // Number of leading zeros required
  private static readonly BLOCK_TIME = 10000; // 10 seconds target block time
  private static readonly MAX_TRANSACTIONS = 1000; // Max transactions per block

  private chain: QuantumBlock[] = [];
  private pendingTransactions: QuantumTransaction[] = [];
  private nodes: string[] = [];

  constructor() {
    this.createGenesisBlock();
  }

  // Create the genesis block
  private createGenesisBlock(): void {
    const genesisBlock: QuantumBlock = {
      index: 0,
      timestamp: Date.now(),
      data: { message: 'Enerlectra Quantum-Resistant Genesis Block' },
      previousHash: '0',
      hash: '',
      nonce: 0,
      quantumSignature: '',
      merkleRoot: '',
      difficulty: this.DIFFICULTY
    };

    genesisBlock.hash = this.calculateBlockHash(genesisBlock);
    genesisBlock.quantumSignature = this.signBlock(genesisBlock);
    genesisBlock.merkleRoot = this.calculateMerkleRoot([genesisBlock.data]);

    this.chain.push(genesisBlock);
  }

  // Get the latest block
  getLatestBlock(): QuantumBlock {
    return this.chain[this.chain.length - 1];
  }

  // Add a new transaction to the pending transactions
  addTransaction(transaction: Omit<QuantumTransaction, 'id' | 'hash' | 'status'>): string {
    const newTransaction: QuantumTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
      hash: this.calculateTransactionHash(transaction),
      status: 'PENDING'
    };

    // Verify transaction signature
    if (!this.verifyTransactionSignature(newTransaction)) {
      throw new Error('Invalid transaction signature');
    }

    this.pendingTransactions.push(newTransaction);
    return newTransaction.id;
  }

  // Mine a new block
  async mineBlock(minerAddress: string): Promise<QuantumBlock> {
    const previousBlock = this.getLatestBlock();
    const newIndex = previousBlock.index + 1;
    const newTimestamp = Date.now();
    
    // Select transactions for the block
    const blockTransactions = this.pendingTransactions.slice(0, this.MAX_TRANSACTIONS);
    
    // Calculate merkle root
    const merkleRoot = this.calculateMerkleRoot(blockTransactions.map(t => t.hash));

    let nonce = 0;
    let newHash = '';
    let target = '0'.repeat(this.DIFFICULTY);

    // Proof of Work with quantum-resistant hashing
    while (!newHash.startsWith(target)) {
      nonce++;
      const blockData = {
        index: newIndex,
        timestamp: newTimestamp,
        data: blockTransactions,
        previousHash: previousBlock.hash,
        nonce,
        merkleRoot
      };
      
      newHash = this.calculateBlockHash(blockData);
      
      // Adjust difficulty every 100 blocks
      if (newIndex % 100 === 0) {
        this.adjustDifficulty();
      }
    }

    const newBlock: QuantumBlock = {
      index: newIndex,
      timestamp: newTimestamp,
      data: blockTransactions,
      previousHash: previousBlock.hash,
      hash: newHash,
      nonce,
      quantumSignature: '',
      merkleRoot,
      difficulty: this.DIFFICULTY
    };

    // Sign the block with quantum-resistant signature
    newBlock.quantumSignature = this.signBlock(newBlock);

    // Add block to chain
    this.chain.push(newBlock);

    // Remove processed transactions from pending
    this.pendingTransactions = this.pendingTransactions.slice(this.MAX_TRANSACTIONS);

    // Reward the miner
    const rewardTransaction: QuantumTransaction = {
      id: crypto.randomUUID(),
      from: 'SYSTEM',
      to: minerAddress,
      amount: this.calculateBlockReward(newIndex),
      timestamp: Date.now(),
      quantumSignature: this.signTransaction({
        from: 'SYSTEM',
        to: minerAddress,
        amount: this.calculateBlockReward(newIndex),
        timestamp: Date.now()
      }),
      hash: '',
      status: 'CONFIRMED'
    };

    rewardTransaction.hash = this.calculateTransactionHash(rewardTransaction);
    this.pendingTransactions.push(rewardTransaction);

    logger.info(`Block ${newIndex} mined successfully`, {
      hash: newHash.substring(0, 16) + '...',
      nonce,
      difficulty: this.DIFFICULTY
    });

    return newBlock;
  }

  // Verify the blockchain integrity
  isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Verify current block hash
      if (currentBlock.hash !== this.calculateBlockHash(currentBlock)) {
        logger.error(`Block ${i} hash is invalid`);
        return false;
      }

      // Verify previous block hash reference
      if (currentBlock.previousHash !== previousBlock.hash) {
        logger.error(`Block ${i} previous hash reference is invalid`);
        return false;
      }

      // Verify quantum signature
      if (!this.verifyBlockSignature(currentBlock)) {
        logger.error(`Block ${i} signature is invalid`);
        return false;
      }

      // Verify proof of work
      if (!currentBlock.hash.startsWith('0'.repeat(currentBlock.difficulty))) {
        logger.error(`Block ${i} proof of work is invalid`);
        return false;
      }
    }

    return true;
  }

  // Add a new node to the network
  addNode(nodeUrl: string): void {
    if (!this.nodes.includes(nodeUrl)) {
      this.nodes.push(nodeUrl);
      logger.info(`Node added: ${nodeUrl}`);
    }
  }

  // Replace the chain with a longer valid chain
  replaceChain(newChain: QuantumBlock[]): boolean {
    if (newChain.length <= this.chain.length) {
      return false;
    }

    if (!this.isChainValid()) {
      return false;
    }

    this.chain = newChain;
    logger.info('Chain replaced with longer valid chain');
    return true;
  }

  // Get balance for a specific address
  getBalance(address: string): number {
    let balance = 0;

    for (const block of this.chain) {
      for (const transaction of block.data) {
        if (transaction.from === address) {
          balance -= transaction.amount;
        }
        if (transaction.to === address) {
          balance += transaction.amount;
        }
      }
    }

    return balance;
  }

  // Private helper methods
  private calculateBlockHash(block: any): string {
    const blockString = JSON.stringify(block);
    return QuantumResistantCrypto.hash(blockString);
  }

  private calculateTransactionHash(transaction: any): string {
    const transactionString = JSON.stringify(transaction);
    return QuantumResistantCrypto.hash(transactionString);
  }

  private calculateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    const newHashes: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left;
      const combined = left + right;
      newHashes.push(QuantumResistantCrypto.hash(combined));
    }

    return this.calculateMerkleRoot(newHashes);
  }

  private async signBlock(block: QuantumBlock): Promise<string> {
    const blockData = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      data: block.data,
      previousHash: block.previousHash,
      hash: block.hash,
      nonce: block.nonce,
      merkleRoot: block.merkleRoot
    });

    const signature = await QuantumResistantCrypto.sign(blockData, process.env.QUANTUM_PRIVATE_KEY || '');
    return signature.signature;
  }

  private async verifyBlockSignature(block: QuantumBlock): Promise<boolean> {
    const blockData = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      data: block.data,
      previousHash: block.previousHash,
      hash: block.hash,
      nonce: block.nonce,
      merkleRoot: block.merkleRoot
    });

    return await QuantumResistantCrypto.verify(blockData, block.quantumSignature, process.env.QUANTUM_PUBLIC_KEY || '');
  }

  private signTransaction(transaction: any): string {
    const transactionData = JSON.stringify({
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      timestamp: transaction.timestamp
    });

    // For now, return a placeholder signature
    // In production, this would use the sender's private key
    return QuantumResistantCrypto.hash(transactionData);
  }

  private verifyTransactionSignature(transaction: QuantumTransaction): boolean {
    // For now, return true as a placeholder
    // In production, this would verify the sender's signature
    return true;
  }

  private calculateBlockReward(blockIndex: number): number {
    // Halving every 210,000 blocks (similar to Bitcoin)
    const halvings = Math.floor(blockIndex / 210000);
    const baseReward = 50; // Base reward in energy tokens
    return baseReward / Math.pow(2, halvings);
  }

  private adjustDifficulty(): void {
    const lastBlock = this.getLatestBlock();
    const previousBlock = this.chain[this.chain.length - 101]; // 100 blocks ago

    if (!previousBlock) return;

    const expectedTime = this.BLOCK_TIME * 100;
    const actualTime = lastBlock.timestamp - previousBlock.timestamp;

    if (actualTime < expectedTime / 2) {
      this.DIFFICULTY++;
    } else if (actualTime > expectedTime * 2) {
      this.DIFFICULTY = Math.max(1, this.DIFFICULTY - 1);
    }

    logger.info(`Difficulty adjusted to ${this.DIFFICULTY}`);
  }

  // Get the entire blockchain
  getChain(): QuantumBlock[] {
    return this.chain;
  }

  // Get pending transactions
  getPendingTransactions(): QuantumTransaction[] {
    return this.pendingTransactions;
  }

  // Get blockchain statistics
  getStats(): {
    totalBlocks: number;
    totalTransactions: number;
    difficulty: number;
    lastBlockTime: number;
    averageBlockTime: number;
  } {
    const totalBlocks = this.chain.length;
    const totalTransactions = this.chain.reduce((sum, block) => sum + block.data.length, 0);
    const lastBlockTime = this.chain[totalBlocks - 1]?.timestamp || 0;
    
    let totalBlockTime = 0;
    for (let i = 1; i < this.chain.length; i++) {
      totalBlockTime += this.chain[i].timestamp - this.chain[i - 1].timestamp;
    }
    const averageBlockTime = totalBlocks > 1 ? totalBlockTime / (totalBlocks - 1) : 0;

    return {
      totalBlocks,
      totalTransactions,
      difficulty: this.DIFFICULTY,
      lastBlockTime,
      averageBlockTime
    };
  }
}

export default QuantumResistantBlockchain; 