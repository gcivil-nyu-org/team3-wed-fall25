import { useProfile } from "../hooks/useProfile";

export default function Home() {
  const { users } = useProfile();

  return <div>Home</div>;
}
