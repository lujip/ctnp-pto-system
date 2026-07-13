import Users from '../../components/Users';
import AdminApproveRequest from '../../components/AdminApproveRequest';
import AdminAllRequest from '../../components/AdminAllRequest';
import RequestPTO from '../../components/RequestPTO';
import MyRequest from '../../components/MyRequest';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';
import './AdminPage.css';

function AdminPage({ currentPage }) {
  const renderContent = () => {
    switch (currentPage) {
      case '/admin-approve':
        return <AdminApproveRequest />;
      case '/requests':
        return <AdminAllRequest />;
      case '/users':
        return <Users />;
      case '/request':
        return <RequestPTO />;
      case '/my-requests':
        return <MyRequest />;
      case '/calendar':
        return <AvailabilityCalendar />;
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
    <div className="admin-page">
      {renderContent()}
    </div>
  );
}

export default AdminPage;
