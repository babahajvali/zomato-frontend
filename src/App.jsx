import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import RestaurantsPage from './pages/RestaurantsPage.jsx'
import RestaurantDetailPage from './pages/RestaurantDetailPage.jsx'
import CartPage from './pages/CartPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import OrderDetailPage from './pages/OrderDetailPage.jsx'
import AddressesPage from './pages/AddressesPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import OwnerShell from './pages/owner/OwnerShell.jsx'
import OwnerRestaurantsPage from './pages/owner/OwnerRestaurantsPage.jsx'
import OverviewPanel from './pages/owner/OverviewPanel.jsx'
import LiveOrdersPanel from './pages/owner/LiveOrdersPanel.jsx'
import ScheduledOrdersPanel from './pages/owner/ScheduledOrdersPanel.jsx'
import MenuPanel from './pages/owner/MenuPanel.jsx'
import TimingsPanel from './pages/owner/TimingsPanel.jsx'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './context/AuthContext.jsx'

function CustomerShell({ children }) {
  const { session } = useAuth()
  if (session?.role === 'OWNER') {
    return <Navigate to="/owner" replace />
  }
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Owner home: lists every restaurant the signed-in owner manages.
          Picking one navigates to /owner/:restaurantId. */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute>
            <OwnerRestaurantsPage />
          </ProtectedRoute>
        }
      />

      {/* Owner dashboard: own shell, no global nav */}
      <Route
        path="/owner/:restaurantId"
        element={
          <ProtectedRoute>
            <OwnerShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPanel />} />
        <Route path="live" element={<LiveOrdersPanel />} />
        <Route path="scheduled" element={<ScheduledOrdersPanel />} />
        <Route path="menu" element={<MenuPanel />} />
        <Route path="timings" element={<TimingsPanel />} />
        {/* legacy aliases */}
        <Route path="orders" element={<Navigate to="../live" replace />} />
        <Route path="manage" element={<Navigate to="../menu" replace />} />
      </Route>

      {/* Customer-facing shell. Owners hitting any of these get redirected to
          their own dashboard via CustomerShell. */}
      <Route path="/" element={<CustomerShell><RestaurantsPage /></CustomerShell>} />
      <Route path="/restaurants/:id" element={<CustomerShell><RestaurantDetailPage /></CustomerShell>} />
      <Route path="/cart" element={<CustomerShell><CartPage /></CustomerShell>} />
      <Route path="/checkout" element={<CustomerShell><CheckoutPage /></CustomerShell>} />
      <Route path="/orders" element={<CustomerShell><OrdersPage /></CustomerShell>} />
      <Route path="/orders/:id" element={<CustomerShell><OrderDetailPage /></CustomerShell>} />
      <Route path="/addresses" element={<CustomerShell><AddressesPage /></CustomerShell>} />
      <Route path="/profile" element={<CustomerShell><ProfilePage /></CustomerShell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
