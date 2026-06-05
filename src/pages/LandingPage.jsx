
import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Droplet, 
  ArrowRight, 
  UserPlus, 
  LogIn, 
  Search, 
  ShieldCheck, 
  BarChart3, 
  Bell, 
  FileCheck, 
  Clock, 
  CreditCard, 
  CheckCircle2, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import { fetchPublicDashboardSummary } from '../api/api';
import './LandingPage.css';
import LandingUserManualCard  from "../components/LandingUserManualCard";

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
    className="feature-card glass"
  >
    <div className="feature-icon">
      <Icon size={28} />
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
  </motion.div>
);

const ProcessStep = ({ number, title, description, isEven, delay }) => (
  <motion.div 
    initial={{ opacity: 0, x: isEven ? 50 : -50 }}
    whileInView={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.8, delay }}
    viewport={{ once: true }}
    className="process-step"
  >
    <div className={`step-content glass ${isEven ? 'right' : 'left'}`}>
      <h3 className="text-accent-blue font-bold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
    <div className="step-number glass bg-accent-blue text-white">
      {number}
    </div>
    <div className="step-content empty hidden md:block"></div>
  </motion.div>
);

const formatDashboardValue = (value) => value ?? 0;

const PublicDashboardTable = ({ title, columns, rows }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.45 }}
    className="public-dashboard-card glass"
  >
    <h3>{title}</h3>
    <div className="public-dashboard-table-wrap">
      <table className="public-dashboard-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="public-dashboard-empty">No data available</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id || index}>
                {columns.map((column) => (
                  <td key={column.key}>{formatDashboardValue(row[column.key])}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </motion.div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [publicDashboard, setPublicDashboard] = useState({
    applications: [],
    inspections: null,
    inspectionReports: null,
  });
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetchPublicDashboardSummary()
      .then((response) => {
        if (!isMounted) return;
        setPublicDashboard({
          applications: Array.isArray(response.data?.applications) ? response.data.applications : [],
          inspections: response.data?.inspections || null,
          inspectionReports: response.data?.inspectionReports || null,
        });
      })
      .catch((error) => {
        if (isMounted) setDashboardError("Unable to load public dashboard data.");
      })
      .finally(() => {
        if (isMounted) setIsDashboardLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const applicationColumns = [
    { key: "sl_no", label: "Sl.No" },
    { key: "service_name", label: "Name of the Service" },
    { key: "district_name", label: "District" },
    { key: "applications_received", label: "No. of applications received" },
    { key: "applications_processed_approved", label: "No. of applications processed / approved" },
    { key: "applications_pending", label: "No. of applications pending" },
    { key: "ortpsa_timeline", label: "ORTPSA timeline in (Days)" },
    { key: "applications_approved_within_timeline", label: "No. of applications approved within timeline / 9 days" },
    { key: "avg_time_taken", label: "Avg. time taken  in (Days)" },
    { key: "min_time_taken", label: "Min. time taken in (Days)" },
    { key: "max_time_taken", label: "Max. time taken in (Days)" },
  ];

  const inspectionColumns = [
    { key: "inspections_to_be_conducted", label: "Total no. of Application Received" },
    { key: "inspections_conducted_within_timeline", label: "Total number of inspections conducted within timeline" },
    { key: "inspections_conducted_beyond_timeline", label: "Total number of inspections conducted beyond timeline" },
    { key: "pending_inspections", label: "Total number of pending inspections" },
    { key: "enterprises_exempted_self_certification", label: "Number of enterprises exempted based on self-certification" },
    { key: "enterprises_exempted_third_party_certification", label: "Number of enterprises exempted based on third-party certification" },
  ];

  const inspectionReportColumns = [
    { key: "inspections_conducted", label: "Total number of inspections conducted" },
    { key: "reports_uploaded_within_24_hours", label: "Total number of inspections' report uploaded within 24 hours" },
    { key: "reports_uploaded_beyond_24_hours", label: "Total number of inspections' report uploaded beyond 24 hours" },
  ];

  return (
    <div className="landing-container">
      {/* Background Ripple & Waves Effect */}
      <div className="water-flow">
        <svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
          <path fill="#ffffff" fillOpacity="0.2" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* Navigation Header */}
      <nav className="landing-nav glass">
        <div className="landing-nav__brand">
  <img
    src="/Odisha-Gov.svg"
    alt="Government of Odisha"
    className="landing-nav__gov-logo"
  />

  <div className="landing-nav__title-group">
    <h3 className="landing-nav__title">
      Panchayati Raj & Drinking Water Department
    </h3>
    <p className="landing-nav__subtitle">
      Government of Odisha
    </p>
  </div>
</div>
        <div className="landing-nav__links">
          <a href="#services" className="hover:text-accent-blue">Services</a>
          <a href="#process" className="hover:text-accent-blue">Process</a>
          <a href="#transparency" className="hover:text-accent-blue">Transparency</a>
          <a href="#support" className="hover:text-accent-blue">Support</a>
        </div>
        <div className="landing-nav__actions">
          <div
            className="signin-menu"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsSignInOpen(false);
              }
            }}
          >
            <button
              type="button"
              onClick={() => setIsSignInOpen((current) => !current)}
              className="btn btn-secondary signin-menu__button !px-6 !py-2 !text-sm"
              aria-haspopup="menu"
              aria-expanded={isSignInOpen}
            >
              <LogIn size={16} /> Sign In <ChevronDown size={16} />
            </button>

            <AnimatePresence>
              {isSignInOpen && (
                <motion.div
                  className="signin-menu__dropdown"
                  role="menu"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => navigate("/login")}
                  >
                    <LogIn size={16} />
                    Officer Login
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => navigate("/applicant-login")}
                  >
                    <UserPlus size={16} />
                    Applicant Login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <motion.div 
          style={{ y: backgroundY }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="hero-content"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/40 border border-white/50 text-sm font-bold text-accent-blue"
          >
            <ShieldCheck size={14} className="text-accent-gold" />
            GOVERNMENT OF ODISHA OFFICIAL PORTAL
          </motion.div>
          <h1 className="drop-shadow-2xl">JAL CONNECT</h1>
          <h3  className="drop-shadow-2xl">Digital Water Connection Management System</h3>
          <p className="drop-shadow-md text-accent-blue/90 font-medium">Transparent, Efficient & Time-Bound Rural Water Supply Connection.<br/> Empowering through digital governance.</p>
          
          <div className="hero-buttons">
            <button onClick={() => navigate("/register")} className="btn btn-primary">
              <UserPlus size={20} /> Apply for New Commercial Water Connection
            </button>
            <button className="btn btn-secondary">
              <Search size={20} /> Track Application
            </button>
          </div>
        </motion.div>
      </section>

      {/* Feature Section */}
      <section id="services" className="features-section">
        <div className="section-header">
          <h2>Core System Capabilities</h2>
          <p>Leveraging technology for seamless service delivery</p>
        </div>
        <div className="features-grid">
          <FeatureCard 
            icon={ExternalLink} 
            title="Online Submission" 
            description="Paperless application submission from the comfort of your home." 
            delay={0.1}
          />
          <FeatureCard 
            icon={Clock} 
            title="Real-Time Tracking" 
            description="Monitor every stage of your application with live status updates." 
            delay={0.2}
          />
          <FeatureCard 
            icon={UserPlus} 
            title="Role-Based Workflow" 
            description="Seamless coordination between JE, SE, EE and administrative offices." 
            delay={0.3}
          />
          <FeatureCard 
            icon={BarChart3} 
            title="SLA Monitoring" 
            description="Automated alerts for time-bound processing ensuring accountability." 
            delay={0.4}
          />
          <FeatureCard 
            icon={FileCheck} 
            title="Digital Approvals" 
            description="E-signed certificates available for instant download upon approval." 
            delay={0.5}
          />
          <FeatureCard 
            icon={Bell} 
            title="System Alerts" 
            description="Instant SMS and Email notifications at every process milestone." 
            delay={0.6}
          />
        </div>
      </section>

      {/* Process Flow Section */}
      <section id="process" className="process-section">
        <div className="section-header">
          <h2>Simplified Process Journey</h2>
          <p>How it works: From application to execution</p>
        </div>
        <div className="process-timeline">
          <ProcessStep number={1} title="Citizen Registration" description="Register using your mobile number and Aadhar details." isEven={false} delay={0.1} />
          <ProcessStep number={2} title="Application Submission" description="Fill connection details and upload required documents." isEven={true} delay={0.2} />
          <ProcessStep number={3} title="SE/EE Assignment" description="Automatic assignment to the respective jurisdictional officer." isEven={false} delay={0.3} />
          <ProcessStep number={4} title="JE Site Inspection" description="Junior Engineer visits the site for feasibility assessment." isEven={true} delay={0.4} />
          <ProcessStep number={5} title="Report Approval" description="Review and approval of the feasibility report by higher authorities." isEven={false} delay={0.5} />
          <ProcessStep number={6} title="Online Payment" description="Secure payment of connection charges via integrated gateway." isEven={true} delay={0.6} />
          <ProcessStep number={7} title="Connection Execution" description="Physical execution of water supply connection at site." isEven={false} delay={0.7} />
          <ProcessStep number={8} title="Completion Certificate" description="Issuance of final certificate and bill generation setup." isEven={true} delay={0.8} />
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Operational Intelligence</h2>
          <p>Public dashboard for online applications and inspection transparency</p>
        </div>

        {isDashboardLoading ? (
          <div className="public-dashboard-state glass">Loading public dashboard data...</div>
        ) : dashboardError ? (
          <div className="public-dashboard-state glass is-error">{dashboardError}</div>
        ) : (
          <div className="public-dashboard-stack">
            <PublicDashboardTable
              title="Public Dashboard for Online Applications with District Level Data"
              columns={applicationColumns}
              rows={publicDashboard.applications}
            />
            <PublicDashboardTable
              title="Public Dashboard for Inspections Data"
              columns={inspectionColumns}
              rows={[publicDashboard.inspections || {}]}
            />
            <PublicDashboardTable
              title="Public Dashboard for Online Inspections Reports"
              columns={inspectionReportColumns}
              rows={[publicDashboard.inspectionReports || {}]}
            />
          </div>
        )}
      </section>

      {/* Transparency Section */}
      <section id="transparency" className="pb-20 px-[5%]">
        <div className="section-header">
          <h2>Transparency & Governance</h2>
          <p>Our commitment to honest and open public service</p>
        </div>
        <div className="transparency-grid">
          <motion.div whileHover={{ y: -5 }} className="transparency-card glass">
            <h4 className="flex items-center gap-2 text-accent-blue font-bold mb-3"><Droplet size={18} /> Full Audit Trail</h4>
            <p className="text-sm text-gray-600">Every action taken by any officer is logged with timestamps for complete accountability.</p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="transparency-card glass">
            <h4 className="flex items-center gap-2 text-accent-blue font-bold mb-3"><Bell size={18} /> Automated Escalation</h4>
            <p className="text-sm text-gray-600">Applications pending beyond SLA are automatically escalated to higher authorities.</p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="transparency-card glass">
            <h4 className="flex items-center gap-2 text-accent-blue font-bold mb-3"><CheckCircle2 size={18} /> Digital Integrity</h4>
            <p className="text-sm text-gray-600">Tamper-proof digital certificates ensures the highest level of trust and security.</p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="transparency-card glass">
            <h4 className="flex items-center gap-2 text-accent-blue font-bold mb-3"><BarChart3 size={18} /> Dashboard Visibility</h4>
            <p className="text-sm text-gray-600">Public dashboard shows real-time system performance and pendency statistics.</p>
          </motion.div>
        </div>
      </section>

      {/* Public Info Section */}
      <section id="support" className="process-section">
        <div className="section-header">
          <h2>Information & Support</h2>
          <p>Helpful resources for citizens and stakeholders</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* {['User Manual '].map((item, i) => (
            <motion.a 
              key={i}
              whileHover={{ scale: 1.02 }}
              className=" p-6 text-center flex flex-col items-center gap-3 cursor-pointer border-b-2 border-accent-gold"
            >
              <div className="w-12 h-12 rounded-full border border-accent-blue/20 flex items-center justify-center text-accent-blue">
                <Info size={24} />
              </div>
              <span className="font-bold text-accent-blue">{item}</span>
              <span className="text-xs text-gray-500">Click to view/download PDF</span>
            </motion.a>
          ))} */}
          <LandingUserManualCard />
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-accent-blue">
                <Droplet fill="#1a3c5a" size={28} />
              </div>
              <span className="text-2xl font-black tracking-tighter">DBRAP PORTAL</span>
            </div>
            <p className="text-sm opacity-70 leading-relaxed max-w-xs">
              Official Water Connection Management System, Government of Odisha. 
              Dedicated to providing clean water and digital transparency.
            </p>
            <div className="footer-socials">
              {/* Social icons would go here */}
            </div>
          </div>
          
          <div className="footer-link-group">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#">Apply Online</a></li>
              <li><a href="#">Track Status</a></li>
              <li><a href="#">Public Dashboard</a></li>
              <li><a href="#">Official Notices</a></li>
            </ul>
          </div>
          
          <div className="footer-link-group">
            <h4>Citizen Services</h4>
            <ul>
              <li><a href="#">Change of Title</a></li>
              <li><a href="#">Disconnection</a></li>
              <li><a href="#">Address Update</a></li>
              <li><a href="#">Bill Payment</a></li>
            </ul>
          </div>
          
          <div className="footer-link-group">
            <h4>Contact Helpdesk</h4>
            <ul>
              <li className="flex items-center gap-2 opacity-80"><Phone size={14} /> 1800-345-XXXX</li>
              <li className="flex items-center gap-2 opacity-80"><Mail size={14} /> support-water@odisha.gov.in</li>
              <li className="flex items-center gap-2 opacity-80"><MapPin size={14} /> Odisha Secretariat, Bhubaneswar</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2026 DBRAP Portal – Water Supply Department. All Rights Reserved. Designed & Maintained by NIC Odisha.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
