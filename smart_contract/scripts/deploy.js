const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Registry = await hre.ethers.getContractFactory("AeroLicenseRegistry");
  const registry  = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("AeroLicenseRegistry deployed to:", address);

  // Write backend/.env
  const envPath = path.join(__dirname, "../../backend/.env");
  const envContent = [
    `BLOCKCHAIN_URL=http://127.0.0.1:8545`,
    `CONTRACT_ADDRESS=${address}`,
    `PRIVATE_KEY=${deployer.privateKey}`,
  ].join("\n") + "\n";

  fs.writeFileSync(envPath, envContent);
  console.log("Written to backend/.env");
}

main().catch(err => { console.error(err); process.exit(1); });
