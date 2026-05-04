"use client";

export default function LogoutButton() {
  async function handleLogout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
      });

      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Không thể đăng xuất");
    }
  }

  return (
    <button onClick={handleLogout} style={styles.button}>
      Logout
    </button>
  );
}

const styles = {
  button: {
    background: "#e8834a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "10px 18px",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.15s ease",
    boxShadow: "0 4px 12px rgba(232, 131, 74, 0.25)",
  },
};