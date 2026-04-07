const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Deploying PredictionRegistry...");
    const PredictionRegistry = await hre.ethers.getContractFactory("PredictionRegistry");
    const registry = await PredictionRegistry.deploy();
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log("PredictionRegistry deployed to:", registryAddress);

    console.log("Deploying SecurityOracle...");
    const SecurityOracle = await hre.ethers.getContractFactory("SecurityOracle");
    const oracle = await SecurityOracle.deploy();
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();
    console.log("SecurityOracle deployed to:", oracleAddress);

    // extract ABIs
    const registryArtifact = await hre.artifacts.readArtifact("PredictionRegistry");
    const oracleArtifact = await hre.artifacts.readArtifact("SecurityOracle");

    const output = {
        network: "local",
        prediction_contract: registryAddress,
        security_contract: oracleAddress,
        prediction_abi: registryArtifact.abi,
        security_abi: oracleArtifact.abi
    };

    const outPath = path.join(__dirname, "../../blockchain/hardhat_deployed_contracts.json");
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

    console.log(`Deployment complete! Contracts saved to ${outPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
