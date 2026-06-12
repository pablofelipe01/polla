import { getMatches } from "./actions/public"
import MatchListClient from "./MatchListClient"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const matches = await getMatches()
  return <MatchListClient matches={matches} />
}
