// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PredictionRegistry
 * @dev Records BTC price predictions with cryptographic proof
 * 
 * Features:
 * - Immutable prediction records
 * - Timestamp verification
 * - Performance tracking
 * - Reputation system
 * - Public API for verification
 */

contract PredictionRegistry {
    
    struct Prediction {
        bytes32 predictionHash;      // SHA-256 hash of prediction data
        address predictor;            // Who made the prediction
        uint256 timestamp;            // When prediction was made
        uint256 currentPrice;         // BTC price at prediction time
        string ipfsCID;               // IPFS CID for full prediction data
        bool verified;                // Has prediction been verified?
        uint8 averageAccuracy;        // 0-100 accuracy score after verification
    }
    
    struct PredictorStats {
        uint256 totalPredictions;
        uint256 verifiedPredictions;
        uint256 totalAccuracyScore;   // Sum of all accuracy scores
        uint256 reputationScore;      // 0-1000 reputation
        bool isActive;
    }
    
    // Storage
    mapping(bytes32 => Prediction) public predictions;
    mapping(address => PredictorStats) public predictorStats;
    mapping(address => bytes32[]) public predictorPredictions;
    
    bytes32[] public allPredictions;
    
    // Events
    event PredictionRecorded(
        bytes32 indexed predictionHash,
        address indexed predictor,
        uint256 timestamp,
        uint256 currentPrice,
        string ipfsCID
    );
    
    event PredictionVerified(
        bytes32 indexed predictionHash,
        uint8 accuracyScore,
        uint256 reputationChange
    );
    
    event ReputationUpdated(
        address indexed predictor,
        uint256 newReputation
    );
    
    // Modifiers
    modifier onlyNewPrediction(bytes32 _predictionHash) {
        require(predictions[_predictionHash].timestamp == 0, "Prediction already exists");
        _;
    }
    
    modifier onlyExistingPrediction(bytes32 _predictionHash) {
        require(predictions[_predictionHash].timestamp != 0, "Prediction does not exist");
        _;
    }
    
    /**
     * @dev Record a new prediction on-chain
     * @param _predictionHash SHA-256 hash of prediction data
     * @param _currentPrice Current BTC price (in cents, e.g., 5234700 = $52,347.00)
     * @param _ipfsCID IPFS CID where full prediction is stored
     */
    function recordPrediction(
        bytes32 _predictionHash,
        uint256 _currentPrice,
        string calldata _ipfsCID
    ) external onlyNewPrediction(_predictionHash) {
        
        Prediction memory newPrediction = Prediction({
            predictionHash: _predictionHash,
            predictor: msg.sender,
            timestamp: block.timestamp,
            currentPrice: _currentPrice,
            ipfsCID: _ipfsCID,
            verified: false,
            averageAccuracy: 0
        });
        
        predictions[_predictionHash] = newPrediction;
        allPredictions.push(_predictionHash);
        predictorPredictions[msg.sender].push(_predictionHash);
        
        // Update predictor stats
        PredictorStats storage stats = predictorStats[msg.sender];
        stats.totalPredictions++;
        stats.isActive = true;
        
        emit PredictionRecorded(
            _predictionHash,
            msg.sender,
            block.timestamp,
            _currentPrice,
            _ipfsCID
        );
    }
    
    /**
     * @dev Verify a prediction and update accuracy/reputation
     * @param _predictionHash Hash of the prediction to verify
     * @param _accuracyScore Accuracy score 0-100 (calculated off-chain)
     */
    function verifyPrediction(
        bytes32 _predictionHash,
        uint8 _accuracyScore
    ) external onlyExistingPrediction(_predictionHash) {
        
        require(_accuracyScore <= 100, "Accuracy must be 0-100");
        
        Prediction storage pred = predictions[_predictionHash];
        require(!pred.verified, "Already verified");
        require(msg.sender == pred.predictor, "Only predictor can verify");
        
        // Update prediction
        pred.verified = true;
        pred.averageAccuracy = _accuracyScore;
        
        // Update predictor stats
        PredictorStats storage stats = predictorStats[pred.predictor];
        stats.verifiedPredictions++;
        stats.totalAccuracyScore += _accuracyScore;
        
        // Calculate new reputation (weighted average)
        if (stats.verifiedPredictions > 0) {
            uint256 avgAccuracy = stats.totalAccuracyScore / stats.verifiedPredictions;
            
            // Reputation formula: (avgAccuracy * verifiedCount) / 10
            // Max reputation: 1000 (100% accuracy * 100 predictions / 10)
            stats.reputationScore = (avgAccuracy * stats.verifiedPredictions) / 10;
            
            if (stats.reputationScore > 1000) {
                stats.reputationScore = 1000;
            }
        }
        
        emit PredictionVerified(_predictionHash, _accuracyScore, stats.reputationScore);
        emit ReputationUpdated(pred.predictor, stats.reputationScore);
    }
    
    /**
     * @dev Get prediction details
     */
    function getPrediction(bytes32 _predictionHash) 
        external 
        view 
        returns (
            address predictor,
            uint256 timestamp,
            uint256 currentPrice,
            string memory ipfsCID,
            bool verified,
            uint8 averageAccuracy
        ) 
    {
        Prediction memory pred = predictions[_predictionHash];
        return (
            pred.predictor,
            pred.timestamp,
            pred.currentPrice,
            pred.ipfsCID,
            pred.verified,
            pred.averageAccuracy
        );
    }
    
    /**
     * @dev Get predictor statistics
     */
    function getPredictorStats(address _predictor)
        external
        view
        returns (
            uint256 totalPredictions,
            uint256 verifiedPredictions,
            uint256 averageAccuracy,
            uint256 reputationScore
        )
    {
        PredictorStats memory stats = predictorStats[_predictor];
        
        uint256 avgAcc = 0;
        if (stats.verifiedPredictions > 0) {
            avgAcc = stats.totalAccuracyScore / stats.verifiedPredictions;
        }
        
        return (
            stats.totalPredictions,
            stats.verifiedPredictions,
            avgAcc,
            stats.reputationScore
        );
    }
    
    /**
     * @dev Get all predictions by a predictor
     */
    function getPredictorPredictions(address _predictor) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return predictorPredictions[_predictor];
    }
    
    /**
     * @dev Get total number of predictions
     */
    function getTotalPredictions() external view returns (uint256) {
        return allPredictions.length;
    }
    
    /**
     * @dev Get latest N predictions
     */
    function getLatestPredictions(uint256 _count) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        uint256 total = allPredictions.length;
        uint256 count = _count > total ? total : _count;
        
        bytes32[] memory latest = new bytes32[](count);
        
        for (uint256 i = 0; i < count; i++) {
            latest[i] = allPredictions[total - 1 - i];
        }
        
        return latest;
    }
}


/**
 * @title SecurityOracle
 * @dev Smart contract for transaction security alerts
 * 
 * Features:
 * - Record high-risk transactions
 * - Alert system for suspicious activity
 * - Blacklist management
 * - Integration with ML risk scoring
 */

contract SecurityOracle {
    
    enum RiskLevel { LOW, MEDIUM, HIGH, CRITICAL }
    
    struct SecurityAlert {
        bytes32 alertId;
        address flaggedAddress;
        RiskLevel riskLevel;
        uint8 riskScore;           // 0-100
        string alertType;
        uint256 timestamp;
        bool resolved;
    }
    
    struct AddressRiskProfile {
        uint8 currentRiskScore;
        uint256 totalAlerts;
        uint256 criticalAlerts;
        bool isBlacklisted;
        uint256 lastUpdate;
    }
    
    // Storage
    mapping(bytes32 => SecurityAlert) public alerts;
    mapping(address => AddressRiskProfile) public riskProfiles;
    mapping(address => bytes32[]) public addressAlerts;
    
    bytes32[] public allAlerts;
    address[] public blacklistedAddresses;
    
    // Access control
    address public owner;
    mapping(address => bool) public oracles;  // Authorized oracles (ML system)
    
    // Events
    event AlertCreated(
        bytes32 indexed alertId,
        address indexed flaggedAddress,
        RiskLevel riskLevel,
        uint8 riskScore
    );
    
    event AddressBlacklisted(
        address indexed flaggedAddress,
        uint256 timestamp
    );
    
    event AlertResolved(
        bytes32 indexed alertId,
        uint256 timestamp
    );
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyOracle() {
        require(oracles[msg.sender] || msg.sender == owner, "Only authorized oracle");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        oracles[msg.sender] = true;  // Owner is default oracle
    }
    
    /**
     * @dev Add authorized oracle (ML system address)
     */
    function addOracle(address _oracle) external onlyOwner {
        oracles[_oracle] = true;
    }
    
    /**
     * @dev Remove oracle authorization
     */
    function removeOracle(address _oracle) external onlyOwner {
        oracles[_oracle] = false;
    }
    
    /**
     * @dev Create security alert (called by ML system)
     */
    function createAlert(
        address _flaggedAddress,
        uint8 _riskScore,
        string calldata _alertType
    ) external onlyOracle returns (bytes32) {
        
        require(_riskScore <= 100, "Risk score must be 0-100");
        
        // Generate alert ID
        bytes32 alertId = keccak256(abi.encodePacked(
            _flaggedAddress,
            block.timestamp,
            _riskScore
        ));
        
        // Determine risk level
        RiskLevel level;
        if (_riskScore >= 80) level = RiskLevel.CRITICAL;
        else if (_riskScore >= 60) level = RiskLevel.HIGH;
        else if (_riskScore >= 40) level = RiskLevel.MEDIUM;
        else level = RiskLevel.LOW;
        
        // Create alert
        SecurityAlert memory alert = SecurityAlert({
            alertId: alertId,
            flaggedAddress: _flaggedAddress,
            riskLevel: level,
            riskScore: _riskScore,
            alertType: _alertType,
            timestamp: block.timestamp,
            resolved: false
        });
        
        alerts[alertId] = alert;
        allAlerts.push(alertId);
        addressAlerts[_flaggedAddress].push(alertId);
        
        // Update risk profile
        AddressRiskProfile storage profile = riskProfiles[_flaggedAddress];
        profile.currentRiskScore = _riskScore;
        profile.totalAlerts++;
        profile.lastUpdate = block.timestamp;
        
        if (level == RiskLevel.CRITICAL) {
            profile.criticalAlerts++;
            
            // Auto-blacklist after 3 critical alerts
            if (profile.criticalAlerts >= 3 && !profile.isBlacklisted) {
                profile.isBlacklisted = true;
                blacklistedAddresses.push(_flaggedAddress);
                emit AddressBlacklisted(_flaggedAddress, block.timestamp);
            }
        }
        
        emit AlertCreated(alertId, _flaggedAddress, level, _riskScore);
        
        return alertId;
    }
    
    /**
     * @dev Check if address is high risk
     */
    function isHighRisk(address _address) external view returns (bool, uint8) {
        AddressRiskProfile memory profile = riskProfiles[_address];
        
        bool highRisk = profile.currentRiskScore >= 60 || profile.isBlacklisted;
        
        return (highRisk, profile.currentRiskScore);
    }
    
    /**
     * @dev Get address risk profile
     */
    function getRiskProfile(address _address)
        external
        view
        returns (
            uint8 currentRiskScore,
            uint256 totalAlerts,
            uint256 criticalAlerts,
            bool isBlacklisted
        )
    {
        AddressRiskProfile memory profile = riskProfiles[_address];
        return (
            profile.currentRiskScore,
            profile.totalAlerts,
            profile.criticalAlerts,
            profile.isBlacklisted
        );
    }
    
    /**
     * @dev Resolve an alert (mark as handled)
     */
    function resolveAlert(bytes32 _alertId) external onlyOracle {
        require(alerts[_alertId].timestamp != 0, "Alert does not exist");
        require(!alerts[_alertId].resolved, "Already resolved");
        
        alerts[_alertId].resolved = true;
        
        emit AlertResolved(_alertId, block.timestamp);
    }
    
    /**
     * @dev Get all alerts for an address
     */
    function getAddressAlerts(address _address) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return addressAlerts[_address];
    }
    
    /**
     * @dev Get blacklisted addresses
     */
    function getBlacklistedAddresses() external view returns (address[] memory) {
        return blacklistedAddresses;
    }
}
