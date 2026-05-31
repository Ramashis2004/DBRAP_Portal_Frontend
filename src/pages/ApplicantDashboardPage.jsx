import { useNavigate } from "react-router-dom";
import { FilePlus2, FileText,Droplets } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { fetchApplicantApplicationCount } from "../api/api";

function ApplicantDashboardPage() {
  const navigate = useNavigate();
  const [applicationCount, setApplicationCount] = useState(null);

  const applicantSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("applicantSession") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!applicantSession?.id) return;

    const loadCount = async () => {
      try {
        const response = await fetchApplicantApplicationCount(applicantSession.id);
        //console.log("API response:", response.data); // check this in browser console
        setApplicationCount(Number(response.data?.total ?? 0));
      } catch (error) {
        console.error("Failed to fetch application count:", error);
        setApplicationCount(0);
      }
    };

    loadCount();
  }, [applicantSession]);

  if (!applicantSession?.id) return null;

  return (
    <>
      <section className="applicant-dashboard-stats">

  {/* Total Applications */}
  <article className="applicant-stat-card">
    <div className="applicant-stat-card__icon">
      <FileText size={20} />
    </div>

    <strong>
      {applicationCount === null ? "..." : applicationCount}
    </strong>

    <span>No. of Applications</span>
  </article>

  {/* Apply Water Connection */}
  <article
    className="applicant-stat-card applicant-stat-card--clickable"
    onClick={() => navigate("/applicant-organisation-registration")}
  >
    <div className="applicant-stat-card__icon applicant-stat-card__icon--blue">
      <Droplets size={20} />
    </div>

    <strong>Apply</strong>

    <span>Apply for Water Connection</span>
  </article>

</section>

      
    </>
  );
}

export default ApplicantDashboardPage;