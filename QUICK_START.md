# Enerlectra GitHub Quick Start

## Option 1: Automated Setup (Recommended)

1. **Edit the setup script** with your GitHub details:
   ```bash
   nano setup-github.sh
   ```
   
   Replace these lines with your information:
   ```bash
   GITHUB_USERNAME="your_actual_username"
   REPO_NAME="enerlectra-energy-trading"  # or your preferred name
   FULL_NAME="Your Full Name"
   EMAIL="your.email@example.com"
   ```

2. **Run the setup script:**
   ```bash
   chmod +x setup-github.sh
   ./setup-github.sh
   ```

3. **Configure GitHub secrets:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add: `ANTHROPIC_API_KEY` (your Anthropic API key)
   - Add: `REPLIT_TOKEN` (optional, for deployment automation)

## Option 2: Manual Setup

If you prefer to run commands manually:

```bash
# 1. Configure git
git config user.name "Your Full Name"
git config user.email "your.email@example.com"

# 2. Initialize and commit
git init
git add .
git commit -m "Initial commit: Enerlectra energy trading platform"

# 3. Add GitHub remote (replace USERNAME and REPO)
git remote add origin https://github.com/USERNAME/REPO.git

# 4. Push to GitHub
git branch -M main
git push -u origin main

# 5. Create development branch
git checkout -b develop
git push -u origin develop
```

## What You'll Get

After setup, your GitHub repository will have:

### Automated Workflows
- **CI/CD Pipeline**: Runs tests and deploys on every push
- **Security Scanning**: Weekly dependency audits
- **Performance Testing**: API response time monitoring

### Repository Structure
- **Issue Templates**: Bug reports and feature requests
- **PR Templates**: Structured pull request reviews
- **Documentation**: Complete API docs and deployment guides
- **Docker Support**: Containerized deployment ready

### Platform Features
- **25+ API endpoints** for energy trading
- **USSD interface** for mobile phone access
- **AI integration** for anomaly detection
- **Blockchain payments** with mobile money
- **Real-time analytics** and market insights

## Verification Steps

After running the setup:

1. **Check repository online**: Visit https://github.com/YOUR_USERNAME/REPO_NAME
2. **Verify Actions**: Go to Actions tab to see CI/CD workflow
3. **Test API**: The platform should be running and accessible
4. **Review documentation**: README.md should display properly

## Troubleshooting

### If git push fails:
- Ensure repository exists on GitHub
- Check your GitHub username and repository name
- Verify you have push permissions

### If CI/CD fails:
- Add required secrets (ANTHROPIC_API_KEY)
- Check GitHub Actions logs for specific errors
- Ensure all files were committed properly

### If tests fail:
- Verify the server is running locally first
- Check that all JSON database files are present
- Run `node test/api-tests.js` to test locally

## Ready to Proceed?

Once you've customized the `setup-github.sh` script with your details, just run it and your Enerlectra platform will be connected to GitHub with full CI/CD automation!