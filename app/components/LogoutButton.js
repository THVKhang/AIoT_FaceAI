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
    background: "var(--vf-cta, #5B61F5)",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    padding: "10px 20px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.15s ease",
  },
};