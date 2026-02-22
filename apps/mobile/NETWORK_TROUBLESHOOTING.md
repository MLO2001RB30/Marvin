# Network Troubleshooting (LAN IP)

If you get "Network request failed" when using your LAN IP (e.g. `http://192.168.0.5:4000`):

## 1. Add Windows Firewall rule

Windows often blocks inbound connections. Run **as Administrator** (right‑click → Run as administrator):

```powershell
netsh advfirewall firewall add rule name="Marvin API 4000" dir=in action=allow protocol=tcp localport=4000
```

Or use the script: `scripts/add-firewall-rule.ps1` (run as admin).

## 2. Verify your IP

Your IP can change (DHCP). Check it:

```powershell
ipconfig | findstr "IPv4"
```

Update `apps/mobile/.env` if it changed:
```
EXPO_PUBLIC_API_URL=http://YOUR_CURRENT_IP:4000
```

Restart Expo with `--clear` after changing.

## 3. Same network

Phone and computer must be on the same WiFi. Guest networks or mobile data won't work.

## 4. API running

Ensure the API is running:
```bash
npm run -w @pia/api dev
```

## 5. Test from phone browser

On your phone, open `http://YOUR_IP:4000/health`. If it fails, the issue is network/firewall, not the app.
