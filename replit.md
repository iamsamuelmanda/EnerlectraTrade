# Overview

Enerlectra is a decentralized energy trading platform designed for the African market, specifically targeting Zambia. The platform enables peer-to-peer energy trading, energy cluster leasing, and includes USSD mobile access for users without smartphones. The system focuses on sustainable energy commerce with carbon footprint tracking and uses Zambian Kwacha (ZMW) as the primary currency alongside kilowatt-hours (kWh) for energy transactions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Backend Architecture
- **Framework**: Express.js with TypeScript for type safety and better development experience
- **API Design**: RESTful API with consistent response format using ApiResponse interface
- **Route Organization**: Modular route handlers separated by functionality (wallet, trade, lease, carbon, ussd, cluster, transactions)
- **Error Handling**: Centralized error responses with consistent structure across all endpoints

## Data Storage
- **Database**: File-based JSON storage system using local JSON files
- **Data Models**: Strongly typed interfaces for User, Cluster, Transaction, and USSD interactions
- **Data Management**: Utility functions for reading/writing JSON files with error handling
- **Transaction System**: Simple transaction recording without complex database transactions

## Core Features Architecture

### Energy Trading System
- Peer-to-peer energy trading between users
- Energy cluster leasing from renewable energy sources
- Fixed exchange rate of 1 kWh = 1.2 ZMW
- Balance validation before transactions
- Bulk trading operations for multiple transactions
- Scheduled energy transactions for future execution

### USSD Integration
- Menu-driven USSD interface for feature phone users
- Session management for multi-level interactions
- User registration and management via phone numbers
- Complete functionality accessible without internet
- Enhanced mobile money integration within USSD

### Carbon Footprint Tracking
- Automatic carbon savings calculation (0.8kg CO2 per kWh)
- Environmental impact metrics (trees equivalent, car miles offset)
- User-specific carbon impact reporting

### Wallet Management
- Dual balance system (ZMW currency and kWh energy)
- Real-time balance updates
- Transaction history tracking

### Advanced Features (Added December 2024)

#### 1. Market Dashboard & Analytics
- Real-time platform statistics and market health indicators
- User economy metrics and energy market analysis
- Transaction volume tracking and market trends
- System utilization rates and liquidity analysis

#### 2. User Registration System
- Zambian phone number validation (+260XXXXXXXXX format)
- Automated user creation with starting balance
- User profile management and lookup functionality
- Admin view for user management and statistics

#### 3. Dynamic Pricing Engine
- Real-time market rate calculations based on supply/demand
- Time-of-day pricing (peak/off-peak hours)
- Cluster-specific pricing with utilization adjustments
- Historical price tracking and trend analysis
- Price volatility monitoring and recommendations

#### 4. Bulk Operations
- Multiple energy trades in single transaction (up to 50 trades)
- Bulk energy purchases from clusters (up to 30 purchases)
- Comprehensive validation and error handling
- Individual transaction result tracking

#### 5. Energy Scheduling System
- Future energy trade scheduling (up to 30 days)
- Automated execution at scheduled times
- Price limits and maximum cost protection
- Schedule management and cancellation options

#### 6. Real-time Cluster Monitoring
- Health status monitoring with scoring system
- Utilization tracking and capacity management
- Performance metrics and revenue analysis
- Predictive analytics for capacity planning
- Alert generation for critical conditions

#### 7. Mobile Money Integration
- Complete mobile wallet functionality via USSD
- Deposit, withdrawal, and transfer operations
- Transaction limits and security validation
- Money transfer between users
- Transaction history and reference tracking

#### 8. Price Alert System
- Customizable price alerts (drop/rise thresholds)
- Supply and demand condition monitoring
- USSD interface for alert management
- SMS notification simulation
- Alert history and subscription management

## Security and Validation
- Input validation for all API endpoints
- Phone number-based user identification for USSD
- Balance verification before transactions
- Type safety enforced through TypeScript interfaces

## Development Setup
- TypeScript compilation with ES2020 target
- CORS enabled for cross-origin requests
- Request logging middleware for debugging
- Health check endpoint for monitoring

# External Dependencies

## Core Dependencies
- **Express.js**: Web framework for REST API
- **CORS**: Cross-origin resource sharing middleware
- **TypeScript**: Type safety and enhanced development experience
- **ts-node**: TypeScript execution for development

## Development Tools
- **@types packages**: TypeScript definitions for Express, CORS, and Node.js
- **Node.js**: Runtime environment

## Notable Absences
- No database system (using file-based storage)
- No authentication system (phone number-based identification)
- No external payment gateways
- No real-time communication systems
- No external API integrations for energy data

The architecture prioritizes simplicity and accessibility, particularly for users in regions with limited internet connectivity through the USSD interface. The system is designed to be easily deployable and maintainable without complex infrastructure requirements.

## CI/CD and Deployment Architecture (Added August 2025)

### GitHub Integration
- **Repository**: Configured for CI/CD with GitHub Actions
- **Branch Strategy**: main (production), develop (staging), feature branches
- **Automated Testing**: API endpoint testing with 90%+ success rate
- **Security Scanning**: Dependency audits and vulnerability checks
- **Performance Testing**: Response time monitoring and health checks

### Deployment Pipeline
- **Continuous Integration**: Automated build, test, and security scanning
- **Multi-environment**: Staging and production deployment workflows
- **Docker Support**: Containerized application with health checks
- **Automated Deployment**: Push-to-deploy from main and develop branches

### AI Integration Architecture
- **Anomaly Detection**: Transaction pattern analysis using Anthropic Claude
- **User Assistance**: Natural language query support for platform guidance
- **Market Insights**: AI-powered market analysis and trading recommendations
- **Fraud Prevention**: Automated risk assessment and suspicious activity detection

### Blockchain Payment Integration
- **Hybrid Payment System**: Combined blockchain and mobile money transactions
- **Mock Blockchain**: Development simulation of energy token transfers
- **Wallet Management**: Multi-wallet support (energy tokens, payment tokens)
- **Payment Methods**: Flexible payment options (blockchain, mobile money, hybrid)

### Development and Testing
- **Automated Testing**: Comprehensive API test suite with 10 core endpoint tests
- **Health Monitoring**: Continuous health checks and performance metrics
- **Error Handling**: Robust error responses and logging throughout the system
- **Documentation**: Complete API documentation and GitHub templates

The enhanced architecture maintains the original focus on African energy access while adding enterprise-grade features for scalability, security, and user experience.

## Innerlectra Cluster Architecture Evolution (Added August 2025)

### Community-Focused Energy Cooperatives
The platform has evolved to include comprehensive cluster-based energy cooperatives, transforming individual energy trading into community-driven sustainability:

#### Cluster Types and Structure
- **Micro-clusters**: 10-25 households sharing 1 solar installation
- **Neighborhood clusters**: 50-100 prosumers with distributed solar panels/inverters  
- **Industrial clusters**: 1-2 independent power producers (small solar farms, co-ops, mining operations)
- **Supply clusters**: 2-3 solar equipment suppliers offering bulk pricing

#### Cluster Economics Model
- **Pooled Purchasing**: Members contribute 2,000-5,000 ZMW each for shared solar equipment
- **Democratic Governance**: Voting system for equipment purchases, maintenance, new members
- **Energy Sharing**: Automatic distribution based on contribution and usage patterns
- **Cross-Cluster Trading**: Surplus energy sales between cooperatives
- **Shared Asset Management**: Equipment cost range 22,000-45,000 ZMW with proportional ownership

#### Advanced Cluster Features
- **AI-Powered Distribution**: Auto-balancing energy based on member usage patterns
- **Predictive Maintenance**: Equipment health monitoring and service alerts
- **Dynamic Pricing**: Cluster-to-cluster energy prices based on supply/demand
- **Reputation System**: Inter-cluster trading reliability scoring
- **Regional Specialization**: Kabwe (university partnerships), Lusaka (urban complexes), Rural (village micro-grids), Copperbelt (industrial sharing)

#### Cluster Management API (15+ New Endpoints)
- **Cluster Creation**: `/clusters/create` - Form new energy cooperatives
- **Membership Management**: `/clusters/join` - Join existing clusters with contribution-based shares  
- **Governance System**: `/clusters/:id/vote` - Democratic decision making on proposals
- **Asset Management**: `/clusters/:id/assets` - Shared equipment tracking and maintenance
- **Energy Distribution**: `/clusters/:id/energy/distribute` - Automated energy allocation
- **Financial Analytics**: `/clusters/:id/returns` - Member return on investment calculations
- **Dashboard Interface**: `/clusters/:id/dashboard` - Real-time cluster performance metrics

#### Gamification and Community Building
- **Cluster Badges**: "Power Pioneers" (first in region), "Green Giants" (highest renewable %)
- **Member Ranks**: "Energy Champion" (top contributor), "Solar Sage" (best efficiency)
- **Community Goals**: Unlock group rewards for sustainability targets
- **Cluster Competitions**: Monthly energy savings challenges between cooperatives

The cluster architecture transforms Enerlectra from individual energy trading into a comprehensive community energy cooperative platform, maintaining all existing functionality while adding powerful collective action capabilities for sustainable energy access across African communities.