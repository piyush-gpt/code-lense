###! In Development**

# 🚀 CodeLense - GitHub Automation Platform

> **AI-powered GitHub automation that analyzes pull requests, issues, and code to provide intelligent insights and automated suggestions.**

## 🌟 What is CodeLense?

CodeLense is a GitHub automation platform that uses AI to analyze pull requests, issues, and code changes. It provides intelligent insights, risk assessments, and automated suggestions to help development teams work more efficiently.

### 🎯 **The Problem We Solve**

Development teams struggle with:
- **Time-consuming code reviews** that slow down development
- **Inconsistent PR analysis** and documentation
- **Manual issue triage** and categorization
- **Lack of automated testing suggestions**
- **Poor code quality tracking**

### ✨ **Our Solution**

CodeLense provides automated AI analysis that:
- 🤖 **Analyzes pull requests** with risk assessment and suggestions
- 🔍 **Searches and queries code** intelligently
- 🧪 **Suggests test cases** based on code changes
- 🔧 **Recommends refactoring** opportunities
- 📊 **Tracks CI/CD failures** with intelligent explanations

---

## 🚀 Key Features

### 🔍 **Pull Request Analysis**
- **Automated risk assessment** with detailed scoring
- **Code quality analysis** with improvement suggestions
- **Testing strategy recommendations** based on code changes
- **Affected modules identification** and impact analysis
- **Label suggestions** for better organization
- **Technical checklist generation** for reviewers

### 📋 **Issue Management**
- **Automatic issue categorization** (bug, feature, enhancement, question, danger)
- **Priority assessment** (high, medium, low)
- **Effort estimation** and suggested actions
- **Related areas identification** in the codebase
- **Label recommendations** for better organization

### 🔍 **Intelligent Code Query**
- **Natural language code search** across repositories
- **Context-aware file selection** based on queries
- **Semantic code understanding** using embeddings
- **Multi-file analysis** for complex queries
- **Rate-limited access** to prevent abuse

### 🔧 **Refactoring Suggestions**
- **Code quality improvements** (DRY principle, naming, etc.)
- **Performance optimization** recommendations
- **Security improvement** suggestions
- **Readability enhancements** with code examples
- **Best practices enforcement** guidance

### 🔧 **CI/CD Intelligence**
- **Test failure analysis** with intelligent explanations
- **Build log interpretation** and debugging help
- **Automated comment generation** for CI failures

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Agent      │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (Python)      │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • API Routes    │    │ • PR Analysis   │
│ • Analytics     │    │ • Webhooks      │    │ • Issue Agent   │
│ • User Auth     │    │ • Database      │    │ • Code Query    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │   (MongoDB)     │
                    │                 │
                    │ • PR Analysis   │
                    │ • Issue Data    │
                    │ • Code Chunks   │
                    └─────────────────┘
```

### **Technology Stack**

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **AI/ML**: Python, LangChain, Google Gemini, VoyageAI
- **Database**: MongoDB with Mongoose
- **Authentication**: GitHub OAuth, JWT
- **AI Models**: Gemini 2.5 Flash, Voyage Code 2

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ and pip
- MongoDB (local or Atlas)
- GitHub App credentials
- Google API key for Gemini
- VoyageAI API key for embeddings

### Quick Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/code-lense.git
   cd code-lense
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server && npm install
   
   # Install client dependencies
   cd ../client && npm install
   
   # Install Python dependencies
   cd ../agent && pip install -r requirements.txt
   ```

4. **Start the development servers**
   ```bash
   # Start backend server
   cd server && npm run dev
   
   # Start frontend client
   cd ../client && npm run dev
   
   # Start AI agent
   cd ../agent && python main.py
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - AI Agent: http://localhost:8000

---

## 🔧 Configuration

### GitHub App Setup

1. **Create a GitHub App**
   - Go to GitHub Settings → Developer settings → GitHub Apps
   - Create a new app with the following permissions:
     - Repository: Full access
     - Pull requests: Read & write
     - Issues: Read & write
     - Contents: Read & write

2. **Configure Webhooks**
   - Set webhook URL to: `https://yourdomain.com/api/webhooks`
   - Select events: Pull requests, Issues, Push

3. **Install the App**
   - Install on your repositories
   - Note the installation ID and private key

### Environment Variables

```bash
# GitHub App Configuration
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Database
MONGODB_URI=mongodb://localhost:27017/devdash

# AI Services
GOOGLE_API_KEY=your_google_api_key
VOYAGE_API_KEY=your_voyage_api_key

# Security
JWT_SECRET=your_jwt_secret
```

---

## 📖 Usage Guide

### For Developers

1. **Install the GitHub App** on your repositories
2. **Create a pull request** - CodeLense will automatically analyze it
3. **Review the analysis** in the dashboard or PR comments
4. **Follow the suggestions** for improvements and testing

### For Team Leads

1. **Monitor PR analytics** through the dashboard
2. **Track issue categorization** and priority assessment
3. **Review code quality trends** and improvement areas
4. **Optimize development workflows** with AI insights


## 🎯 Why Choose CodeLense?

### 🚀 **Intelligent Analysis**
- **Advanced AI models** for code understanding
- **Context-aware analysis** that understands your codebase
- **Multi-language support** for diverse tech stacks
- **Real-time insights** on every change

### ⚡ **Seamless Integration**
- **GitHub-native** - works with existing workflows
- **Zero configuration** - automatic analysis
- **Non-intrusive** - enhances without disruption
- **Real-time feedback** - instant insights


### 📈 **Proven Benefits**
- **Faster code reviews** with automated analysis
- **Better code quality** through AI suggestions
- **Reduced manual work** with automated categorization
- **Improved team productivity** with intelligent insights

---

## 🙏 Acknowledgments

- **GitHub** for the amazing platform and APIs
- **Google** for the Gemini AI models
- **VoyageAI** for the code embeddings
- **MongoDB** for the robust database solution
- **Next.js** for the excellent React framework
