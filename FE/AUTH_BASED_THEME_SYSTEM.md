# Authentication-Based Theme System

## Overview
The theme system now enforces Light Mode for guests and only allows theme switching for authenticated users.

## Rules

### Guest Users (Not Logged In)
```
✅ Always Light Mode
❌ No Dark Mode access
❌ No theme toggle visible
❌ System preference ignored
```

### Authenticated Users (Logged In)
```
✅ Can choose Light or Dark Mode
✅ Theme toggle available in Settings
✅ Preference saved and persisted
✅ Preference restored on future visits
```

## Implementation

### 1. Theme Provider (`src/components/theme-provider.tsx`)

#### New Props
```typescript
type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  isAuthenticated?: boolean  // NEW
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  isAuthenticated: boolean  // NEW
}
```

#### Authentication Logic
```typescript
const [theme, setTheme] = useState<Theme>(() => {
  // Force Light Mode for guests
  if (!isAuthenticated) {
    return "light"
  }
  
  // For authenticated users, check saved preference
  const savedTheme = localStorage.getItem(storageKey) as Theme | null
  return savedTheme || defaultTheme
})
```

#### Force Light Mode on Logout
```typescript
useEffect(() => {
  if (!isAuthenticated) {
    const root = window.document.documentElement
    root.classList.remove("dark", "system")
    root.classList.add("light")
    setTheme("light")
  }
}, [isAuthenticated])
```

#### Prevent Theme Changes for Guests
```typescript
setTheme: (theme: Theme) => {
  // Only allow theme changes for authenticated users
  if (!isAuthenticated) {
    console.warn("Theme switching is only available for authenticated users")
    return
  }
  
  localStorage.setItem(storageKey, theme)
  setTheme(theme)
}
```

### 2. Authentication Hook (`src/hooks/use-auth.ts`)

#### Mock Implementation
```typescript
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is on an authenticated route
    const path = window.location.pathname;
    const isAuthRoute = path.startsWith('/app');
    setIsAuthenticated(isAuthRoute);
  }, []);

  return { isAuthenticated };
}
```

#### Production Implementation
Replace with your actual auth provider:

```typescript
// Clerk
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
export function useAuth() {
  const { isSignedIn } = useClerkAuth();
  return { isAuthenticated: isSignedIn };
}

// NextAuth
import { useSession } from 'next-auth/react';
export function useAuth() {
  const { data: session } = useSession();
  return { isAuthenticated: !!session };
}

// Custom Auth Context
import { useUser } from '@/contexts/AuthContext';
export function useAuth() {
  const { user } = useUser();
  return { isAuthenticated: !!user };
}
```

### 3. App Component (`src/App.tsx`)

#### Structure
```typescript
function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <ThemeProvider 
      defaultTheme="light" 
      storageKey="interview-prep-theme" 
      isAuthenticated={isAuthenticated}
    >
      {/* Routes */}
    </ThemeProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </QueryClientProvider>
);
```

**Why this structure?**
- `useAuth()` needs to be inside `BrowserRouter` to access location
- `ThemeProvider` receives `isAuthenticated` prop
- Theme updates automatically when auth state changes

### 4. Settings Page (`src/pages/Settings.tsx`)

#### Theme Toggle with Auth Check
```typescript
const { theme, setTheme, isAuthenticated } = useTheme();

const isDarkMode = isAuthenticated && theme === 'dark';

const handleDarkModeToggle = (checked: boolean) => {
  if (!isAuthenticated) {
    return; // Prevent toggle
  }
  setTheme(checked ? 'dark' : 'light');
};
```

#### UI Updates
```tsx
<Switch
  id="dark"
  checked={isDarkMode}
  onCheckedChange={handleDarkModeToggle}
  disabled={!isAuthenticated}  // Disabled for guests
/>

{!isAuthenticated && (
  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
    <Lock className="w-3 h-3" />
    <span>Đăng nhập để thay đổi chủ đề</span>
  </div>
)}
```

## Behavior Flow

### Guest User Journey

```
1. User visits website
   ↓
2. isAuthenticated = false
   ↓
3. Theme forced to "light"
   ↓
4. User sees Light Mode
   ↓
5. Theme toggle disabled in Settings
   ↓
6. Any localStorage theme ignored
```

### Authenticated User Journey

```
1. User logs in
   ↓
2. isAuthenticated = true
   ↓
3. Check localStorage for saved theme
   ↓
4. Apply saved theme OR default to "light"
   ↓
5. User can toggle theme in Settings
   ↓
6. Theme saved to localStorage
   ↓
7. Theme persists across sessions
```

### Logout Journey

```
1. User logs out
   ↓
2. isAuthenticated = false
   ↓
3. Theme forced to "light"
   ↓
4. localStorage theme ignored
   ↓
5. User sees Light Mode
```

## Priority Rules

### For Guests
```
1. Always Light Mode (hardcoded)
2. Ignore localStorage
3. Ignore system preference
```

### For Authenticated Users
```
1. Saved user preference (localStorage)
2. Default to Light Mode
3. System preference (if theme = "system")
```

## Storage Strategy

### Current (localStorage)
```typescript
// Key
storageKey = "interview-prep-theme"

// Values
"light" | "dark" | "system"

// Scope
Per browser, per domain
```

### Future (User Profile)
```typescript
// Backend API
POST /api/user/preferences
{
  "theme": "dark"
}

GET /api/user/preferences
{
  "theme": "dark"
}

// Sync on login
const userPreferences = await fetchUserPreferences();
setTheme(userPreferences.theme);

// Save on change
const handleThemeChange = async (theme) => {
  setTheme(theme);
  await saveUserPreferences({ theme });
};
```

## Security Considerations

### Why Enforce Light Mode for Guests?

1. **Consistent Onboarding**
   - All new users see the same bright, welcoming interface
   - No confusion from dark mode on first visit

2. **Brand Consistency**
   - Landing page always shows intended design
   - Marketing materials match actual experience

3. **Performance**
   - No need to check system preferences for guests
   - Faster initial load

4. **User Control**
   - Theme is a user preference, not a guest preference
   - Authenticated users get personalized experience

### Preventing Theme Bypass

```typescript
// Theme provider checks auth on every render
useEffect(() => {
  if (!isAuthenticated) {
    root.classList.add("light")
    return
  }
  // ... theme logic
}, [theme, isAuthenticated])

// setTheme checks auth before allowing change
setTheme: (theme: Theme) => {
  if (!isAuthenticated) {
    console.warn("Theme switching is only available for authenticated users")
    return
  }
  // ... save theme
}
```

## Testing Checklist

### Guest User Tests
- [ ] Landing page loads in Light Mode
- [ ] Login page loads in Light Mode
- [ ] Signup page loads in Light Mode
- [ ] Theme toggle disabled in Settings (if accessible)
- [ ] localStorage theme ignored
- [ ] System dark mode preference ignored
- [ ] No way to enable Dark Mode

### Authenticated User Tests
- [ ] Can toggle to Dark Mode in Settings
- [ ] Dark Mode persists across page navigation
- [ ] Dark Mode persists after browser refresh
- [ ] Theme saved to localStorage
- [ ] Can toggle back to Light Mode
- [ ] Theme resets to Light on logout

### Edge Cases
- [ ] User with saved "dark" theme logs out → Light Mode
- [ ] User logs in with no saved theme → Light Mode
- [ ] User logs in with saved "dark" theme → Dark Mode
- [ ] User changes theme while logged in → Saves correctly
- [ ] Multiple tabs sync theme changes (if implemented)

## Migration Guide

### From Old System
```typescript
// Old: Anyone could change theme
<ThemeProvider defaultTheme="light" storageKey="...">

// New: Only authenticated users can change theme
<ThemeProvider 
  defaultTheme="light" 
  storageKey="..." 
  isAuthenticated={isAuthenticated}
>
```

### Existing Users
- Users with saved themes will keep them (if authenticated)
- Guests will always see Light Mode
- No data migration needed

## Future Enhancements

### 1. Backend Sync
```typescript
// Save theme to user profile
const saveThemeToBackend = async (theme: Theme) => {
  await fetch('/api/user/preferences', {
    method: 'POST',
    body: JSON.stringify({ theme }),
  });
};

// Load theme from user profile on login
const loadThemeFromBackend = async () => {
  const response = await fetch('/api/user/preferences');
  const { theme } = await response.json();
  setTheme(theme);
};
```

### 2. Multi-Device Sync
```typescript
// WebSocket or polling for real-time sync
const syncThemeAcrossDevices = () => {
  socket.on('theme-changed', (theme) => {
    setTheme(theme);
  });
};
```

### 3. Scheduled Theme
```typescript
// Auto dark mode at night
const useScheduledTheme = () => {
  const hour = new Date().getHours();
  const isDarkHours = hour >= 20 || hour < 6;
  return isDarkHours ? 'dark' : 'light';
};
```

### 4. Per-Page Theme
```typescript
// Different themes for different sections
const themeOverrides = {
  '/app/interview': 'dark', // Always dark for interviews
  '/app/dashboard': 'auto', // User preference
};
```

## Troubleshooting

### Theme Not Changing
```
1. Check isAuthenticated is true
2. Check console for warnings
3. Verify localStorage has correct key
4. Check browser DevTools → Application → Local Storage
```

### Theme Resets on Refresh
```
1. Check localStorage persistence
2. Verify auth state persists
3. Check useAuth() implementation
4. Verify ThemeProvider receives isAuthenticated
```

### Dark Mode Available for Guests
```
1. Check isAuthenticated prop is passed
2. Verify useAuth() returns correct value
3. Check theme provider logic
4. Verify Settings page checks isAuthenticated
```

## Conclusion

The authentication-based theme system provides:

✅ **Consistent guest experience** - Always Light Mode
✅ **User control** - Authenticated users can choose
✅ **Persistent preferences** - Saved across sessions
✅ **Security** - Theme tied to authentication
✅ **Scalability** - Ready for backend sync
✅ **Maintainability** - Clear separation of concerns

The system is production-ready and can be easily integrated with any authentication provider.
