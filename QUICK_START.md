# 🎯 QUICK START GUIDE - Parotta Express

## ⚡ Super Fast Setup (5 Minutes)

### 1️⃣ Download & Extract
- Download: `parotta-express-complete.zip` 
- Extract to any folder on your computer

### 2️⃣ Open Terminal
**Windows**: 
- Press `Win + R`, type `cmd`, press Enter
- Navigate: `cd C:\path\to\frontend`

**Mac/Linux**:
- Open Terminal app
- Navigate: `cd /path/to/frontend`

### 3️⃣ Install & Run
```bash
# Install packages (first time only)
yarn install

# Start the app
yarn start
```

### 4️⃣ Open Browser
- Automatically opens to: **http://localhost:3000**
- Or manually go to: **http://localhost:3000**

## ✅ That's It! You're Done!

### 🎮 What to Try:
1. **Home**: Browse the full menu with 100+ items
2. **Corporate Meals**: Click and try the login (use any username/password)
3. **Contact**: Check out the contact form and location

### 🛑 To Stop:
Press `Ctrl + C` in the terminal

---

## 📋 Need Node.js?

**Don't have Node.js installed?**

1. Go to: https://nodejs.org/
2. Download the **LTS version** (recommended)
3. Install it (just click Next → Next → Finish)
4. Restart your computer
5. Come back and follow steps above

**Check if installed:**
```bash
node --version
# Should show: v16.x.x or higher
```

---

## 🆘 Quick Troubleshooting

**"yarn: command not found"**
```bash
npm install -g yarn
```

**Port 3000 already in use**
```bash
PORT=3001 yarn start
# Then open: http://localhost:3001
```

**Something went wrong**
```bash
# Delete node_modules folder
# Then run:
yarn install
yarn start
```

---

## 📱 View on Your Phone

1. Find your computer's IP address:
   - **Windows**: Run `ipconfig` 
   - **Mac**: System Preferences → Network
   
2. On phone, open browser and go to:
   - `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`

3. Both devices must be on same WiFi!

---

## 💡 Pro Tips

- **Hot Reload**: Changes auto-refresh in browser
- **Dev Tools**: Press F12 in browser to inspect
- **Responsive**: Resize browser to see mobile view
- **Animations**: Scroll to see smooth entrance effects

---

**Need detailed instructions?** Check `SETUP_INSTRUCTIONS.md` in the same folder!

**Enjoy! 🍛**

---

## 🧪 E2E Smoke Test (Backend)

To run the end-to-end validation locally against a temporary SQLite DB:

```bash
cd backend
export DATABASE_URL="file:./prisma/dev-e2e.db"
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js
node validate.js
```

You should see "Validation OK".

---

## 🚀 Production Deployment (Docker + Caddy)

Prereqs: Docker and Docker Compose installed; DNS for your domain pointing to the server.

1. Copy environment template and edit values:
   ```bash
   cp .env.example .env
   # edit .env: DOMAIN, ACME_EMAIL, SESSION_SECRET, ADMIN_TOKEN, email settings
   ```
2. Build and start the stack:
   ```bash
   make prod-up
   ```
3. Check logs if needed:
   ```bash
   make prod-logs
   ```

Services:
- Caddy (TLS + reverse proxy)
- Backend (Node + Prisma + SQLite)
- Worker (email queue)
- Redis (queue backend)
- Frontend (Nginx serving React build)

Data is persisted in the `backend_data` volume (SQLite file).
