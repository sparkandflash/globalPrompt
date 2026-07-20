import { Button } from "@/components/ui/button" // Button might still be needed if used elsewhere, but checking App.jsx content... actually it was only used in Header. 
import { BrowserRouter as Router, Routes, Route, Link as RouterLink, useNavigate, Navigate } from 'react-router-dom'
import { ThemeProvider } from "@/components/theme-provider"
// ModeToggle is used in Header, so not needed here


import Home from './pages/Home'
import CreateRegistry from './pages/CreateRegistry'
import RegistryDetail from './pages/RegistryDetail'
import CreatePrompt from './pages/CreatePrompt'
import ThreadDetail from './pages/ThreadDetail'
import Login from './pages/Login'
import Signup from './pages/Signup'
import PublicThread from './pages/PublicThread'
import PublicSearch from './pages/PublicSearch'
import Docs from './pages/Docs'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import LyraTerminal from './pages/LyraTerminal'
import LyraDocs from './pages/LyraDocs'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Toaster } from "@/components/ui/sonner"

function App() {
  const isLyraHost = window.location.hostname === 'lyra.chalkboard.cc';

  if (isLyraHost) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <Router>
          <Routes>
            <Route path="/docs" element={<LyraDocs />} />
            <Route path="*" element={<LyraTerminal />} />
          </Routes>
          <Toaster />
        </Router>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
          <Header />
          <div className="w-full max-w-[1600px] mx-auto px-3 md:px-3 py-3 flex-1">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/create-registry" element={
                <ProtectedRoute>
                  <CreateRegistry />
                </ProtectedRoute>
              } />
              <Route path="/registry/:id" element={
                <ProtectedRoute>
                  <RegistryDetail />
                </ProtectedRoute>
              } />
              <Route path="/thread/:id" element={
                <ProtectedRoute>
                  <ThreadDetail />
                </ProtectedRoute>
              } />
              <Route path="/create-prompt" element={
                <ProtectedRoute>
                  <CreatePrompt />
                </ProtectedRoute>
              } />
              
              {/* New Authenticated Routes */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } />

              {/* Public routes — no auth required */}
              <Route path="/docs" element={<Docs />} />
              <Route path="/p/:id" element={<PublicThread />} />
              <Route path="/search" element={<PublicSearch />} />
            </Routes>
          </div>
          <Footer />
          <Toaster />
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
