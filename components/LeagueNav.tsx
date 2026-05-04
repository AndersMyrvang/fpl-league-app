"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LeagueNav({ leagueId }: { leagueId: string }) {
  const pathname = usePathname();

  const links = [
    { href: `/league/${leagueId}`,            label: "Standings" },
    { href: `/league/${leagueId}/results`,    label: "Results"   },
    { href: `/league/${leagueId}/statistikk`, label: "Stats"     },
  ];

  return (
    <nav className="nav">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`nav-link${pathname === href ? " active" : ""}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
