# Enerlectra - African Energy Trading Platform

[![CI/CD Pipeline](https://github.com/username/enerlectra/workflows/Enerlectra%20CI/CD%20Pipeline/badge.svg)](https://github.com/username/enerlectra/actions)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D4.0.0-blue.svg)](https://www.typescriptlang.org/)

Enerlectra is a decentralized energy trading platform designed for the African market, specifically targeting Zambia. The platform enables peer-to-peer energy trading, energy cluster leasing, and includes USSD mobile access for users without smartphones.

## 🌍 Features

### Core Functionality
- **Peer-to-peer energy trading** - Direct energy transactions between users
- **Energy cluster leasing** - Access to renewable energy from solar, wind, and hydro clusters
- **USSD interface** - Mobile phone access without internet connectivity
- **Carbon footprint tracking** - Environmental impact monitoring (0.8kg CO2 saved per kWh)
- **Mobile money integration** - Seamless payments via mobile wallets

### Advanced Features
- **AI-powered anomaly detection** - Automated fraud detection and pattern analysis
- **Blockchain payment system** - Hybrid blockchain and mobile money payments
- **Market analytics dashboard** - Real-time platform statistics and insights
- **Dynamic pricing engine** - Supply/demand-based pricing with time-of-day adjustments
- **Bulk operations** - Multiple transactions in single requests
- **Energy scheduling** - Future transaction scheduling and automation
- **Real-time cluster monitoring** - Health scoring and predictive analytics
- **Price alert system** - Customizable market condition alerts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- TypeScript 4+
- Anthropic API key (for AI features)

### Installation
```bash
# Clone the repository
git clone https://github.com/username/enerlectra.git
cd enerlectra

# Install dependencies
npm install

# Install TypeScript globally
npm install -g typescript

# Build the application
npm run build

# Start the server
npm start
```

### Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## 📚 API Documentation

### Base URL
- Development: `http://localhost:5000`
- Production: `https://enerlectra.replit.app`

### Core Endpoints

#### Energy Trading
- `POST /trade` - Execute energy trade between users
- `POST /trade/bulk/trade` - Execute multiple trades in one request
- `GET /transactions/:userId` - Get user transaction history

#### Wallet Management
- `GET /wallet/:userId` - Get user wallet balance
- `POST /wallet/deposit` - Deposit funds to wallet

#### Energy Clusters
- `GET /cluster/:clusterId` - Get cluster information
- `POST /lease` - Lease energy from cluster
- `GET /monitoring/clusters` - Real-time cluster status

#### Market Data
- `GET /market/stats` - Platform statistics and market health
- `GET /pricing` - Current market pricing and trends

#### USSD Interface
- `POST /ussd` - USSD menu interaction
- `POST /mobilemoney/ussd` - Mobile money via USSD

#### AI Features
- `POST /ai/analyze-transaction` - Analyze transaction for anomalies
- `POST /ai/user-assistance` - AI-powered user support
- `POST /ai/market-insights` - Generate market insights

#### Blockchain Payment
- `POST /blockchain/wallet/create` - Create blockchain wallet
- `POST /blockchain/transfer` - Blockchain transfer
- `GET /blockchain/transaction/:txHash` - Get transaction status

## 🏗️ Architecture

### Backend Stack
- **Framework**: Express.js with TypeScript
- **Data Storage**: JSON file-based system (development)
- **AI Integration**: Anthropic Claude API
- **Blockchain**: Mock blockchain simulation (development)

### Project Structure
```
src/
├── routes/          # API route handlers
├── db/             # JSON data files
├── types.ts        # TypeScript interfaces
├── utils.ts        # Utility functions
└── index.ts        # Application entry point
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows
- **Continuous Integration**: Automated testing and building
- **Security Scanning**: Dependency audits and vulnerability checks
- **Performance Testing**: API response time monitoring
- **Automated Deployment**: Staging and production deployments

### Branch Strategy
- `main` - Production branch (auto-deploys to production)
- `develop` - Development branch (auto-deploys to staging)
- Feature branches - Merged via pull requests

### Deployment
The application automatically deploys to:
- **Staging**: `https://enerlectra-staging.replit.app` (develop branch)
- **Production**: `https://enerlectra.replit.app` (main branch)

## 🌱 Environmental Impact

Every kWh traded on the platform saves:
- **0.8 kg CO2** emissions
- Equivalent to planting trees
- Offsetting car emissions

## 📱 USSD Access

Access the platform via USSD on any mobile phone:
- Dial USSD code and navigate menus
- No internet connection required
- Full functionality available

## 🤖 AI-Powered Features

### Anomaly Detection
- Suspicious transaction pattern analysis
- Fraud prevention and user protection
- Automated risk assessment

### User Assistance
- Natural language query support
- Platform guidance and recommendations
- 24/7 automated customer support

### Market Insights
- AI-generated market analysis
- Trading recommendations
- Risk factor identification

## 💳 Payment Methods

### Supported Options
- **Mobile Money**: MTN, Airtel, Zamtel
- **Blockchain**: Energy tokens and payment tokens
- **Hybrid**: Combined blockchain and mobile money

## 🔒 Security

- Input validation on all endpoints
- Transaction anomaly detection
- Secure API key management
- Regular security audits

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

## 📈 Monitoring

- Health check endpoint: `/health`
- Real-time cluster monitoring
- Transaction volume tracking
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌍 About African Energy Access

Enerlectra addresses critical energy access challenges in rural Africa by:
- Enabling decentralized energy trading
- Supporting mobile-first access patterns
- Promoting renewable energy adoption
- Providing financial inclusion through energy commerce

## 📞 Support

- Email: support@enerlectra.com
- USSD: Dial platform code for mobile support
- GitHub Issues: Report bugs and feature requests

---

**Built with ❤️ for sustainable energy access in Africa**