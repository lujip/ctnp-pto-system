import RequestPTO from '../../components/RequestPTO';
import MyRequest from '../../components/MyRequest';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';
import './EmployeePage.css';

function EmployeePage({ currentPage }) {
  const renderContent = () => {
    switch (currentPage) {
      case '/request':
        return <RequestPTO />;
      case '/my-requests':
        return <MyRequest />;
      case '/calendar':
        return <AvailabilityCalendar />;
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
