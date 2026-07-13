import RequestPTO from '../../components/RequestPTO';
import MyRequest from '../../components/MyRequest';
import ManagerApproveRequest from '../../components/ManagerApproveRequest';
import DepartmentMembers from '../../components/DepartmentMembers';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';
import './ManagerPage.css';

function ManagerPage({ currentPage }) {
  const renderContent = () => {
    switch (currentPage) {
      case '/approve':
        return <ManagerApproveRequest />;
      case '/department':
        return <DepartmentMembers />;
      case '/reports':
        return <div><h2>Reports</h2><p>Coming soon...</p></div>;
      case '/calendar':
        return <AvailabilityCalendar />;
      case '/profile':
        return <div><h2>Profile</h2><p>Coming soon...</p></div>;
      case '/request':
        return <RequestPTO />;
      case '/my-requests':
        return <MyRequest />;
      default:
        return <ManagerApproveRequest/>;
    }
  };

  return (
    <div className="manager-page">
      {renderContent()}
    </div>
  );
}

export default ManagerPage;
