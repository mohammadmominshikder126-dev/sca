import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/ui/Feedback';
import { AuthProvider } from './contexts/AuthContext';
import { PlatformDataProvider } from './contexts/PlatformDataContext';
import { SetupGuidePage } from './pages/SetupGuidePage';
import { UserLoginPage } from './pages/auth/UserLoginPage';
import { UserRegisterPage } from './pages/auth/UserRegisterPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { UserLayout } from './pages/user/UserLayout';
import { HomeTab } from './pages/user/HomeTab';
import { TeamTab } from './pages/user/TeamTab';
import { MyProductTab } from './pages/user/MyProductTab';
import { MineTab } from './pages/user/MineTab';
import { RechargePage } from './pages/user/RechargePage';
import { PaymentGatewayPage } from './pages/user/PaymentGatewayPage';
import { TransactionHistoryPage } from './pages/user/TransactionHistoryPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { DashboardView } from './pages/admin/DashboardView';
import { PlansManagerView } from './pages/admin/PlansManagerView';
import { TransactionsView } from './pages/admin/TransactionsView';
import { BonusCodesView } from './pages/admin/BonusCodesView';
import { UsersView } from './pages/admin/UsersView';
import { TeamMembersView } from './pages/admin/TeamMembersView';
import { AnnouncementsView } from './pages/admin/AnnouncementsView';
import { BannersImagesView } from './pages/admin/BannersImagesView';
import { AdminSettingsView } from './pages/admin/AdminSettingsView';
import { SupportTicketsView } from './pages/admin/SupportTicketsView';
import { NotificationsView } from './pages/admin/NotificationsView';
import { SiteSettingsView } from './pages/admin/SiteSettingsView';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <PlatformDataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/user" replace />} />
              <Route path="/setup" element={<SetupGuidePage />} />

              {/* Auth Routes */}
              <Route path="/login" element={<UserLoginPage />} />
              <Route path="/register" element={<UserRegisterPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Full-Screen Standalone User Flow Pages */}
              <Route path="/user/recharge" element={<RechargePage />} />
              <Route path="/user/gateway" element={<PaymentGatewayPage />} />
              <Route path="/user/transactions" element={<TransactionHistoryPage />} />

              {/* User Panel (/user) */}
              <Route path="/user" element={<UserLayout />}>
                <Route index element={<HomeTab />} />
                <Route path="team" element={<TeamTab />} />
                <Route path="products" element={<MyProductTab />} />
                <Route path="mine" element={<MineTab />} />
              </Route>

              {/* Admin Panel (/admin) */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardView />} />
                <Route path="plans" element={<PlansManagerView />} />
                <Route path="deposits" element={<TransactionsView mode="deposits" />} />
                <Route path="withdrawals" element={<TransactionsView mode="withdrawals" />} />
                <Route path="bonus-codes" element={<BonusCodesView />} />
                <Route path="users" element={<UsersView />} />
                <Route path="team" element={<TeamMembersView />} />
                <Route path="transactions" element={<TransactionsView mode="all" />} />
                <Route path="announcements" element={<AnnouncementsView />} />
                <Route path="banners" element={<BannersImagesView />} />
                <Route path="settings" element={<AdminSettingsView />} />
                <Route path="support" element={<SupportTicketsView />} />
                <Route path="notifications" element={<NotificationsView />} />
                <Route path="site-settings" element={<SiteSettingsView />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </PlatformDataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
