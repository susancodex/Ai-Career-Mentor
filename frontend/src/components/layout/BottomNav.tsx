import { Link, useLocation } from "react-router-dom";

const navItems = [
  { path: "/dashboard", label: "Home", icon: "🏠" },
  { path: "/chat", label: "Chat", icon: "💬" },
  { path: "/careers", label: "Careers", icon: "🚀" },
  { path: "/jobs", label: "Jobs", icon: "💼" },
  { path: "/learning", label: "Learn", icon: "📚" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 1000,
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: isActive ? "#2563eb" : "#64748b",
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              minWidth: 60,
              minHeight: 60,
            }}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <span style={{ fontSize: 24, marginBottom: 2 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
