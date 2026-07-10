import Users from '../../components/Users';
import CooApproveRequest from '../../components/CooApproveRequest';
import AdminAllRequest from '../../components/AdminAllRequest';
import './CooPage.css';

function CooPage({ currentPage }) {
  const renderContent = () => {
    switch (currentPage) {
      case '/coo-approve':
        return <CooApproveRequest />;
      case '/requests':
        return <AdminAllRequest />;
      case '/users':
        return <Users />;
      case '/reports':
        return <div><h2>Reports</h2><p>Coming soon...</p></div>;
      case '/settings':
        return <div><h2>Settings</h2><p>Coming soon...</p></div>;
      case '/profile':
        return <div><h2>Profile</h2><p>Coming soon...</p></div>;
      default:
        return <AdminAllRequest />;
    }
  };

  return (
    <div className="coo-page">
      {renderContent()}
    </div>
  );
}

export default CooPage;
