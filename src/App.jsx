import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import OfficerDashboardPage from "./pages/OfficerDashboardPage";
import SEDashboardPage from "./pages/SEDashboardPage";
import JEDashboardPage from "./pages/JEDashboardPage";
import JEApplicationReceivedPage from "./pages/JEApplicationReceivedPage";
import ApplicationReceivedPage from "./pages/ApplicationReceivedPage";
import OfficerLoginPage from "./pages/OfficerLoginPage";
import ApplicantLoginPage from "./pages/ApplicantLoginPage";
import ApplicantLayout from "./pages/ApplicantLayout";                              // NEW
import ApplicantDashboardPage from "./pages/ApplicantDashboardPage";
import ApplicantOrganisationRegistrationPage from "./pages/ApplicantOrganisationRegistrationPage";
import RegisterForm from "./components/RegisterForm";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import CEApplicationReceivedPage from "./pages/CEApplicationReceivedPage";
import EICApplicationReceivedPage from "./pages/EICApplicationReceivedPage";
import "./App.css";
import PendingApplicationsPage from "./pages/PendingApplicationsPage";
import PaymentVerificationPage from "./pages/PaymentVerificationPage";
import JEUpdateConnectionPage from "./pages/JEUpdateConnectionPage";
import ApplicantPaymentPage from "./pages/ApplicantPaymentPage";
import SLAConfigPage from "./pages/SLAConfigPage";
// In your <Routes>:

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<OfficerLoginPage />} />
        <Route path="/applicant-login" element={<ApplicantLoginPage />} />

        {/* Applicant layout wraps both dashboard and registration */}
        <Route element={<ApplicantLayout />}>
          <Route path="/applicant-dashboard" element={<ApplicantDashboardPage />} />
          <Route path="/applicant-organisation-registration" element={<ApplicantOrganisationRegistrationPage />} />
         <Route path="/applicant-payment" element={<ApplicantPaymentPage />} />
        </Route>


        <Route path="/dashboard" element={<OfficerDashboardPage />} />
        <Route path="/se-dashboard" element={<SEDashboardPage />} />
        <Route path="/se-application-received" element={<ApplicationReceivedPage />} />
        <Route path="/applicationreceived" element={<ApplicationReceivedPage />} />
        <Route path="/je-dashboard" element={<JEDashboardPage />} />
        <Route path="/je-application-received" element={<JEApplicationReceivedPage />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/ce-application-received" element={<CEApplicationReceivedPage />} />
        <Route path="/eic-application-received" element={<EICApplicationReceivedPage />} />
        {/* <Route path="/se-payment-details" element={<SEPaymentDetailsPage />} /> */}
        {/* <Route path="/je-payment-details" element={<JEPaymentDetailsPage />} /> */}

        <Route path="/se-pending-forward-to-je"
  element={<PendingApplicationsPage mode="forward-to-je" />} />
<Route path="/se-pending-approval"
  element={<PendingApplicationsPage mode="pending-approval" />} />
  <Route path="/je-payment-verification" element={<PaymentVerificationPage />} />
<Route path="/je-update-connection" element={<JEUpdateConnectionPage />} />

        <Route path="/sla-config" element={<SLAConfigPage />} />
        <Route path="/slaconfig" element={<SLAConfigPage />} />

      </Routes>
      
    </Router>
  );
}

export default App;