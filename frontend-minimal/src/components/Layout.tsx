import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-inner">
          <div className="nav-left">
            <Link to="/" className="logo">FORUM</Link>
            <Link to="/" className="nav-link">Feed</Link>
          </div>
          <div className="nav-right">
            {user && (
              <Link to={`/profile/${user.id}`} className="nav-link">
                {user.nickname || user.first_name}
              </Link>
            )}
            <Link to="/settings" className="nav-link">Settings</Link>
            <button onClick={handleLogout} className="btn-outline">Logout</button>
          </div>
        </div>
      </nav>
      <main className="main">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
