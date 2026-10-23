import React, { useEffect, useState } from "react";
import { Navigate, Route, useLocation, useNavigate } from "react-router-dom";
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import {
  homeOutline,
  footballOutline,
  analyticsOutline,
  peopleOutline,
  settingsOutline,
} from "ionicons/icons";

import DashboardPage from "./pages/DashboardPage";
import LivePitchPage from "./pages/LivePitchPage";
import TacticalPage from "./pages/TacticalPage";
import PersonaPage from "./pages/PersonaPage";
import StudioControlPage from "./pages/StudioControlPage";
import { SidebarNav } from "./components/SidebarNav";
import { telemetryService } from "./services/telemetryService";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/* Ionic Dynamic Dark Mode Palette */
import "@ionic/react/css/palettes/dark.class.css";

/* Theme variables */
import "./theme/variables.css";

// Direct User Constraint: Strict iOS UI styling as default across the entire web app
setupIonicReact({
  mode: "ios",
});

const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const path = location.pathname.replace("/", "");
    if (path) setActiveTab(path);
  }, [location.pathname]);

  useEffect(() => {
    // Permanent Dark Mode initialization
    document.documentElement.classList.add("dark", "ion-palette-dark");
    document.body.classList.add("dark", "ion-palette-dark");
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    navigate(`/${tab}`);
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
      {/* Desktop/Tablet Left Navigation Rail (Matching Reference Design) */}
      <SidebarNav activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Main Workspace Area */}
      <div style={{ flex: 1, minWidth: 0, height: "100%", overflow: "hidden", position: "relative" }}>
        <IonTabs className="studio-tabs-root">
          <IonRouterOutlet>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pitch" element={<LivePitchPage />} />
            <Route path="/tactical" element={<TacticalPage />} />
            <Route path="/personas" element={<PersonaPage />} />
            <Route path="/diagnostics" element={<StudioControlPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </IonRouterOutlet>

          {/* Bottom iOS Tab Bar (visible on mobile screens) */}
          <IonTabBar slot="bottom" mode="ios" className="ion-hide-md-up">
            <IonTabButton tab="dashboard" href="/dashboard">
              <IonIcon aria-hidden="true" icon={homeOutline} />
              <IonLabel>Dashboard</IonLabel>
            </IonTabButton>

            <IonTabButton tab="pitch" href="/pitch">
              <IonIcon aria-hidden="true" icon={footballOutline} />
              <IonLabel>Pitch</IonLabel>
            </IonTabButton>

            <IonTabButton tab="tactical" href="/tactical">
              <IonIcon aria-hidden="true" icon={analyticsOutline} />
              <IonLabel>Tactical</IonLabel>
            </IonTabButton>

            <IonTabButton tab="personas" href="/personas">
              <IonIcon aria-hidden="true" icon={peopleOutline} />
              <IonLabel>Personas</IonLabel>
            </IonTabButton>

            <IonTabButton tab="diagnostics" href="/diagnostics">
              <IonIcon aria-hidden="true" icon={settingsOutline} />
              <IonLabel>Diagnostics</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Start real-time local server streaming into Single Base Memory
    telemetryService.start();

    return () => {
      telemetryService.stop();
    };
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
        <AppShell />
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
