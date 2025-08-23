# 🚀 **Enerlectra Production Deployment - Step by Step**

## 🎯 **Current Status**
- ✅ **Frontend**: Deployed to Vercel and accessible
- ✅ **Backend**: Enhanced, tested locally, ready for Render
- ✅ **Code**: Committed and pushed to GitHub
- ✅ **Configuration**: render.yaml updated and ready

---

## 🚀 **STEP 1: Deploy Backend to Render (5 minutes)**

### **1.1 Go to Render.com**
1. Navigate to [https://render.com](https://render.com)
2. Sign in with your GitHub account
3. Click **"New +"** → **"Web Service"**

### **1.2 Connect Repository**
1. Connect to GitHub repository: `iamsamuelmanda/EnerlectraTrade`
2. Render will auto-detect the project
3. Click **"Connect"**

### **1.3 Configure Web Service**
- **Name**: `enerlectra-backend`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: Leave empty (root)

### **1.4 Build & Start Commands**
- **Build Command**: `npm install && npm run build:backend`
- **Start Command**: `npm start`

### **1.5 Environment Variables**
```bash
NODE_ENV=production
PORT=10000
JWT_SECRET=[Render will auto-generate]
CORS_ORIGINS=https://enerlectra-frontend-c406365od-samuel-mandas-projects.vercel.app,http://localhost:3000
```

### **1.6 Deploy**
1. Click **"Create Web Service"**
2. Wait for build to complete (5-10 minutes)
3. **Note the generated URL** (e.g., `https://enerlectra-backend.onrender.com`)

---

## 🌐 **STEP 2: Update Frontend Environment Variables (2 minutes)**

### **2.1 Go to Vercel Dashboard**
1. Navigate to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your **Enerlectra** project
3. Go to **"Settings"** → **"Environment Variables"**

### **2.2 Add Production Variables**
Add these environment variables:

```bash
VITE_API_URL=https://enerlectra-backend.onrender.com
VITE_WS_URL=wss://enerlectra-backend.onrender.com
VITE_APP_NAME=Enerlectra
VITE_APP_TAGLINE=The Energy Internet
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
```

**Important**: Replace `https://enerlectra-backend.onrender.com` with your actual Render backend URL!

### **2.3 Redeploy Frontend**
1. Go to **"Deployments"** tab
2. Click **"Redeploy"** on the latest deployment
3. Wait for deployment to complete

---

## 🔧 **STEP 3: Test Production Deployment (3 minutes)**

### **3.1 Test Backend Health**
```bash
curl https://enerlectra-backend.onrender.com/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "service": "Enerlectra - The Energy Internet",
  "version": "1.0.0",
  "security": {
    "status": "active",
    "features": ["rate-limiting", "helmet", "cors", "cookies", "authentication"]
  }
}
```

### **3.2 Test Authentication Flow**
```bash
# 1. Login
curl -X POST https://enerlectra-backend.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+254700000000"}'

# 2. Verify OTP (use OTP from console logs)
curl -X POST https://enerlectra-backend.onrender.com/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"identifier": "+254700000000", "otp": "123456"}'
```

### **3.3 Test Trading API**
```bash
# Get offers (requires authentication)
curl -X GET https://enerlectra-backend.onrender.com/api/trading/offers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🎯 **STEP 4: Verify Frontend-Backend Connection**

### **4.1 Open Frontend**
1. Navigate to: https://enerlectra-frontend-c406365od-samuel-mandas-projects.vercel.app
2. Check browser console for connection status
3. Test authentication flow
4. Verify WebSocket connection

### **4.2 Expected Behavior**
- ✅ Frontend loads with "The Energy Internet" branding
- ✅ Authentication modal appears
- ✅ Phone/email login works
- ✅ WebSocket shows connected status
- ✅ Trading features accessible after login

---

## 🚨 **Troubleshooting**

### **Backend Build Fails**
1. Check Render build logs
2. Verify `package.json` dependencies
3. Ensure TypeScript compilation succeeds
4. Check for missing environment variables

### **Frontend Can't Connect**
1. Verify backend URL in Vercel environment variables
2. Check CORS configuration in backend
3. Ensure backend is running and accessible
4. Check browser console for specific errors

### **WebSocket Issues**
1. Verify WebSocket URL in frontend
2. Check CORS origins in backend
3. Ensure backend supports WebSocket
4. Verify authentication tokens

---

## 🎉 **Success Criteria**

### **✅ Deployment Complete When**
1. **Backend**: Accessible at `https://enerlectra-backend.onrender.com`
2. **Frontend**: Connected to backend successfully
3. **Authentication**: Login/OTP flow working
4. **WebSocket**: Real-time connections established
5. **Trading API**: Protected endpoints accessible
6. **Branding**: "The Energy Internet" visible throughout

---

## 🔗 **Quick Links**

- **Frontend**: https://enerlectra-frontend-c406365od-samuel-mandas-projects.vercel.app
- **GitHub**: https://github.com/iamsamuelmanda/EnerlectraTrade
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Render Dashboard**: https://dashboard.render.com

---

**⚡ Ready to deploy? Let's power Africa's energy future together! 🚀** 