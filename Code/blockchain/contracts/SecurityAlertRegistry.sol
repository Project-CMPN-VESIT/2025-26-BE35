// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SecurityAlertRegistry
 * @dev Records blockchain transaction security alerts with fraud detection scores
 * 
 * Features:
 * - Immediate alert recording for suspected fraudulent transactions
 * - Risk scoring (0-100) based on ML analysis
 * - Threat pattern cataloging (flash loans, phishing, pump & dump, etc.)
 * - Wallet risk profiles
 * - Recommendation tracking for remediation
 * - Immutable audit trail of all security detections
 */

contract SecurityAlertRegistry {
    
    // Severity levels
    enum Severity { LOW, MEDIUM, HIGH, CRITICAL }
    
    struct SecurityAlert {
        bytes32 alertHash;              // SHA-256 hash of alert data
        address triggeredBy;             // Address that triggered alert
        uint256 timestamp;               // When alert was generated
        bytes32 transactionHash;         // TX being analyzed (if applicable)
        address targetWallet;            // Wallet flagged as risky
        string threatType;               // FLASH_LOAN, PHISHING, PUMP_DUMP, etc.
        uint8 riskScore;                 // 0-100 risk score
        Severity severity;               // Alert severity level
        string ipfsCID;                  // IPFS CID for full alert data
        bool resolved;                   // Has this alert been resolved?
        string resolutionNote;           // Resolution details
    }
    
    struct WalletRiskProfile {
        address wallet;
        uint8 currentRiskScore;          // 0-100
        uint256 totalAlerts;
        uint256 criticalAlerts;
        uint256 lastAlertTimestamp;
        bool blacklisted;
        string blacklistReason;
    }
    
    struct ThreatPattern {
        string patternName;              // e.g., "Isolation Forest Anomaly"
        string description;
        uint8 confidenceScore;           // 0-100
        uint256 detectionTime;
    }
    
    // Storage mappings
    mapping(bytes32 => SecurityAlert) public alerts;
    mapping(address => WalletRiskProfile) public walletProfiles;
    mapping(bytes32 => ThreatPattern[]) public threatPatterns;
    mapping(address => bytes32[]) public walletAlerts;
    
    bytes32[] public allAlerts;
    address[] public blacklistedWallets;
    
    // Events
    event AlertTriggered(
        bytes32 indexed alertHash,
        address indexed targetWallet,
        uint8 riskScore,
        string threatType,
        Severity severity
    );
    
    event AlertResolved(
        bytes32 indexed alertHash,
        address indexed targetWallet,
        string resolutionNote
    );
    
    event WalletBlacklisted(
        address indexed wallet,
        string reason
    );
    
    event WalletRemoved(
        address indexed wallet
    );
    
    event RiskScoreUpdated(
        address indexed wallet,
        uint8 newScore,
        uint256 totalAlerts
    );
    
    // Modifiers
    modifier onlyNewAlert(bytes32 _alertHash) {
        require(alerts[_alertHash].timestamp == 0, "Alert already exists");
        _;
    }
    
    modifier onlyExistingAlert(bytes32 _alertHash) {
        require(alerts[_alertHash].timestamp != 0, "Alert does not exist");
        _;
    }
    
    /**
     * @dev Record a new security alert on-chain
     * @param _alertHash SHA-256 hash of alert data
     * @param _targetWallet Wallet address flagged for suspicious activity
     * @param _threatType Type of threat (e.g., "FLASH_LOAN_ATTACK")
     * @param _riskScore Risk score 0-100
     * @param _severity Alert severity level
     * @param _ipfsCID IPFS CID where full alert details are stored
     */
    function recordAlert(
        bytes32 _alertHash,
        address _targetWallet,
        string calldata _threatType,
        uint8 _riskScore,
        Severity _severity,
        string calldata _ipfsCID
    ) external onlyNewAlert(_alertHash) {
        
        require(_riskScore <= 100, "Risk score must be 0-100");
        require(_targetWallet != address(0), "Invalid target wallet");
        
        // Create alert record
        SecurityAlert memory newAlert = SecurityAlert({
            alertHash: _alertHash,
            triggeredBy: msg.sender,
            timestamp: block.timestamp,
            transactionHash: 0x0,
            targetWallet: _targetWallet,
            threatType: _threatType,
            riskScore: _riskScore,
            severity: _severity,
            ipfsCID: _ipfsCID,
            resolved: false,
            resolutionNote: ""
        });
        
        alerts[_alertHash] = newAlert;
        allAlerts.push(_alertHash);
        walletAlerts[_targetWallet].push(_alertHash);
        
        // Update wallet risk profile
        updateWalletRiskScore(_targetWallet, _riskScore);
        
        // Auto-blacklist if critical
        if (_severity == Severity.CRITICAL && _riskScore >= 85) {
            blacklistWallet(_targetWallet, _threatType);
        }
        
        emit AlertTriggered(_alertHash, _targetWallet, _riskScore, _threatType, _severity);
    }
    
    /**
     * @dev Record transaction-specific alert
     */
    function recordTransactionAlert(
        bytes32 _alertHash,
        bytes32 _transactionHash,
        address _targetWallet,
        string calldata _threatType,
        uint8 _riskScore,
        Severity _severity,
        string calldata _ipfsCID
    ) external onlyNewAlert(_alertHash) {
        
        require(_riskScore <= 100, "Risk score must be 0-100");
        
        SecurityAlert memory newAlert = SecurityAlert({
            alertHash: _alertHash,
            triggeredBy: msg.sender,
            timestamp: block.timestamp,
            transactionHash: _transactionHash,
            targetWallet: _targetWallet,
            threatType: _threatType,
            riskScore: _riskScore,
            severity: _severity,
            ipfsCID: _ipfsCID,
            resolved: false,
            resolutionNote: ""
        });
        
        alerts[_alertHash] = newAlert;
        allAlerts.push(_alertHash);
        walletAlerts[_targetWallet].push(_alertHash);
        
        updateWalletRiskScore(_targetWallet, _riskScore);
        
        if (_severity == Severity.CRITICAL && _riskScore >= 85) {
            blacklistWallet(_targetWallet, _threatType);
        }
        
        emit AlertTriggered(_alertHash, _targetWallet, _riskScore, _threatType, _severity);
    }
    
    /**
     * @dev Record threat pattern detected by ML model
     */
    function addThreatPattern(
        bytes32 _alertHash,
        string calldata _patternName,
        string calldata _description,
        uint8 _confidenceScore
    ) external onlyExistingAlert(_alertHash) {
        
        require(_confidenceScore <= 100, "Confidence score must be 0-100");
        
        ThreatPattern memory pattern = ThreatPattern({
            patternName: _patternName,
            description: _description,
            confidenceScore: _confidenceScore,
            detectionTime: block.timestamp
        });
        
        threatPatterns[_alertHash].push(pattern);
    }
    
    /**
     * @dev Update wallet risk score
     */
    function updateWalletRiskScore(address _wallet, uint8 _newScore) internal {
        require(_newScore <= 100, "Risk score must be 0-100");
        
        WalletRiskProfile storage profile = walletProfiles[_wallet];
        
        if (profile.wallet == address(0)) {
            // Create new profile
            profile.wallet = _wallet;
            profile.currentRiskScore = _newScore;
            profile.totalAlerts = 1;
            profile.lastAlertTimestamp = block.timestamp;
            profile.blacklisted = false;
        } else {
            // Update existing profile
            profile.currentRiskScore = _newScore;
            profile.totalAlerts++;
            profile.lastAlertTimestamp = block.timestamp;
            
            if (_newScore >= 85) {
                profile.criticalAlerts++;
            }
        }
        
        emit RiskScoreUpdated(_wallet, _newScore, profile.totalAlerts);
    }
    
    /**
     * @dev Blacklist a wallet as high-risk
     */
    function blacklistWallet(address _wallet, string memory _reason) public {
        require(_wallet != address(0), "Invalid wallet");
        
        WalletRiskProfile storage profile = walletProfiles[_wallet];
        
        if (!profile.blacklisted) {
            profile.blacklisted = true;
            profile.blacklistReason = _reason;
            blacklistedWallets.push(_wallet);
            
            emit WalletBlacklisted(_wallet, _reason);
        }
    }
    
    /**
     * @dev Remove wallet from blacklist
     */
    function removeFromBlacklist(address _wallet) external {
        require(_wallet != address(0), "Invalid wallet");
        
        WalletRiskProfile storage profile = walletProfiles[_wallet];
        require(profile.blacklisted, "Wallet not blacklisted");
        
        profile.blacklisted = false;
        profile.blacklistReason = "";
        
        emit WalletRemoved(_wallet);
    }
    
    /**
     * @dev Resolve an alert after investigation
     */
    function resolveAlert(bytes32 _alertHash, string calldata _resolutionNote) 
        external 
        onlyExistingAlert(_alertHash) 
    {
        SecurityAlert storage alert = alerts[_alertHash];
        require(!alert.resolved, "Alert already resolved");
        
        alert.resolved = true;
        alert.resolutionNote = _resolutionNote;
        
        emit AlertResolved(_alertHash, alert.targetWallet, _resolutionNote);
    }
    
    /**
     * @dev Get alert details
     */
    function getAlert(bytes32 _alertHash) 
        external 
        view 
        returns (
            address targetWallet,
            string memory threatType,
            uint8 riskScore,
            Severity severity,
            uint256 timestamp,
            bool resolved,
            string memory ipfsCID
        ) 
    {
        SecurityAlert memory alert = alerts[_alertHash];
        return (
            alert.targetWallet,
            alert.threatType,
            alert.riskScore,
            alert.severity,
            alert.timestamp,
            alert.resolved,
            alert.ipfsCID
        );
    }
    
    /**
     * @dev Get wallet risk profile
     */
    function getWalletProfile(address _wallet)
        external
        view
        returns (
            uint8 currentRiskScore,
            uint256 totalAlerts,
            uint256 criticalAlerts,
            uint256 lastAlertTimestamp,
            bool blacklisted
        )
    {
        WalletRiskProfile memory profile = walletProfiles[_wallet];
        return (
            profile.currentRiskScore,
            profile.totalAlerts,
            profile.criticalAlerts,
            profile.lastAlertTimestamp,
            profile.blacklisted
        );
    }
    
    /**
     * @dev Get all alerts for a wallet
     */
    function getWalletAlerts(address _wallet) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return walletAlerts[_wallet];
    }
    
    /**
     * @dev Get recent alerts
     */
    function getRecentAlerts(uint256 _limit) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        uint256 count = allAlerts.length < _limit ? allAlerts.length : _limit;
        bytes32[] memory recent = new bytes32[](count);
        
        for (uint256 i = 0; i < count; i++) {
            recent[i] = allAlerts[allAlerts.length - 1 - i];
        }
        
        return recent;
    }
    
    /**
     * @dev Get threat patterns for alert
     */
    function getThreatPatterns(bytes32 _alertHash) 
        external 
        view 
        returns (ThreatPattern[] memory) 
    {
        return threatPatterns[_alertHash];
    }
    
    /**
     * @dev Check if wallet is blacklisted
     */
    function isBlacklisted(address _wallet) 
        external 
        view 
        returns (bool) 
    {
        return walletProfiles[_wallet].blacklisted;
    }
}
