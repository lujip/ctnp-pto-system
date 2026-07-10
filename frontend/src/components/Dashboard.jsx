import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import EmployeePage from '../pages/employee-page/EmployeePage';
import SupervisorPage from '../pages/supervisor-page/SupervisorPage';
import ManagerPage from '../pages/manager-page/ManagerPage';
import AdminPage from '../pages/admin-page/AdminPage';
import CooPage from '../pages/coo-page/CooPage';
import { getSidebarKey } from '../utils/userType';
import './Dashboard.css';

function Dashboard() {
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('/');

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserType(getSidebarKey(userData.user_type));
    }
    setLoading(false);
  }, []);

  const handleNavigation = (path) => {
    setCurrentPage(path);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (userType === 'admin') {
      return <AdminPage currentPage={currentPage} />;
    }
    if (userType === 'coo') {
      return <CooPage currentPage={currentPage} />;
    }
    if (userType === 'supervisor') {
      return <SupervisorPage currentPage={currentPage} />;
    }
    if (userType === 'manager') {
      return <ManagerPage currentPage={currentPage} />;
    }
    return <EmployeePage currentPage={currentPage} />;
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <Sidebar userType={userType} onNavigate={handleNavigation} currentPage={currentPage} />
        <div className="dashboard-content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
