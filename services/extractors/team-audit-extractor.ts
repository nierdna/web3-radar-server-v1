export class TeamAuditExtractor {
  static extractTeamInfo(document: Document) {
    const team = [] as any[]
    const teamSelectors = [
      '[class*="team"]', '[class*="member"]', '[class*="founder"]',
      '[class*="staff"]', '[class*="leadership"]', 'tr', 'div', 'li'
    ]
    
    teamSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(el => {
        const text = el.textContent || ''
        
        // Look for team member patterns
        if (text.length > 5 && text.length < 100 && 
            (text.includes('CEO') || text.includes('CTO') || text.includes('Founder') ||
             text.includes('Lead') || text.includes('Director') || text.includes('Manager'))) {
          
          const nameEl = el.querySelector('h3, h4, h5, .name, [class*="name"], strong, b')
          const roleEl = el.querySelector('.role, [class*="role"], [class*="position"], span, p')
          const linkedinEl = el.querySelector('a[href*="linkedin"]')
          
          const name = nameEl?.textContent?.trim() || text.split(' ')[0] || ''
          const role = roleEl?.textContent?.trim() || text.split(' ').slice(1).join(' ') || ''
          const linkedin = linkedinEl?.getAttribute('href') || ''
          
          if (name && name.length > 2) {
            team.push({
              name,
              role,
              linkedin,
              isAnonymous: name.toLowerCase().includes('anonymous') || name.toLowerCase().includes('tba')
            })
          }
        }
      })
    })

    return team
  }

  static extractAuditInfo(document: Document) {
    const audit = {
      auditor: '',
      reportLink: '',
      auditDate: ''
    }
    const auditElements = document.querySelectorAll('[class*="audit"], [class*="security"]')
    auditElements.forEach(el => {
      const text = el.textContent || ''
      if (text.toLowerCase().includes('audit')) {
        const auditorMatch = text.match(/([A-Za-z\s]+)\s*audit/i)
        if (auditorMatch) audit.auditor = auditorMatch[1].trim()
        
        const linkEl = el.querySelector('a[href]')
        if (linkEl) audit.reportLink = linkEl.getAttribute('href') || ''
        
        const dateMatch = text.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/)
        if (dateMatch) audit.auditDate = dateMatch[0]
      }
    })

    return audit
  }

  static extractRoadmap(document: Document) {
    const roadmap = [] as any[]
    const roadmapElements = document.querySelectorAll('[class*="roadmap"], [class*="milestone"], [class*="timeline"]')
    roadmapElements.forEach(el => {
      const milestoneEl = el.querySelector('h3, h4, .milestone, [class*="milestone"]')
      const dateEl = el.querySelector('.date, [class*="date"], [class*="time"]')
      const statusEl = el.querySelector('.status, [class*="status"]')
      
      if (milestoneEl) {
        const milestone = milestoneEl.textContent?.trim() || ''
        const expectedDate = dateEl?.textContent?.trim() || ''
        const status = statusEl?.textContent?.trim() || 'Pending'
        
        if (milestone) {
          roadmap.push({
            milestone,
            expectedDate,
            status
          })
        }
      }
    })

    return roadmap
  }
}