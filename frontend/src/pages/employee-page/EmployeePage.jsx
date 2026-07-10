import RequestPTO from '../../components/RequestPTO';
import MyRequest from '../../components/MyRequest';
import './EmployeePage.css';

function EmployeePage({ currentPage }) {
  const renderContent = () => {
    switch (currentPage) {
      case '/request':
        return <RequestPTO />;
      case '/my-requests':
        return <MyRequest />;
      case '/calendar':
        return <div><h2>Calendar</h2><p>Coming soon...</p></div>;
      case '/profile':
        return <div><h2>Profile</h2><p>Coming soon...</p></div>;
      default:
        return <RequestPTO />;
    }
  };

  return (
    <div className="employee-page">
      {renderContent()}
    </div>
  );
}

export default EmployeePage;
