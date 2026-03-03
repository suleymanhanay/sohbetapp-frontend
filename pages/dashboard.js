import { useEffect, useState } from "react";
import api from "../utils/api";

export default function Dashboard() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    api.get("/user/wallet").then(res => setBalance(res.data.balance));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Balance: {balance}</p>
    </div>
  );
}