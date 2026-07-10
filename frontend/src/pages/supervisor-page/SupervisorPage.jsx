import RequestPTO from '../../components/RequestPTO';
import MyRequest from '../../components/MyRequest';
import TeamMembers from '../../components/TeamMembers';
import SupervisorApproveRequest from '../../components/SupervisorApproveRequest';
import './SupervisorPage.css';

function SupervisorPage({ currentPage }) {
  const renderContent = () => {
    switch (currentPage) {
      case '/approve':
        return <SupervisorApproveRequest />;
      case '/team':
        return <TeamMembers />;
      case '/reports':
        return <div><h2>Reports</h2><p>Coming soon...</p></div>;
      case '/calendar':
        return <div><h2>Calendar</h2><p>Coming soon...</p></div>;
      case '/profile':
        return <div><h2>Profile</h2><p>Coming soon...</p></div>;
      case '/request':
        return <RequestPTO />;
      case '/my-requests':
        return <MyRequest />;
      default:
        return <SupervisorApproveRequest />;
    }
  };

  return (
    <div className="supervisor-page">
      {renderContent()}
    </div>
  );
}

export default SupervisorPage;
