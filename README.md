# AI Medicine Assistant - Advanced Chat Interface

A sophisticated AI-powered medicine identification application with a modern conversational interface inspired by advanced AI platforms. Built with Next.js 15, React 19, and Tailwind CSS.

## 🚀 Features

### 💬 **Advanced Chat Interface**
- **Conversational UI**: Clean, modern chat interface with message bubbles
- **Real-time Interactions**: Typing indicators, loading states, and smooth animations
- **Message History**: Persistent chat history with timestamps
- **Auto-scroll**: Automatic scrolling to latest messages

### 🎨 **Futuristic Design**
- **Cosmic Theme**: Dark mode with cosmic blue/black gradients and animated stars
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Fade-in effects, slide-up animations, and transitions
- **Glass Morphism**: Backdrop blur effects and translucent elements

### 📱 **Component Architecture**
- **Modular Design**: Separated into reusable components
- **Sidebar Navigation**: Collapsible sidebar with user profile and chat history
- **Mobile-First**: Responsive design with hamburger menu for mobile
- **Accessibility**: ARIA labels, keyboard navigation, and focus management

### 🔧 **Advanced Features**
- **Camera Integration**: Direct camera access for mobile devices
- **Image Upload**: Drag-and-drop file upload with preview
- **Voice Input**: Voice recording capabilities (placeholder)
- **Multi-language Support**: 10 languages including Chinese and Southeast Asian languages
- **Token System**: Freemium model with usage tracking

## 🏗️ **Component Structure**

```
components/
├── ChatSidebar.tsx      # Collapsible sidebar with profile & history
├── MessageBubble.tsx    # Individual message components
├── InputBar.tsx         # Advanced input with voice & camera
├── Header.tsx           # App header with branding
└── ui/                  # Reusable UI components
    ├── button.tsx
    ├── input.tsx
    └── select.tsx
```

## 🛠️ **Tech Stack**

- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4 with custom animations
- **Components**: Custom shadcn/ui components
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useRef, useEffect)

## 🚀 **Getting Started**

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 **Usage**

### **Desktop Experience**
- Use the sidebar to navigate chat history
- Upload images or take photos for medicine identification
- Toggle between dark/light themes
- Switch languages from the sidebar

### **Mobile Experience**
- Tap the hamburger menu to access sidebar
- Use camera button for direct photo capture
- Swipe-friendly interface with touch optimizations
- Responsive message bubbles and input area

## 🎨 **Customization**

### **Themes**
- **Dark Mode**: Cosmic blue/black with animated stars
- **Light Mode**: Clean white/gray with subtle shadows
- **Custom Colors**: Easily customizable via CSS variables

### **Animations**
- **Fade-in**: Messages appear with smooth fade-in effect
- **Slide-up**: Latest messages slide up from bottom
- **Cosmic Effects**: Animated background gradients and stars
- **Hover Effects**: Interactive button and input animations

## 🔧 **Development**

### **Adding New Features**
1. Create new components in `/components/`
2. Update the main page.tsx to integrate new features
3. Add custom styles to globals.css
4. Test responsive design across devices

### **Styling Guidelines**
- Use Tailwind CSS classes for consistent styling
- Follow the cosmic theme color palette
- Implement smooth transitions for all interactions
- Ensure accessibility with proper contrast ratios

## 📄 **License**

This project is for educational and demonstration purposes. Please consult medical professionals for actual medicine identification and health advice.

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test across different devices
5. Submit a pull request

---

**Disclaimer**: This application is for informational purposes only and should not replace professional medical advice. Always consult with healthcare professionals for medical decisions.
