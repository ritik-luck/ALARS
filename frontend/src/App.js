import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './components/Dashboard';
import SystemReports from './pages/SystemReports';
import AdminPanel from './pages/AdminPanel';
import IncidentDetails from './pages/IncidentDetails';
import DynamicBackground from './components/DynamicBackground';

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
  >
    {children}
  </motion.div>
);

function App() {
  const location = useLocation();

  return (
    <>
      <DynamicBackground />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          
          <Route path="/" element={<ProtectedRoute><PageTransition><Layout /></PageTransition></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="reports" element={<SystemReports />} />
            <Route path="incidents/:id" element={<IncidentDetails />} />
            
            {/* Admin only routes */}
            <Route path="admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
            <Route path="admin/rules" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
