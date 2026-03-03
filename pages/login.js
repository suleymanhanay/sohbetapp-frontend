import { useState } from "react";
import api from "../utils/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    window.location.href = "/dashboard";
  };

  return (
    <div>
      <h1>Login</h1>
      <input onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" />
      <button onClick={login}>Login</button>
    </div>
  );
}