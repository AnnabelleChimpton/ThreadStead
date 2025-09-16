# ThreadStead Data Processing Register

**Document Version:** 1.0
**Last Updated:** 2024-12-15
**Next Review:** 2025-06-15

## 1. Personal Data Categories & Processing Purposes

### 1.1 User Identity Data

| Data Type | Purpose | Lawful Basis | Retention Period | Storage Location |
|-----------|---------|--------------|------------------|------------------|
| User ID (CUID) | System identification | Legitimate Interest | Account lifetime + 30 days | PostgreSQL Database |
| DID (Decentralized ID) | Identity verification | Legitimate Interest | Account lifetime + 30 days | PostgreSQL Database |
| Primary Handle | User identification | Contract Performance | Account lifetime + 30 days | PostgreSQL Database |
| Email Address (encrypted) | Authentication, communication | Contract Performance | Account lifetime + 30 days | PostgreSQL Database (AES-256-GCM) |
| Password Hash | Authentication | Contract Performance | Account lifetime + 30 days | PostgreSQL Database (bcrypt) |
| Encrypted Seed Phrase | Decentralized identity | Contract Performance | Account lifetime + 30 days | PostgreSQL Database |

**Processing Activities:**
- Account creation and management
- User authentication and authorization
- Identity verification for decentralized features
- Security monitoring and fraud prevention

**Data Subjects:** Registered users of ThreadStead platform

**Recipients:** No third parties (data processed internally only)

**International Transfers:** No international transfers outside EU/EEA

### 1.2 Profile Information

| Data Type | Purpose | Lawful Basis | Retention Period | Storage Location |
|-----------|---------|--------------|------------------|------------------|
| Display Name | User identification | Contract Performance | Account lifetime + 30 days | PostgreSQL Database |
| Bio | Profile customization | Contract Performance | Account lifetime + 30 days | PostgreSQL Database |
| Avatar/Banner Images | Profile customization | Contract Performance | Account lifetime + 90 days | R2/S3 Storage |
| Custom CSS/Templates | Profile customization | Contract Performance | Account lifetime + 30 days | PostgreSQL Database |
| Badge Preferences | UI preferences | Legitimate Interest | Account lifetime + 30 days | PostgreSQL Database |

**Processing Activities:**
- Profile display and customization
- Social interaction features
- Platform personalization

**Data Subjects:** Registered users who create profiles

**Recipients:** Other platform users (based on privacy settings)

**International Transfers:** No international transfers outside EU/EEA

### 1.3 Content Data

| Data Type | Purpose | Lawful Basis | Retention Period | Storage Location |
|-----------|---------|--------------|------------------|------------------|
| Posts (text/markdown) | Content creation | Contract Performance | Account lifetime + 30 days | PostgreSQL Database |
| Comments | Social interaction | Contract Performance | Account lifetime + 30 days | PostgreSQL Database |
| Media Uploads | Content sharing | Contract Performance | Account lifetime + 90 days | R2/S3 Storage |
| Guestbook Entries | Social interaction | Contract Performance | Account lifetime + 30 days | PostgreSQL Database |
| ThreadRing Memberships | Community participation | Contract Performance | Account lifetime + 30 days | PostgreSQL Database |

**Processing Activities:**
- Content creation, editing, and publishing
- Social interactions (comments, follows)
- Community features (ThreadRings)
- Content moderation and safety

**Data Subjects:** Users who create content or participate in social features

**Recipients:** Other platform users (based on content visibility settings)

**International Transfers:** No international transfers outside EU/EEA

### 1.4 Technical Data

| Data Type | Purpose | Lawful Basis | Retention Period | Storage Location |
|-----------|---------|--------------|------------------|------------------|
| Session Tokens | Authentication | Legitimate Interest | Session expiry (24 hours) | PostgreSQL Database |
| Login Timestamps | Security monitoring | Legitimate Interest | 12 months | PostgreSQL Database |
| IP Addresses | Security, fraud prevention | Legitimate Interest | 12 months | PostgreSQL Database |
| User Agent Strings | Technical compatibility | Legitimate Interest | 12 months | PostgreSQL Database |
| Capability Grants | Authorization | Contract Performance | Grant expiry | PostgreSQL Database |

**Processing Activities:**
- Session management and authentication
- Security monitoring and fraud detection
- Technical performance optimization
- Abuse prevention

**Data Subjects:** All platform users

**Recipients:** No third parties (processed internally only)

**International Transfers:** No international transfers outside EU/EEA

### 1.5 Analytics Data

| Data Type | Purpose | Lawful Basis | Retention Period | Storage Location |
|-----------|---------|--------------|------------------|------------------|
| Page Views | Platform improvement | Consent (Analytics) | 24 months | Local Analytics |
| Feature Usage | Product development | Consent (Analytics) | 24 months | Local Analytics |
| Performance Metrics | Technical optimization | Consent (Analytics) | 12 months | Local Analytics |

**Processing Activities:**
- Platform usage analysis
- Performance monitoring
- Feature development planning
- User experience improvement

**Data Subjects:** Users who consent to analytics

**Recipients:** No third parties (processed internally only)

**International Transfers:** No international transfers outside EU/EEA

## 2. Data Subject Rights

### 2.1 Right of Access (Article 15 GDPR)
- **Implementation:** User can view their profile and account data through UI
- **Response Time:** Real-time via interface, formal requests within 30 days
- **Format:** JSON export available through API

### 2.2 Right to Rectification (Article 16 GDPR)
- **Implementation:** Users can edit profile information, posts, and settings
- **Response Time:** Real-time via interface
- **Restrictions:** Historical audit logs preserved for security

### 2.3 Right to Erasure (Article 17 GDPR)
- **Implementation:** Comprehensive deletion script (`scripts/delete-user.ts`)
- **Response Time:** Within 30 days of request
- **Scope:** Complete removal across all database tables and storage
- **Exceptions:** Essential logs for security may be retained (anonymized)

### 2.4 Right to Data Portability (Article 20 GDPR)
- **Implementation:** Data export functionality (`scripts/export-sample-threadring-data.ts`)
- **Format:** JSON structured data
- **Scope:** All user-created content and profile data
- **Response Time:** Within 30 days

### 2.5 Right to Object (Article 21 GDPR)
- **Implementation:** Consent withdrawal mechanisms in user settings
- **Response Time:** Real-time via interface
- **Scope:** All non-essential processing (analytics, marketing)

### 2.6 Right to Restrict Processing (Article 18 GDPR)
- **Implementation:** Account suspension without deletion
- **Response Time:** Within 30 days
- **Duration:** Until issue resolution or erasure request

## 3. Security Measures

### 3.1 Technical Safeguards
- **Encryption at Rest:** AES-256-GCM for sensitive data
- **Encryption in Transit:** HTTPS/TLS 1.3
- **Password Security:** bcrypt hashing (12 rounds minimum)
- **Session Security:** Secure tokens with proper expiration
- **Database Security:** Parameterized queries, input validation

### 3.2 Access Controls
- **Role-Based Access:** Admin, member roles with defined permissions
- **Authentication:** Multi-factor authentication supported
- **Authorization:** Capability-based access control system
- **Audit Logging:** All administrative actions logged

### 3.3 Data Minimization
- **Collection:** Only necessary data collected
- **Processing:** Purpose limitation enforced
- **Storage:** Automated cleanup of expired tokens
- **Retention:** Defined retention periods for all data types

## 4. Vendor/Third-Party Processing

### 4.1 Email Service Provider
- **Vendor:** Resend (EU-based)
- **Purpose:** Transactional emails, login tokens
- **Data Processed:** Email addresses, user names
- **Safeguards:** GDPR-compliant vendor, data processing agreement
- **Retention:** As per vendor policy (max 30 days for bounces)

### 4.2 File Storage Provider
- **Vendor:** Cloudflare R2 / AWS S3
- **Purpose:** Media file storage (images, uploads)
- **Data Processed:** User-uploaded files, profile images
- **Safeguards:** EU region selection, encryption at rest
- **Retention:** Account lifetime + 90 days

## 5. Data Breach Response

### 5.1 Detection
- **Monitoring:** Database access monitoring
- **Alerting:** Automated alerts for unusual access patterns
- **Investigation:** Immediate investigation protocol

### 5.2 Response Procedure
1. **Immediate Response** (0-1 hours):
   - Contain the breach
   - Assess impact and affected data
   - Document incident details

2. **Assessment** (1-24 hours):
   - Determine likelihood of harm to individuals
   - Assess if notification required (high risk threshold)
   - Prepare initial incident report

3. **Notification** (24-72 hours):
   - Notify supervisory authority if required
   - Notify affected individuals if high risk
   - Provide clear information about the breach

### 5.3 Prevention Measures
- Regular security assessments
- Staff training on data protection
- Incident response plan testing
- Continuous monitoring implementation

## 6. Retention Schedule

| Data Category | Standard Retention | Deletion Trigger | Legal Basis |
|---------------|-------------------|------------------|-------------|
| User Accounts | Account lifetime + 30 days | Account deletion + 30 days | Contract completion |
| Content Data | Account lifetime + 30 days | Account deletion + 30 days | Contract completion |
| Profile Media | Account lifetime + 90 days | Account deletion + 90 days | Storage optimization |
| Session Data | 24 hours | Session expiry | Technical necessity |
| Audit Logs | 12 months | Fixed retention period | Legal compliance |
| Analytics Data | 24 months | Consent withdrawal | Consent-based |
| IP Address Logs | 12 months | Fixed retention period | Security necessity |

## 7. Contact Information

**Data Protection Officer:** [To be appointed]
**Privacy Contact:** privacy@threadstead.com
**Legal Basis Documentation:** Available upon request
**Supervisory Authority:** [Relevant EU DPA based on establishment]

## 8. Document Control

| Version | Date | Changes | Approved By |
|---------|------|---------|-------------|
| 1.0 | 2024-12-15 | Initial version | [Name] |

**Review Schedule:** Every 6 months or upon significant system changes
**Next Review Date:** 2025-06-15
**Distribution:** Development team, management, compliance team