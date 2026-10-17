import { getSearchIndex } from "lib/search-index"

export const dynamic = "force-static"

export const GET = () => Response.json(getSearchIndex())
