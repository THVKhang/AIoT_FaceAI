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
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    fontWeight: "700",
    cursor: "pointer",
  },
};