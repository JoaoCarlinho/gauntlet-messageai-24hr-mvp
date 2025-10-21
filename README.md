# MessageAI MVP - 24 Hour Challenge

A real-time messaging application built with React Native (Expo), Node.js, and AWS infrastructure.

## 🚀 Technology Stack

### Frontend
- **React Native** with Expo
- **TypeScript** for type safety
- **Expo Router** for navigation
- **Socket.io** for real-time communication
- **Kea** for state management
- **React Query** for data fetching

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Prisma** ORM with PostgreSQL
- **Socket.io** for real-time communication
- **JWT** for authentication
- **AWS S3** for media storage
- **AWS SQS** for notifications

### Infrastructure
- **Terraform** for Infrastructure as Code
- **AWS** (S3, SQS, Lambda, CloudWatch)
- **Railway** for PostgreSQL database and backend hosting
- **Firebase** for push notifications (HTTP v1 API)

## 📁 Project Structure

```
messageai-mvp/
├── mobile/                 # React Native + Expo Frontend
├── backend/                # Node.js + Express API
├── iac/                    # Terraform Infrastructure
├── aws-lambdas/            # AWS Lambda Functions
└── .github/workflows/      # CI/CD Pipelines
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- Terraform 1.0+
- AWS CLI configured
- Railway account
- Expo CLI

### 1. Infrastructure Setup
```bash
# Navigate to infrastructure directory
cd iac

# Initialize Terraform
terraform init

# Apply infrastructure
terraform apply

# Export environment variables
terraform output -json > ../terraform-outputs.json
```

### 2. Install Dependencies
```bash
# Install all dependencies
npm run install-all
```

### 3. Environment Configuration
```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp mobile/.env.example mobile/.env

# Update with real values from terraform-outputs.json and tokens file
```

### 4. Database Setup
```bash
# Navigate to backend
cd backend

# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### 5. Development
```bash
# Start backend (Terminal 1)
npm run backend

# Start mobile app (Terminal 2)
npm run mobile
```

## 🚀 Development Workflow

### Infrastructure Commands
```bash
npm run terraform:init    # Initialize Terraform
npm run terraform:plan    # Preview changes
npm run terraform:apply   # Apply changes
```

### Application Commands
```bash
npm run backend          # Start backend server
npm run mobile           # Start mobile app
npm run install-all      # Install all dependencies
```

## 📱 Features

- **Real-time messaging** with Socket.io
- **User authentication** with JWT
- **Media sharing** with AWS S3
- **Push notifications** with Firebase
- **Offline support** with SQLite
- **Cross-platform** iOS and Android

## 🔧 Environment Variables

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_S3_BUCKET` - S3 bucket for media
- `FIREBASE_PROJECT_ID` - Firebase project ID

### Mobile (.env)
- `API_URL` - Backend API URL
- `EXPO_PROJECT_SLUG` - Expo project identifier

## 🚀 Deployment

### Backend to Railway
- Connected to GitHub repository
- Automatic deployments from master branch
- Environment variables managed via Railway dashboard

### Mobile App
- Build with Expo EAS
- Deploy to App Store and Google Play
- Push notifications configured

## 📊 Infrastructure

### AWS Resources
- **S3 Bucket** - Media storage with CORS and lifecycle rules
- **SQS Queue** - Notification processing
- **Lambda Functions** - Background tasks
- **CloudWatch** - Logging and monitoring

### Railway Resources
- **PostgreSQL Database** - Primary data storage
- **Backend Service** - API hosting

## 🔒 Security

- Environment variables properly secured
- JWT tokens for authentication
- AWS IAM roles with least privilege
- Firebase service account authentication

## 📈 Monitoring

- CloudWatch logs for AWS resources
- Railway metrics for backend performance
- Expo analytics for mobile app usage

## 🤝 Contributing

1. Create feature branch from master
2. Make changes and test locally
3. Create pull request
4. Review and merge

## 📄 License

Private project for 24-hour MVP challenge.