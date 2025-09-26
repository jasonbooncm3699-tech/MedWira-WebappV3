# Camera Setup Guide

## 🎥 Camera Access Requirements

The MedWira AI app requires camera access for medicine photo capture. Here's how to ensure it works properly:

### ✅ **For Production (HTTPS Required)**
- Camera access requires HTTPS in production
- Use a valid SSL certificate
- Ensure your domain supports secure contexts

### 🛠️ **For Local Development**

#### Option 1: Use localhost (Recommended)
```bash
npm run dev
# Visit: http://localhost:3000
```
- Camera works on `localhost` and `127.0.0.1` without HTTPS
- This is the easiest way to test camera functionality

#### Option 2: Use HTTPS locally
```bash
# Install mkcert for local SSL certificates
brew install mkcert  # macOS
# or
choco install mkcert  # Windows

# Create local certificate authority
mkcert -install

# Generate certificates for localhost
mkcert localhost 127.0.0.1 ::1

# Update package.json scripts
"dev": "next dev --experimental-https --experimental-https-key ./localhost-key.pem --experimental-https-cert ./localhost.pem"
```

### 🔧 **Troubleshooting Camera Issues**

#### Common Error: "Unable to access camera"

1. **Check HTTPS**: Ensure you're using HTTPS or localhost
2. **Browser Permissions**: Allow camera access when prompted
3. **Device Camera**: Ensure your device has a working camera
4. **Browser Support**: Use a modern browser (Chrome, Firefox, Safari, Edge)

#### Fallback Options
- If camera fails, the app automatically offers to upload a photo instead
- Click the upload button (📁) to select photos from your device
- The app works with both camera capture and file upload

### 📱 **Mobile Testing**

#### iOS Safari
- Camera works on HTTPS or localhost
- Requires user permission
- Uses back camera by default for better medicine photos

#### Android Chrome
- Camera works on HTTPS or localhost
- Requires user permission
- Automatically selects back camera

### 🌐 **Browser Compatibility**

| Browser | Camera Support | HTTPS Required |
|---------|---------------|----------------|
| Chrome 53+ | ✅ | Yes (except localhost) |
| Firefox 36+ | ✅ | Yes (except localhost) |
| Safari 11+ | ✅ | Yes (except localhost) |
| Edge 12+ | ✅ | Yes (except localhost) |

### 🚀 **Quick Start**

1. **Clone and install**:
   ```bash
   git clone <repository>
   cd medwira-ai
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

3. **Open browser**:
   - Go to `http://localhost:3000`
   - Allow camera permission when prompted
   - Click camera button to test

4. **If camera doesn't work**:
   - Check browser console for errors
   - Try the upload button as fallback
   - Ensure you're on localhost or HTTPS

### 🔒 **Security Notes**

- Camera access is only requested when user clicks camera button
- No camera data is stored permanently
- Images are processed locally before sending to AI
- All camera streams are properly cleaned up

### 📞 **Support**

If you continue having camera issues:
1. Check browser console for detailed error messages
2. Try different browsers
3. Test on different devices
4. Use the upload button as a workaround
