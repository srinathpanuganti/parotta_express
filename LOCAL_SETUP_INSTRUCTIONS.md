# 🚀 Parotta Express - Local Setup Instructions

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your computer:

1. **Node.js** (version 16 or higher)
   - Download from: https://nodejs.org/
   - To verify: Open terminal/command prompt and run:
     ```bash
     node --version
     ```

2. **Yarn** (package manager)
   - After installing Node.js, install Yarn globally:
     ```bash
     npm install -g yarn
     ```
   - To verify:
     ```bash
     yarn --version
     ```

## 📦 Step 1: Download the Project

1. Download the `parotta-express-frontend.zip` file
2. Extract it to your desired location (e.g., `C:\Projects\` or `~/Projects/`)
3. You should now have a `frontend` folder

## 🛠️ Step 2: Install Dependencies

Open your terminal/command prompt and navigate to the frontend folder:

### On Windows:
```bash
cd C:\path\to\your\frontend
```

### On Mac/Linux:
```bash
cd /path/to/your/frontend
```

Then install all required packages:
```bash
yarn install
```

⏳ This will take 2-5 minutes depending on your internet speed.

## ⚙️ Step 3: Configure Environment Variables

The project needs a `.env` file. Create one in the `frontend` folder:

### Option A: For Local Development (Recommended)
Create a file named `.env` in the `frontend` folder with this content:

```env
# Backend URL (not needed for frontend-only version)
REACT_APP_BACKEND_URL=http://localhost:8001

# Required for Create React App
WDS_SOCKET_PORT=3000
```

### Option B: Keep Existing Configuration
If `.env` already exists, you can keep it as is - it will work fine!

## ▶️ Step 4: Start the Development Server

In the terminal, run:

```bash
yarn start
```

You should see:
```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

## 🌐 Step 5: Open in Browser

The browser should automatically open to `http://localhost:3000`

If not, manually open your browser and go to:
- **http://localhost:3000**

## ✅ What You Should See

1. **Home Page**: Parotta Express hero section with menu
2. **Navbar**: Home, Corporate Meals, Contact Us links
3. **Click "Corporate Meals"**: You'll see a login modal (UI-only demo)
4. **Click "Contact Us"**: Contact form and business information

## 🎨 Key Features to Test

### Home Page (/)
- Hero section with biryani image
- Featured dishes showcase
- Complete menu with 9 categories
- Smooth scroll animations

### Corporate Meals (/corporate)
- Login/Signup modal
- Try any username/password (it's UI-only)
- Browse corporate menu
- Add items to cart
- Manage quantities

### Contact Page (/contact)
- Contact form (UI-only)
- Business information
- Google Maps embedded

## 🛑 How to Stop the Server

Press `Ctrl + C` in the terminal where the server is running.

## 🔧 Common Issues & Solutions

### Issue: "yarn: command not found"
**Solution**: Install Yarn globally:
```bash
npm install -g yarn
```

### Issue: Port 3000 is already in use
**Solution**: Either:
1. Stop the other application using port 3000, OR
2. Run on a different port:
   ```bash
   PORT=3001 yarn start
   ```
   Then open: http://localhost:3001

### Issue: Dependencies installation fails
**Solution**: 
```bash
# Clear yarn cache and try again
yarn cache clean
yarn install
```

### Issue: Page shows errors in browser
**Solution**:
1. Stop the server (Ctrl + C)
2. Delete `node_modules` folder
3. Run: `yarn install`
4. Run: `yarn start`

## 📱 Mobile Testing

To test on your phone:
1. Make sure your phone and computer are on the same WiFi network
2. Find your computer's IP address:
   - **Windows**: Run `ipconfig` in command prompt
   - **Mac/Linux**: Run `ifconfig` or `ip addr`
3. On your phone's browser, go to: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`

## 🏗️ Building for Production

To create an optimized production build:

```bash
yarn build
```

This creates a `build` folder with optimized static files ready for deployment.

## 📂 Project Structure

```
frontend/
├── public/
│   ├── logo.png              # Parotta Express logo
│   └── index.html            # HTML template
├── src/
│   ├── components/
│   │   ├── layout/           # Navbar, Footer
│   │   ├── ui/               # Reusable UI components
│   │   ├── AuthModal.jsx     # Login/Signup modal
│   │   └── MenuCard.jsx      # Menu item card
│   ├── pages/
│   │   ├── Home.jsx          # Home page
│   │   ├── Corporate.jsx     # Corporate meals page
│   │   └── Contact.jsx       # Contact page
│   ├── data/
│   │   ├── menuData.json     # Regular menu data
│   │   └── corporateMenuData.json
│   ├── App.js                # Main app component
│   ├── index.js              # Entry point
│   └── index.css             # Global styles
├── package.json              # Dependencies
└── tailwind.config.js        # Tailwind configuration
```

## 🎯 Tech Stack

- **React 19**: UI framework
- **React Router DOM**: Navigation
- **Tailwind CSS**: Styling (mobile-first)
- **Framer Motion**: Animations
- **Lucide React**: Icons
- **Shadcn/ui**: UI components

## ⚠️ Important Notes

- This is a **frontend-only demo**
- Login/Signup is **UI-only** (uses localStorage)
- Cart functionality is **simulated**
- Forms don't send actual data (placeholder for future backend)
- All authentication is **mock** - clearly indicated in UI

## 🆘 Need Help?

If you encounter any issues:
1. Make sure Node.js version is 16 or higher
2. Try deleting `node_modules` and running `yarn install` again
3. Clear browser cache and refresh
4. Check console for error messages (F12 in browser)

## 🚀 Next Steps (Optional)

To add backend functionality later:
1. The backend folder is preserved
2. You can integrate real authentication
3. Connect to a database for orders
4. Implement payment processing

---

**Enjoy exploring Parotta Express! 🍛**
