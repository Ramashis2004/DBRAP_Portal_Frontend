import {
  CEDashboardApplicationCountCard,
  CEDashboardApplicationsDrilldown,
} from "./CEDashboardApplications";
import {
  fetchEICDashboardApplicationSummary,
  fetchEICDashboardApplications,
  fetchEICDashboardBlocks,
  fetchEICDashboardCircles,
  fetchEICDashboardDivisions,
  fetchEICDashboardPanchayats, // ← NEW
  fetchEICOverdueApplicationHistory,
  fetchEICOverdueApplicationsByDivision,
  fetchEICOverdueByDivision,
  fetchEICOverdueSummary,
} from "../api/api";
import { CEDashboardOverduePieChart } from "./Cedashboardoverduepiechart";
import "./EICDashboardApplications.css";

const EIC_FETCHERS = {
  circles:      fetchEICDashboardCircles,
  divisions:    fetchEICDashboardDivisions,
  blocks:       fetchEICDashboardBlocks,
  panchayats:   fetchEICDashboardPanchayats, // ← NEW
  applications: fetchEICDashboardApplications,
};

export function EICDashboardApplicationCountCard(props) {
  return (
    <CEDashboardApplicationCountCard
      {...props}
      summaryFetcher={fetchEICDashboardApplicationSummary}
    />
  );
}

export function EICDashboardApplicationsDrilldown(props) {
  return (
    <CEDashboardApplicationsDrilldown
      {...props}
      titlePrefix="EIC"
      fetchers={EIC_FETCHERS}
    />
  );
}

export function EICDashboardOverduePieChart(props) {
  return (
    <CEDashboardOverduePieChart
      {...props}
      titlePrefix="EIC"
      fetchOverdueSummary={fetchEICOverdueSummary}
      fetchOverdueByDivision={fetchEICOverdueByDivision}
      fetchApplicationsByDivision={fetchEICOverdueApplicationsByDivision}
      fetchApplicationHistory={fetchEICOverdueApplicationHistory}
    />
  );
}

