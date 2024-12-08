import { EAS, SchemaEncoder, NO_EXPIRATION } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from 'ethers';
import { Wallet } from '@coinbase/coinbase-sdk';

// EAS Contract Address (base sepolia)
const EAS_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000021";


const SCHEMA_UID = "0xa675e7d3cb744939523f5bfb5a47eada9c89f74cf2cbc1fa5b39ef005373ca3e";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category, blobId, walletData } = req.body;

    // Import the agent wallet using CDP
    let agentWallet;
    try {
      agentWallet = await Wallet.import({
        walletId: walletData.walletId,
        seed: walletData.seed
      });
    } catch (importError) {
      console.error('Error importing wallet:', importError);
      return res.status(500).json({ error: 'Failed to import wallet' });
    }

    // Get the agent's address
    const agentAddress = await agentWallet.getAddress();

    // Create a provider and signer using the agent wallet
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const signer = new ethers.Wallet(agentWallet.privateKey, provider);

    // Initialize EAS with the agent wallet
    const eas = new EAS(EAS_CONTRACT_ADDRESS);
    eas.connect(signer);

    // Initialize SchemaEncoder with the schema string
    const schemaEncoder = new SchemaEncoder("string category, string blobId, address attestedBy");
    
    // Encode the data
    const encodedData = schemaEncoder.encodeData([
      { name: "category", value: category, type: "string" },
      { name: "blobId", value: blobId, type: "string" },
      { name: "attestedBy", value: agentAddress, type: "address" }
    ]);

    // Create the attestation using the agent wallet
    const transaction = await eas.attest({
      schema: SCHEMA_UID,
      data: {
        recipient: agentAddress,
        expirationTime: NO_EXPIRATION,
        revocable: true,
        data: encodedData,
      },
    });

    // Wait for the transaction to be mined
    const newAttestationUID = await transaction.wait();

    // Return the attestation UID and transaction receipt
    res.status(200).json({
      success: true,
      attestationUID: newAttestationUID,
      transactionHash: transaction.hash,
      attestedBy: agentAddress
    });

  } catch (error) {
    console.error('Error creating attestation:', error);
    res.status(500).json({ error: 'Failed to create attestation', details: error.message });
  }
} 