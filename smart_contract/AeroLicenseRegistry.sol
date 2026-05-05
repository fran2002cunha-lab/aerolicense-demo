// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * AeroLicense v2 — Registo Imutável + Renovação + NFT de Licenças
 *
 * Melhorias v2:
 *  - Renovação de documentos com ligação ao documento anterior
 *  - Emissão de licenças como NFT (ERC-721 simplificado)
 *  - Eventos de alerta automático na blockchain
 *  - Marketplace de entidades certificadas
 *  - DID (Decentralized Identity) por piloto
 */
contract AeroLicenseRegistry {

    // ── Tipos ─────────────────────────────────────────────────────────────
    enum DocType { ATPL, MEDICAL_CLASS1, ICAO_ENGLISH, TYPE_RATING, CRM_TRAINING, OTHER }
    enum AlertLevel { OK, WARNING_90, WARNING_30, URGENT_7, EXPIRED }

    struct Document {
        bytes32  hash;
        DocType  docType;
        string   description;
        uint256  issuedAt;
        uint256  expiresAt;
        address  owner;
        bool     isRevoked;
        bytes32  previousVersion;  // NOVO: ligação ao doc anterior (renovação)
        address  issuedBy;         // NOVO: entidade emissora
    }

    // NOVO: NFT de licença (ERC-721 simplificado)
    struct License {
        uint256  tokenId;
        address  pilot;
        string   licenseNumber;   // ex: "PT.FCL.A.123456"
        DocType  licenseType;
        uint256  issuedAt;
        uint256  expiresAt;
        bool     isActive;
    }

    // NOVO: Entidade certificada no marketplace
    struct CertifiedEntity {
        string  name;
        string  entityType;       // "clinic", "training_center", "exam_center"
        string  country;
        bool    isActive;
    }

    // ── Estado ────────────────────────────────────────────────────────────
    mapping(bytes32  => Document)       public documents;
    mapping(address  => bytes32[])      public pilotDocuments;
    mapping(address  => bool)           public authorizedIssuers;
    mapping(address  => string)         public pilotDID;           // NOVO: DID por piloto
    mapping(uint256  => License)        public licenses;           // NOVO: NFT licenses
    mapping(address  => uint256[])      public pilotLicenses;      // NOVO: licenses por piloto
    mapping(address  => CertifiedEntity) public certifiedEntities; // NOVO: marketplace

    address public owner;
    uint256 private _nextTokenId;

    // ── Eventos ───────────────────────────────────────────────────────────
    event DocumentRegistered(address indexed pilot, bytes32 indexed hash, DocType docType, uint256 expiresAt);
    event DocumentRenewed(bytes32 indexed oldHash, bytes32 indexed newHash, address pilot);
    event DocumentRevoked(bytes32 indexed hash, address revokedBy);
    event DocumentAlert(address indexed pilot, bytes32 hash, AlertLevel level, uint256 daysLeft);
    event LicenseIssued(uint256 indexed tokenId, address indexed pilot, string licenseNumber);
    event DIDRegistered(address indexed pilot, string did);
    event EntityCertified(address indexed entity, string name, string entityType);

    // ── Modificadores ─────────────────────────────────────────────────────
    modifier onlyOwner()  { require(msg.sender == owner, "Apenas owner"); _; }
    modifier onlyIssuer() { require(authorizedIssuers[msg.sender], "Nao autorizado"); _; }
    modifier docExists(bytes32 _hash) { require(documents[_hash].issuedAt != 0, "Nao existe"); _; }

    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
    }

    // ── Documentos ────────────────────────────────────────────────────────

    function registerDocument(
        address  _pilot,
        bytes32  _hash,
        DocType  _docType,
        string   calldata _desc,
        uint256  _expiresAt
    ) external onlyIssuer {
        require(documents[_hash].issuedAt == 0, "Ja existe");
        require(_expiresAt > block.timestamp, "Expiracao no passado");

        documents[_hash] = Document({
            hash:            _hash,
            docType:         _docType,
            description:     _desc,
            issuedAt:        block.timestamp,
            expiresAt:       _expiresAt,
            owner:           _pilot,
            isRevoked:       false,
            previousVersion: bytes32(0),
            issuedBy:        msg.sender
        });
        pilotDocuments[_pilot].push(_hash);
        emit DocumentRegistered(_pilot, _hash, _docType, _expiresAt);
    }

    // NOVO: renovação — liga o novo ao antigo
    function renewDocument(
        bytes32 _oldHash,
        bytes32 _newHash,
        string  calldata _desc,
        uint256 _newExpiry
    ) external onlyIssuer docExists(_oldHash) {
        require(documents[_newHash].issuedAt == 0, "Novo hash ja existe");

        Document storage old = documents[_oldHash];
        old.isRevoked = true;

        documents[_newHash] = Document({
            hash:            _newHash,
            docType:         old.docType,
            description:     _desc,
            issuedAt:        block.timestamp,
            expiresAt:       _newExpiry,
            owner:           old.owner,
            isRevoked:       false,
            previousVersion: _oldHash,     // cadeia de renovações
            issuedBy:        msg.sender
        });
        pilotDocuments[old.owner].push(_newHash);
        emit DocumentRenewed(_oldHash, _newHash, old.owner);
    }

    function verifyDocument(bytes32 _hash)
        external view docExists(_hash)
        returns (bool valid, bool expired, uint256 expiresAt, address issuedBy)
    {
        Document storage doc = documents[_hash];
        return (!doc.isRevoked, block.timestamp > doc.expiresAt, doc.expiresAt, doc.issuedBy);
    }

    function revokeDocument(bytes32 _hash) external onlyIssuer docExists(_hash) {
        documents[_hash].isRevoked = true;
        emit DocumentRevoked(_hash, msg.sender);
    }

    // NOVO: emitir alerta na blockchain (chamado pelo backend via cron)
    function emitAlert(bytes32 _hash, AlertLevel _level) external onlyIssuer docExists(_hash) {
        Document storage doc = documents[_hash];
        uint256 daysLeft = doc.expiresAt > block.timestamp
            ? (doc.expiresAt - block.timestamp) / 86400 : 0;
        emit DocumentAlert(doc.owner, _hash, _level, daysLeft);
    }

    function getDocumentsByPilot(address _pilot) external view returns (bytes32[] memory) {
        return pilotDocuments[_pilot];
    }

    function daysUntilExpiry(bytes32 _hash) external view docExists(_hash) returns (uint256) {
        uint256 expiry = documents[_hash].expiresAt;
        if (block.timestamp >= expiry) return 0;
        return (expiry - block.timestamp) / 86400;
    }

    // ── NFT de Licenças ───────────────────────────────────────────────────

    // NOVO: emitir licença como token único (NFT)
    function issueLicense(
        address _pilot,
        string  calldata _licenseNumber,
        DocType _licenseType,
        uint256 _expiresAt
    ) external onlyIssuer returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        licenses[tokenId] = License({
            tokenId:       tokenId,
            pilot:         _pilot,
            licenseNumber: _licenseNumber,
            licenseType:   _licenseType,
            issuedAt:      block.timestamp,
            expiresAt:     _expiresAt,
            isActive:      true
        });
        pilotLicenses[_pilot].push(tokenId);
        emit LicenseIssued(tokenId, _pilot, _licenseNumber);
    }

    function getLicensesByPilot(address _pilot) external view returns (uint256[] memory) {
        return pilotLicenses[_pilot];
    }

    // ── DID — Identidade Descentralizada ──────────────────────────────────

    // NOVO: registar DID do piloto
    function registerDID(address _pilot, string calldata _did) external onlyIssuer {
        pilotDID[_pilot] = _did;
        emit DIDRegistered(_pilot, _did);
    }

    function resolveDID(address _pilot) external view returns (string memory) {
        return pilotDID[_pilot];
    }

    // ── Marketplace de Entidades ──────────────────────────────────────────

    // NOVO: certificar entidade no marketplace
    function certifyEntity(
        address _entity,
        string  calldata _name,
        string  calldata _entityType,
        string  calldata _country
    ) external onlyOwner {
        certifiedEntities[_entity] = CertifiedEntity({
            name:       _name,
            entityType: _entityType,
            country:    _country,
            isActive:   true
        });
        emit EntityCertified(_entity, _name, _entityType);
    }

    function isEntityCertified(address _entity) external view returns (bool) {
        return certifiedEntities[_entity].isActive;
    }

    // ── Admin ─────────────────────────────────────────────────────────────
    function authorizeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = true;
    }
}
