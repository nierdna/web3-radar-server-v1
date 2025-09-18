// Xử lý template với variables và conditional rendering
export class TemplateEngine {
  static render(template: string, data: any): string {
    let result = template
    
    // Handle conditional blocks: {{#key}}...{{/key}}
    result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      if (data[key]) {
        return content
      }
      return ''
    })
    
    // Handle simple variables: {{key}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || ''
    })
    
    return result
  }
}