import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../lib/auth";
import { AppLayout, PublicLayout } from "./layouts";
import { RequireAuth } from "./guards";
import { HomePage } from "./pages/HomePage";
import { ImpactPage } from "./pages/ImpactPage";
import { LoginPage } from "./pages/LoginPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { AppDashboardPage } from "./pages/app/AppDashboardPage";
import { DonorsPage } from "./pages/app/DonorsPage";
import { CaseloadPage } from "./pages/app/CaseloadPage";
import { ResidentProcessRecordingsPage } from "./pages/app/ResidentProcessRecordingsPage";
import { ResidentHomeVisitsPage } from "./pages/app/ResidentHomeVisitsPage";
import { ReportsPage } from "./pages/app/ReportsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/app/dashboard" element={<AppDashboardPage />} />
              <Route path="/app/donors" element={<DonorsPage />} />
              <Route path="/app/cases" element={<CaseloadPage />} />
              <Route path="/app/residents/:residentId/process-recordings" element={<ResidentProcessRecordingsPage />} />
              <Route path="/app/residents/:residentId/home-visits" element={<ResidentHomeVisitsPage />} />
              <Route path="/app/reports" element={<ReportsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

