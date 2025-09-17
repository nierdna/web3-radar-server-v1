import { CRYPTORANK_TEAM_URL } from '../../lib/config/url'
import { axiosClient } from '../../lib/config/axios'

export interface TeamMember {
  name: string
  role: string
  linkedin?: string
  anonymous: boolean 
  projectId?: string 
}

export class TeamExtractor {
  static async extractByKey(coinKey: string): Promise<TeamMember[]> {
    try {
      const endpoint = `${CRYPTORANK_TEAM_URL}/${coinKey}`
      const res = await axiosClient.get(endpoint)
      const payload = res.data
      const list = Array.isArray(payload?.data) ? payload.data : []
      return list.map((p: any) => {
        const name = p?.name || ''
        const jobs: string[] = Array.isArray(p?.jobs) ? p.jobs : []
        const links: any[] = Array.isArray(p?.links) ? p.links : []
        const li = links.find((l: any) => (l?.type || '').toLowerCase() === 'linkedin')
        const linkedin: string = (li && typeof li.value === 'string') ? li.value : ''
        return { name, role: (jobs || []).filter(Boolean).join(', ') || 'Team Member', linkedin: linkedin || undefined, anonymous: false }
      }).filter((m: TeamMember) => m.name)
    } catch { return [] }
  }
}
