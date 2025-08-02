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

### USSD Integration
- Menu-driven USSD interface for feature phone users
- Session management for multi-level interactions
- User registration and management via phone numbers
- Complete functionality accessible without internet

### Carbon Footprint Tracking
- Automatic carbon savings calculation (0.8kg CO2 per kWh)
- Environmental impact metrics (trees equivalent, car miles offset)
- User-specific carbon impact reporting

### Wallet Management
- Dual balance system (ZMW currency and kWh energy)
- Real-time balance updates
- Transaction history tracking

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