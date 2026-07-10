import { 
  HiOutlineHome,
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentList,
  HiOutlineCalendarDays,
  HiOutlineUser,
  HiOutlineCheckCircle,
  HiOutlineUsers,
  HiOutlineChartBar,
  HiOutlineCog6Tooth,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineDocumentDuplicate
} from 'react-icons/hi2';
import { getSidebarKey, normalizeUserType } from '../utils/userType';
import './Sidebar.css';
import logo from '../assets/ctnp_logo.png';

const USER_TYPE_LABELS = {
  EMPLOYEE: 'Employee',
  SUPERVISOR: 'Supervisor',
  MANAGER: 'Manager',
  ADMIN: 'Admin',
  COO: 'COO'
};

const Sidebar = ({ userType = 'employee', onNavigate, currentPage }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = user.full_name?.trim()
    || [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    || user.name
    || user.email
    || 'User';

  const userTypeLabel = USER_TYPE_LABELS[normalizeUserType(user.user_type)] || 'Employee';
  const userTypeClass = normalizeUserType(user.user_type).toLowerCase();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const handleNavClick = (e, path) => {
    e.preventDefault();
    onNavigate(path);
  };

  const menuItems = {
    employee: [
     // { icon: HiOutlineHome, label: 'Dashboard', path: '/' },
      { icon: HiOutlineDocumentText, label: 'Request PTO', path: '/request' },
      { icon: HiOutlineClipboardDocumentList, label: 'My Requests', path: '/my-requests' },
    //  { icon: HiOutlineUser, label: 'Profile', path: '/profile' },
    ],
    supervisor: [
    //  { icon: HiOutlineHome, label: 'Dashboard', path: '/' },
      { icon: HiOutlineCheckCircle, label: 'Approve Requests', path: '/approve' },
      { icon: HiOutlineUsers, label: 'Team Members', path: '/team' },
    //  { icon: HiOutlineChartBar, label: 'Reports', path: '/reports' },
     // { icon: HiOutlineUser, label: 'Profile', path: '/profile' },
      { icon: HiOutlineDocumentText, label: 'Request PTO', path: '/request' },
      { icon: HiOutlineClipboardDocumentList, label: 'My Requests', path: '/my-requests' },
    ],
    manager: [
      { icon: HiOutlineCheckCircle, label: 'Approve Requests', path: '/approve' },
      { icon: HiOutlineUsers, label: 'Department Team', path: '/department' },
      { icon: HiOutlineDocumentText, label: 'Request PTO', path: '/request' },
      { icon: HiOutlineClipboardDocumentList, label: 'My Requests', path: '/my-requests' },
    ],
    admin: [
    //  { icon: HiOutlineHome, label: 'Dashboard', path: '/' },
    { icon: HiOutlineCheckCircle, label: 'Approve Requests', path: '/admin-approve' },
      { icon: HiOutlineDocumentDuplicate, label: 'All Requests', path: '/requests' },
      { icon: HiOutlineUsers, label: 'Users', path: '/users' },
      { icon: HiOutlineDocumentText, label: 'Request PTO', path: '/request' },
      { icon: HiOutlineClipboardDocumentList, label: 'My Requests', path: '/my-requests' },
   //   { icon: HiOutlineChartBar, label: 'Reports', path: '/reports' },
    //  { icon: HiOutlineCog6Tooth, label: 'Settings', path: '/settings' },
   //   { icon: HiOutlineUser, label: 'Profile', path: '/profile' },
    ],
    coo: [
      { icon: HiOutlineCheckCircle, label: 'Approve Requests', path: '/coo-approve' },
      { icon: HiOutlineDocumentDuplicate, label: 'All Requests', path: '/requests' },
      { icon: HiOutlineUsers, label: 'Users', path: '/users' },
    ]
  };

  const sidebarKey = getSidebarKey(userType);
  const items = menuItems[sidebarKey] || menuItems.employee;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">
            <img src={logo} alt="PTO System" />
          </span>
          <span className="logo-text">PTO System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item, index) => {
          const IconComponent = item.icon;
          const isActive = currentPage === item.path;
          return (
            <a 
              key={index} 
              href={item.path} 
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, item.path)}
            >
              <span className="nav-icon">
                <IconComponent />
              </span>
              <span className="nav-label">{item.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="nav-icon">
            <HiOutlineUser />
          </span>
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <span className={`user-type ${userTypeClass}`}>{userTypeLabel}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="nav-item logout-btn">
          <span className="nav-icon">
            <HiOutlineArrowLeftOnRectangle />
          </span>
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
