# Network Setup Guide for Remote Collaboration

## Problem
When testing with 2 browsers on the same machine, everything works because both browsers connect to `localhost`. However, when a friend on a different laptop tries to access the board, it fails because their browser tries to connect to `localhost` on THEIR machine, not yours.

## Solution: Steps to Enable Remote Access

### Step 1: Find Your Local IP Address

Run this command in PowerShell to find your IP address:
```powershell
ipconfig
```

Look for your Wi-Fi or Ethernet adapter and note the **IPv4 Address**. It will look something like:
- `192.168.1.xxx` or
- `10.0.0.xxx` or  
- `172.16.x.xxx`

Example: `192.168.1.100`

### Step 2: Update Backend Environment (.env)

Edit `backend/.env` and update these lines:

```env
# CORS - Add your IP address (replace 192.168.1.100 with YOUR IP)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://192.168.1.100:3000

# Frontend URL (for email links)
FRONTEND_URL=http://192.168.1.100:3000
```

### Step 3: Update Frontend Environment (.env.local)

Edit `frontend/.env.local` and change ALL localhost URLs to your IP address:

```env
# Replace 192.168.1.100 with YOUR IP address
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.100:5000/api
NEXT_PUBLIC_SOCKET_URL=http://192.168.1.100:5000
NEXT_PUBLIC_AI_ENGINE_URL=http://192.168.1.100:8000
```

### Step 4: Configure Windows Firewall

You need to allow incoming connections on ports 3000, 5000, and 8000:

1. Open **Windows Defender Firewall with Advanced Security**
2. Click on **Inbound Rules** → **New Rule**
3. Choose **Port** → Next
4. Choose **TCP** and enter: `3000,5000,8000`
5. Choose **Allow the connection** → Next
6. Check all profiles (Domain, Private, Public) → Next
7. Name it "Collabry Development" → Finish

**OR** run these PowerShell commands as Administrator:

```powershell
New-NetFirewallRule -DisplayName "Collabry Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "Collabry Backend" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
New-NetFirewallRule -DisplayName "Collabry AI Engine" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
```

### Step 5: Restart All Services

1. Stop frontend (Ctrl+C in terminal)
2. Stop backend (Ctrl+C in terminal)
3. Stop AI engine if running (Ctrl+C in terminal)
4. Restart them all:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend  
   cd frontend
   npm run dev
   
   # Terminal 3 - AI Engine (if needed)
   cd ai-engine
   python run_server.py
   ```

### Step 6: Share URL with Your Friend

Your friend should access the app using YOUR IP address:
```
http://192.168.1.100:3000
```

Replace `192.168.1.100` with your actual IP address.

## Important Notes

### Network Requirements
- **Both of you must be on the SAME network** (same Wi-Fi or LAN)
- If your friend is on a different network (e.g., at their home), you'll need to:
  - Set up port forwarding on your router (more complex), OR
  - Use a tunneling service like **ngrok** or **localtunnel** (easier), OR
  - Deploy to a cloud service (best for production)

### Using ngrok for Remote Access (Different Networks)

If your friend is NOT on the same network:

1. Install ngrok: https://ngrok.com/download
2. Run ngrok for each service:
   ```bash
   # Terminal 1
   ngrok http 3000
   
   # Terminal 2  
   ngrok http 5000
   
   # Terminal 3
   ngrok http 8000
   ```
3. ngrok will give you public URLs like:
   - Frontend: `https://abc123.ngrok.io`
   - Backend: `https://def456.ngrok.io`
   - AI Engine: `https://ghi789.ngrok.io`

4. Update your frontend `.env.local` with the ngrok URLs:
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://def456.ngrok.io/api
   NEXT_PUBLIC_SOCKET_URL=https://def456.ngrok.io
   NEXT_PUBLIC_AI_ENGINE_URL=https://ghi789.ngrok.io
   ```

5. Update backend `.env`:
   ```env
   CORS_ORIGIN=https://abc123.ngrok.io
   ```

## Troubleshooting

### Friend sees "Cannot connect to server"
- Check firewall is disabled or ports are allowed
- Verify you're on the same network
- Make sure backend is running and accessible

### Friend sees "CORS error" in browser console
- Update `CORS_ORIGIN` in backend `.env` to include their IP or the IP they're connecting from

### Socket.IO connection fails
- Verify `NEXT_PUBLIC_SOCKET_URL` points to your IP:5000
- Check Socket.IO logs in backend terminal
- Ensure port 5000 is open in firewall

### Friend can log in but can't see real-time updates
- Socket.IO connection is likely blocked
- Check browser console for Socket.IO errors
- Verify `NEXT_PUBLIC_SOCKET_URL` is correct
