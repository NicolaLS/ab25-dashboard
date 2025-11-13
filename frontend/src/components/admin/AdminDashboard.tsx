import { useState } from "react";
import { useAdmin } from "../../context/AdminContext";
import { MerchantsPanel } from "./MerchantsPanel";
import { MilestonesPanel } from "./MilestonesPanel";
import { SystemInfoPanel } from "./SystemInfoPanel";
import "./AdminDashboard.css";

type Tab = "merchants" | "milestones" | "system";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("merchants");
  const { logout } = useAdmin();

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage merchants, milestones, and system configuration</p>
          </div>
          <div className="admin-header-actions">
            <a href="/" className="btn-secondary">
              View Dashboard
            </a>
            <button onClick={logout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="admin-tabs">
        <button
          className={activeTab === "merchants" ? "active" : ""}
          onClick={() => setActiveTab("merchants")}
        >
          Merchants
        </button>
        <button
          className={activeTab === "milestones" ? "active" : ""}
          onClick={() => setActiveTab("milestones")}
        >
          Milestones
        </button>
        <button
          className={activeTab === "system" ? "active" : ""}
          onClick={() => setActiveTab("system")}
        >
          System Info
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === "merchants" && <MerchantsPanel />}
        {activeTab === "milestones" && <MilestonesPanel />}
        {activeTab === "system" && <SystemInfoPanel />}
      </main>
    </div>
  );
}
