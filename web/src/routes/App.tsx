import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "../lib/auth";
import { AppLayout, PublicLayout } from "./layouts";
import { RequireAdmin, RequireAuth, RequireStaff } from "./guards";
import { HomePage } from "./pages/HomePage";
import { ImpactPage } from "./pages/ImpactPage";
import { GivePage } from "./pages/GivePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterDonorPage } from "./pages/RegisterDonorPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { ProgramsPage } from "./pages/ProgramsPage";
import { AppDashboardPage } from "./pages/app/AppDashboardPage";
import { DonorsPage } from "./pages/app/DonorsPage";
import { CaseloadPage } from "./pages/app/CaseloadPage";
import { ResidentProcessRecordingsPage } from "./pages/app/ResidentProcessRecordingsPage";
import { ResidentHomeVisitsPage } from "./pages/app/ResidentHomeVisitsPage";
import { ReportsPage } from "./pages/app/ReportsPage";
import { DonorPortalPage } from "./pages/app/DonorPortalPage";
import { MlInsightsPage } from "./pages/app/MlInsightsPage";
import { MlActionCenterPage } from "./pages/app/MlActionCenterPage";
import { SocialMediaStrategyPage } from "./pages/app/SocialMediaStrategyPage";
import { AdminUsersPage } from "./pages/app/AdminUsersPage";
import { AdminAllocationsPage } from "./pages/app/AdminAllocationsPage";
import { AdminPartnersPage } from "./pages/app/AdminPartnersPage";
import { AdminPartnerAssignmentsPage } from "./pages/app/AdminPartnerAssignmentsPage";
import { AdminLighthouseImportPage } from "./pages/app/AdminLighthouseImportPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function ScrollToTop() {
  const { hash, pathname, search } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      });
      return;
    }

    window.scrollTo({ top: 0, left: 0 });
  }, [hash, pathname, search]);

  return null;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/app" element={<Navigate to="/" replace />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/donate" element={<GivePage />} />
            <Route path="/give" element={<GivePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterDonorPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/app/donor" element={<DonorPortalPage />} />
              <Route element={<RequireStaff />}>
                <Route path="/app/dashboard" element={<AppDashboardPage />} />
                <Route path="/app/donors" element={<DonorsPage />} />
                <Route path="/app/cases" element={<CaseloadPage />} />
                <Route path="/app/residents/:residentId/process-recordings" element={<ResidentProcessRecordingsPage />} />
                <Route path="/app/residents/:residentId/home-visits" element={<ResidentHomeVisitsPage />} />
                <Route path="/app/reports" element={<ReportsPage />} />
                <Route path="/app/ml" element={<MlInsightsPage />} />
                <Route path="/app/social-media" element={<SocialMediaStrategyPage />} />
                <Route path="/app/action-center" element={<MlActionCenterPage />} />
                <Route element={<RequireAdmin />}>
                  <Route path="/app/admin/users" element={<AdminUsersPage />} />
                  <Route path="/app/admin/allocations" element={<AdminAllocationsPage />} />
                  <Route path="/app/admin/partners" element={<AdminPartnersPage />} />
                  <Route path="/app/admin/partner-assignments" element={<AdminPartnerAssignmentsPage />} />
                  <Route path="/app/admin/lighthouse-import" element={<AdminLighthouseImportPage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
